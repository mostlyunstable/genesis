from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Set
from collections import defaultdict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import settings
from backend.app.models.event import SecurityEventModel
from backend.app.models.detection import DetectionModel
from backend.app.models.settings import SettingsModel


class SlidingWindowItem:
    def __init__(self, event_id: str, timestamp: datetime, username: str, outcome: str):
        self.event_id = event_id
        self.timestamp = timestamp
        self.username = username
        self.outcome = outcome


class DetectionEngine:
    def __init__(self):
        # In-memory sliding windows: ip -> list of SlidingWindowItem
        self._ip_windows: Dict[str, List[SlidingWindowItem]] = defaultdict(list)
        # In-memory sliding windows: username -> list of (event_id, timestamp, ip)
        self._user_windows: Dict[str, List[tuple[str, datetime, str]]] = defaultdict(list)

    def reset(self):
        """Reset in-memory sliding windows (for test isolation)."""
        self._ip_windows.clear()
        self._user_windows.clear()

    def _purge_stale(self, now: datetime, window_seconds: int):
        cutoff = now - timedelta(seconds=window_seconds)
        for ip in list(self._ip_windows.keys()):
            self._ip_windows[ip] = [item for item in self._ip_windows[ip] if item.timestamp >= cutoff]
            if not self._ip_windows[ip]:
                del self._ip_windows[ip]

        for user in list(self._user_windows.keys()):
            self._user_windows[user] = [item for item in self._user_windows[user] if item[1] >= cutoff]
            if not self._user_windows[user]:
                del self._user_windows[user]

    async def get_thresholds(self, db: AsyncSession) -> Dict[str, int]:
        res = await db.execute(select(SettingsModel).where(SettingsModel.id == 1))
        row = res.scalar_one_or_none()
        if row:
            return {
                "ssh_failed_threshold": row.ssh_failed_attempt_threshold,
                "ssh_window": row.ssh_window_seconds,
                "spray_user_threshold": row.password_spray_unique_users_threshold,
                "spray_window": row.password_spray_window_seconds,
                "distrib_threshold_ips": row.distributed_threshold_ips
            }
        return {
            "ssh_failed_threshold": settings.SSH_FAILED_ATTEMPT_THRESHOLD,
            "ssh_window": settings.SSH_WINDOW_SECONDS,
            "spray_user_threshold": settings.PASSWORD_SPRAY_UNIQUE_USERS_THRESHOLD,
            "spray_window": settings.PASSWORD_SPRAY_WINDOW_SECONDS,
            "distrib_threshold_ips": settings.DISTRIBUTED_THRESHOLD_IPS
        }

    async def process_event(self, event: SecurityEventModel, db: AsyncSession) -> List[DetectionModel]:
        """
        Process a single normalized SecurityEvent through deterministic detection heuristics.
        Returns any newly created or updated DetectionModel records.
        """
        thresholds = await self.get_thresholds(db)
        ts = event.timestamp
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)

        # Purge stale events from memory windows
        max_window = max(thresholds["ssh_window"], thresholds["spray_window"])
        self._purge_stale(ts, max_window)

        # Record event in window
        self._ip_windows[event.source_ip].append(
            SlidingWindowItem(event.id, ts, event.username, event.outcome)
        )
        if event.outcome == "failure":
            self._user_windows[event.username].append((event.id, ts, event.source_ip))

        ip_history = self._ip_windows[event.source_ip]
        created_or_updated: List[DetectionModel] = []

        # -------------------------------------------------------------
        # HEURISTIC 1: Suspicious Successful Login after Failures (CRITICAL)
        # -------------------------------------------------------------
        if event.outcome == "success":
            ssh_cutoff = ts - timedelta(seconds=thresholds["ssh_window"])
            prior_fails = [
                item for item in ip_history
                if item.outcome == "failure" and item.timestamp >= ssh_cutoff and item.timestamp < ts
            ]
            if len(prior_fails) >= 3:
                det = await self._record_detection(
                    db=db,
                    detection_id=f"DET-SUCCESS-BREACH-{event.id}",
                    name=f"Suspicious Successful Authentication After {len(prior_fails)} Failures",
                    category="suspicious_auth",
                    description=f"Successful login for user '{event.username}' from IP {event.source_ip} preceded by {len(prior_fails)} failed attempts in window.",
                    severity="critical",
                    source_ip=event.source_ip,
                    target_accounts=list(set([f.username for f in prior_fails] + [event.username])),
                    event_count=len(prior_fails) + 1,
                    timestamp=ts,
                    confidence=95.0,
                    risk_score=94.0,
                    triggering_conditions=[
                        f"Prior failures ({len(prior_fails)}) >= 3 in {thresholds['ssh_window']}s window",
                        f"Accepted authentication for user '{event.username}'"
                    ],
                    supporting_event_ids=[f.event_id for f in prior_fails] + [event.id],
                    rule_id="RULE-AUTH-SUCCESS-AFTER-FAIL",
                    rule_name="Compromised Credential Breach Detection",
                    suggested_playbook_id="PB-SSH-BRUTE-01"
                )
                if det:
                    created_or_updated.append(det)

        # -------------------------------------------------------------
        # HEURISTIC 2: High-Velocity SSH Brute Force
        # -------------------------------------------------------------
        if event.source == "linux_ssh" and event.outcome == "failure":
            ssh_cutoff = ts - timedelta(seconds=thresholds["ssh_window"])
            recent_fails = [
                item for item in ip_history
                if item.outcome == "failure" and item.timestamp >= ssh_cutoff
            ]
            if len(recent_fails) >= thresholds["ssh_failed_threshold"]:
                det = await self._record_detection(
                    db=db,
                    detection_id=f"DET-SSH-BF-{event.source_ip.replace('.', '-')}",
                    name="High-Velocity SSH Brute-Force Sequence",
                    category="ssh_brute_force",
                    description=f"{len(recent_fails)} failed SSH logons originating from {event.source_ip} within {thresholds['ssh_window']}s window.",
                    severity="critical" if len(recent_fails) >= 20 else "warning",
                    source_ip=event.source_ip,
                    target_accounts=list(set([f.username for f in recent_fails])),
                    event_count=len(recent_fails),
                    timestamp=ts,
                    confidence=min(100.0, 70.0 + len(recent_fails) * 1.5),
                    risk_score=min(100.0, 60.0 + len(recent_fails) * 1.2),
                    triggering_conditions=[
                        f"Failed SSH attempts ({len(recent_fails)}) >= threshold ({thresholds['ssh_failed_threshold']})",
                        f"Time window: {thresholds['ssh_window']}s"
                    ],
                    supporting_event_ids=[f.event_id for f in recent_fails[-15:]],
                    rule_id="RULE-SSH-BRUTE-001",
                    rule_name="SSH Velocity Threshold",
                    suggested_playbook_id="PB-SSH-BRUTE-01"
                )
                if det:
                    created_or_updated.append(det)

        # -------------------------------------------------------------
        # HEURISTIC 3: Horizontal Password Spraying
        # -------------------------------------------------------------
        spray_cutoff = ts - timedelta(seconds=thresholds["spray_window"])
        recent_ip_events = [item for item in ip_history if item.timestamp >= spray_cutoff]
        unique_users_targeted = set(item.username for item in recent_ip_events if item.username != "unknown")

        if len(unique_users_targeted) >= thresholds["spray_user_threshold"]:
            det = await self._record_detection(
                db=db,
                detection_id=f"DET-SPRAY-{event.source_ip.replace('.', '-')}",
                name="Distributed Password Spraying Campaign",
                category="password_spraying",
                description=f"Source IP {event.source_ip} probed {len(unique_users_targeted)} unique usernames within {thresholds['spray_window']}s window.",
                severity="critical" if len(unique_users_targeted) >= 15 else "warning",
                source_ip=event.source_ip,
                target_accounts=list(unique_users_targeted),
                event_count=len(recent_ip_events),
                timestamp=ts,
                confidence=min(100.0, 65.0 + len(unique_users_targeted) * 2.0),
                risk_score=min(100.0, 50.0 + len(unique_users_targeted) * 2.0),
                triggering_conditions=[
                    f"Unique usernames probed ({len(unique_users_targeted)}) >= threshold ({thresholds['spray_user_threshold']})",
                    f"Observation window: {thresholds['spray_window']}s"
                ],
                supporting_event_ids=[item.event_id for item in recent_ip_events[-20:]],
                rule_id="RULE-SPRAY-002",
                rule_name="Horizontal Credential Spray Detection",
                suggested_playbook_id="PB-SPRAY-DEFENSE-02"
            )
            if det:
                created_or_updated.append(det)

        # -------------------------------------------------------------
        # HEURISTIC 4: Distributed Multi-IP Brute Force on Single Account
        # -------------------------------------------------------------
        if event.outcome == "failure" and event.username not in ["unknown", "root", "admin"]:
            user_history = self._user_windows[event.username]
            user_cutoff = ts - timedelta(seconds=thresholds["ssh_window"])
            recent_user_fails = [item for item in user_history if item[1] >= user_cutoff]
            distinct_ips = set(item[2] for item in recent_user_fails)

            if len(distinct_ips) >= thresholds["distrib_threshold_ips"]:
                det = await self._record_detection(
                    db=db,
                    detection_id=f"DET-DISTRIB-{event.username}",
                    name=f"Distributed Multi-Source Brute Force on '{event.username}'",
                    category="distributed_brute_force",
                    description=f"{len(distinct_ips)} distinct IPs coordinated failed authentications against account '{event.username}'.",
                    severity="warning",
                    source_ip=event.source_ip,
                    target_accounts=[event.username],
                    event_count=len(recent_user_fails),
                    timestamp=ts,
                    confidence=85.0,
                    risk_score=75.0,
                    triggering_conditions=[
                        f"Distinct source IPs ({len(distinct_ips)}) >= threshold ({thresholds['distrib_threshold_ips']})",
                        f"Target user: '{event.username}'"
                    ],
                    supporting_event_ids=[item[0] for item in recent_user_fails[-15:]],
                    rule_id="RULE-DISTRIB-BRUTE-003",
                    rule_name="Coordinated Multi-IP Target Probing",
                    suggested_playbook_id="PB-SPRAY-DEFENSE-02"
                )
                if det:
                    created_or_updated.append(det)

        # Trigger automatic incident correlation if any detections were found
        if created_or_updated:
            from backend.app.services.correlation import correlation_engine
            for det in created_or_updated:
                await correlation_engine.correlate_detection(det, db)

        return created_or_updated

    async def _record_detection(
        self,
        db: AsyncSession,
        detection_id: str,
        name: str,
        category: str,
        description: str,
        severity: str,
        source_ip: str,
        target_accounts: List[str],
        event_count: int,
        timestamp: datetime,
        confidence: float,
        risk_score: float,
        triggering_conditions: List[str],
        supporting_event_ids: List[str],
        rule_id: str,
        rule_name: str,
        suggested_playbook_id: Optional[str]
    ) -> DetectionModel:
        # Check if active detection already exists
        res = await db.execute(
            select(DetectionModel).where(
                DetectionModel.id == detection_id,
                DetectionModel.status.in_(["open", "investigating"])
            )
        )
        existing = res.scalar_one_or_none()

        if existing:
            # Update existing detection with updated counts & latest events
            existing.event_count = event_count
            existing.timestamp = timestamp
            existing.confidence = max(existing.confidence, confidence)
            existing.risk_score = max(existing.risk_score, risk_score)
            existing.target_accounts = list(set(existing.target_accounts + target_accounts))
            existing.supporting_event_ids = list(set(existing.supporting_event_ids + supporting_event_ids))
            existing.triggering_conditions = triggering_conditions
            await db.flush()
            return existing
        else:
            new_det = DetectionModel(
                id=detection_id,
                name=name,
                category=category,
                description=description,
                severity=severity,
                source_ip=source_ip,
                target_accounts=target_accounts,
                event_count=event_count,
                timestamp=timestamp,
                confidence=confidence,
                risk_score=risk_score,
                status="open",
                triggering_conditions=triggering_conditions,
                supporting_event_ids=supporting_event_ids,
                rule_id=rule_id,
                rule_name=rule_name,
                suggested_playbook_id=suggested_playbook_id,
                is_simulated=True
            )
            db.add(new_det)
            await db.flush()
            return new_det


detection_engine = DetectionEngine()
