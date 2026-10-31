from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
import hashlib
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.detection import DetectionModel
from backend.app.models.incident import IncidentModel

# MITRE Technique mappings
MITRE_MAPPING = {
    "ssh_brute_force": {
        "tactic": "Credential Access",
        "techniqueId": "T1110.001",
        "techniqueName": "Password Guessing",
        "referenceUrl": "https://attack.mitre.org/techniques/T1110/001/"
    },
    "password_spraying": {
        "tactic": "Credential Access",
        "techniqueId": "T1110.003",
        "techniqueName": "Password Spraying",
        "referenceUrl": "https://attack.mitre.org/techniques/T1110/003/"
    },
    "distributed_brute_force": {
        "tactic": "Credential Access",
        "techniqueId": "T1110",
        "techniqueName": "Brute Force",
        "referenceUrl": "https://attack.mitre.org/techniques/T1110/"
    },
    "suspicious_auth": {
        "tactic": "Initial Access & Privilege Escalation",
        "techniqueId": "T1078.003",
        "techniqueName": "Valid Accounts: Local Accounts",
        "referenceUrl": "https://attack.mitre.org/techniques/T1078/003/"
    }
}


class CorrelationEngine:
    @staticmethod
    def calculate_risk(
        category: str,
        event_count: int,
        target_accounts: List[str],
        has_successful_breach: bool
    ) -> tuple[int, int]:
        """
        Deterministic Risk and Confidence calculation.
        Returns: (risk_score, confidence_score) in 0-100.
        """
        base_risk = {
            "suspicious_auth": 88,
            "ssh_brute_force": 70,
            "password_spraying": 65,
            "distributed_brute_force": 60
        }.get(category, 50)

        # Privilege penalty
        privileged_accounts = {"root", "admin", "administrator", "deploy", "devops", "ansible"}
        has_privileged = any(acc.lower() in privileged_accounts for acc in target_accounts)
        privilege_penalty = 12 if has_privileged else 0

        # Success breach penalty
        breach_penalty = 15 if has_successful_breach else 0

        # Volume factor
        volume_penalty = min(10, event_count // 5)

        total_risk = min(100, base_risk + privilege_penalty + breach_penalty + volume_penalty)

        # Confidence: higher with more events and distinct conditions
        confidence = min(100, 75 + min(25, event_count // 2))

        return int(total_risk), int(confidence)

    async def correlate_detection(self, detection: DetectionModel, db: AsyncSession) -> IncidentModel:
        """
        Correlates a detection into an existing incident or creates a new incident.
        """
        ts = detection.timestamp
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)

        # Check for open/investigating incident containing this source IP
        res = await db.execute(select(IncidentModel).where(IncidentModel.status.in_(["active", "investigating"])))
        active_incidents = res.scalars().all()

        matching_incident: Optional[IncidentModel] = None
        for inc in active_incidents:
            if detection.source_ip in (inc.source_ips or []):
                matching_incident = inc
                break

        mitre_item = MITRE_MAPPING.get(detection.category, MITRE_MAPPING["ssh_brute_force"])
        has_breach = detection.category == "suspicious_auth"

        if matching_incident:
            # Append detection & event IDs
            det_ids = list(set(matching_incident.detection_ids + [detection.id]))
            evt_ids = list(set(matching_incident.event_ids + detection.supporting_event_ids))
            accs = list(set(matching_incident.target_accounts + detection.target_accounts))

            if has_breach:
                matching_incident.severity = "critical"
                matching_incident.title = f"SSH Brute-Force Intrusion & Breach on Bastion-01 ({detection.source_ip})"

            risk, conf = self.calculate_risk(
                detection.category,
                len(evt_ids),
                accs,
                has_breach or "breach" in matching_incident.title.lower()
            )

            matching_incident.detection_ids = det_ids
            matching_incident.event_ids = evt_ids
            matching_incident.target_accounts = accs
            matching_incident.event_count = len(evt_ids)
            matching_incident.risk_score = max(matching_incident.risk_score, risk)
            matching_incident.confidence_score = max(matching_incident.confidence_score, conf)
            matching_incident.updated_at = ts

            # Link detection to incident
            detection.associated_incident_id = matching_incident.id
            await db.flush()
            return matching_incident

        else:
            # Create new incident
            inc_id = f"INC-2026-{hashlib.md5(f'{detection.id}{ts.isoformat()}'.encode()).hexdigest()[:4].upper()}"
            detection.associated_incident_id = inc_id

            risk, conf = self.calculate_risk(
                detection.category,
                detection.event_count,
                detection.target_accounts,
                has_breach
            )

            title = (
                f"SSH Brute-Force Intrusion & Breach on Bastion-01 ({detection.source_ip})"
                if has_breach else
                f"{detection.name} from {detection.source_ip}"
            )

            ai_summary = {
                "executiveSummary": f"Attacker at {detection.source_ip} triggered detection rule '{detection.rule_name}'. System observed {detection.event_count} telemetry records.",
                "evidenceChain": [
                    f"First observed failed handshake from {detection.source_ip}",
                    f"Targeting accounts: {', '.join(detection.target_accounts[:4])}",
                    f"Trigger condition: {detection.triggering_conditions[0] if detection.triggering_conditions else 'Threshold exceeded'}"
                ],
                "rootCauseAnalysis": f"Automated credential probing against exposed authentication interfaces.",
                "recommendedActions": [
                    f"Isolate external source IP {detection.source_ip} via edge firewall rule",
                    f"Audit authentication privileges for targeted users"
                ],
                "confidenceExplanation": f"High mathematical confidence ({conf}%) based on {detection.event_count} deterministic telemetry events in sliding window."
            }

            timeline_events = [
                {
                    "id": f"TL-{detection.id[:8]}-1",
                    "timestamp": ts.isoformat(),
                    "stage": "detection",
                    "title": detection.name,
                    "description": detection.description,
                    "severity": detection.severity,
                    "evidenceId": detection.supporting_event_ids[0] if detection.supporting_event_ids else None,
                    "type": "detection"
                }
            ]

            new_incident = IncidentModel(
                id=inc_id,
                title=title,
                category="Authentication Compromise" if has_breach else "Credential Probing",
                severity=detection.severity,
                status="active",
                risk_score=risk,
                confidence_score=conf,
                source_ips=[detection.source_ip],
                target_accounts=detection.target_accounts,
                event_count=detection.event_count,
                created_at=ts,
                updated_at=ts,
                detection_ids=[detection.id],
                event_ids=detection.supporting_event_ids,
                detection_explanation=detection.description,
                mitre_attack=[mitre_item],
                ai_summary=ai_summary,
                timeline_events=timeline_events,
                assigned_playbook_id=detection.suggested_playbook_id or "PB-SSH-BRUTE-01",
                is_simulated=True
            )
            db.add(new_incident)
            await db.flush()
            return new_incident


correlation_engine = CorrelationEngine()
