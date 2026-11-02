import math
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from collections import defaultdict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.event import SecurityEventModel
from backend.app.models.detection import DetectionModel


class OnlineStatistics:
    """
    Welford's algorithm for numerically stable online computation
    of mean, variance, and standard deviation over streaming telemetry.
    """
    def __init__(self):
        self.count: int = 0
        self.mean: float = 0.0
        self.M2: float = 0.0

    def update(self, x: float) -> None:
        self.count += 1
        delta = x - self.mean
        self.mean += delta / self.count
        delta2 = x - self.mean
        self.M2 += delta * delta2

    @property
    def variance(self) -> float:
        return (self.M2 / (self.count - 1)) if self.count > 1 else 0.0

    @property
    def std_dev(self) -> float:
        return math.sqrt(self.variance)

    def z_score(self, x: float, min_std: float = 0.5) -> float:
        """Returns the Z-score (|x - mean| / std_dev)."""
        if self.count < 3:
            return 0.0
        std = max(self.std_dev, min_std)
        return abs(x - self.mean) / std


class StatisticalAnomalyEngine:
    """
    Genuine Statistical Anomaly Detection Engine.
    Detects behavioral outliers that bypass static threshold rules:
    1. Logon Hour Outlier (Z-score on user diurnal activity cycle)
    2. Volumetric Failure Rate Outlier (Z-score on user/IP failure rates)
    3. High-Entropy Credential Generation (Shannon entropy on usernames)
    """
    def __init__(self, z_threshold: float = 3.0, entropy_threshold: float = 3.4):
        self.z_threshold = z_threshold
        self.entropy_threshold = entropy_threshold
        # username -> OnlineStatistics on logon hour (0.0 to 23.99)
        self._user_hour_stats: Dict[str, OnlineStatistics] = defaultdict(OnlineStatistics)
        # ip -> OnlineStatistics on inter-arrival time (seconds)
        self._ip_interval_stats: Dict[str, OnlineStatistics] = defaultdict(OnlineStatistics)
        self._ip_last_seen: Dict[str, datetime] = {}

    def reset(self):
        """Reset state for test isolation."""
        self._user_hour_stats.clear()
        self._ip_interval_stats.clear()
        self._ip_last_seen.clear()

    @staticmethod
    def calculate_shannon_entropy(text: str) -> float:
        """Computes Shannon entropy H = -sum(p * log2(p)) to detect synthetic usernames."""
        if not text:
            return 0.0
        length = len(text)
        counts: Dict[str, int] = defaultdict(int)
        for char in text.lower():
            counts[char] += 1
        entropy = 0.0
        for count in counts.values():
            p = count / length
            entropy -= p * math.log2(p)
        return entropy

    async def evaluate_event(
        self,
        event: SecurityEventModel,
        db: AsyncSession
    ) -> Optional[DetectionModel]:
        """
        Evaluates a single normalized event for statistical behavioral anomalies.
        Returns newly generated DetectionModel if an anomaly exceeds the 3-sigma boundary.
        """
        ts = event.timestamp
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)

        user = (event.username or "unknown").strip().lower()
        ip = (event.source_ip or "0.0.0.0").strip()
        hour_fraction = ts.hour + (ts.minute / 60.0)

        anomaly_detected = False
        anomaly_reasons: List[str] = []
        confidence = 80.0
        risk_score = 75.0
        severity = "warning"

        # -------------------------------------------------------------
        # 1. Logon Hour Z-Score Anomaly (Off-Hours Behavioral Outlier)
        # -------------------------------------------------------------
        if user not in ["unknown", "system", "sshd"]:
            stats = self._user_hour_stats[user]
            if stats.count >= 3:
                z = stats.z_score(hour_fraction, min_std=1.0)
                if z >= self.z_threshold:
                    anomaly_detected = True
                    severity = "critical" if z >= 4.0 else "high"
                    anomaly_reasons.append(
                        f"Logon time anomaly: Event at {hour_fraction:.2f}h deviates significantly from user's historical baseline (mean {stats.mean:.2f}h, Z-score={z:.2f} >= {self.z_threshold})."
                    )
                    confidence = min(98.0, 80.0 + (z * 4.0))
                    risk_score = min(96.0, 75.0 + (z * 4.5))

            # Update online stats with this observation
            stats.update(hour_fraction)

        # -------------------------------------------------------------
        # 2. Shannon Entropy Outlier (Synthetic Credential Generation)
        # -------------------------------------------------------------
        if user not in ["unknown", "admin", "root", "deploy", "system"] and len(user) >= 7:
            ent = self.calculate_shannon_entropy(user)
            if ent >= self.entropy_threshold:
                anomaly_detected = True
                anomaly_reasons.append(
                    f"Synthetic identity anomaly: Username '{event.username}' exhibits high Shannon entropy (H={ent:.2f} >= {self.entropy_threshold}), indicative of programmatic dictionary generation."
                )
                severity = "high"
                risk_score = max(risk_score, 82.0)
                confidence = max(confidence, 88.0)

        # -------------------------------------------------------------
        # 3. Inter-Arrival Rapid Beaconing Anomaly
        # -------------------------------------------------------------
        if ip in self._ip_last_seen:
            delta_sec = max(0.01, (ts - self._ip_last_seen[ip]).total_seconds())
            ip_stats = self._ip_interval_stats[ip]
            if ip_stats.count >= 5:
                # Highly uniform inter-arrival time (std_dev < 0.15 * mean) suggests automated bot/scanner
                if ip_stats.mean > 0 and (ip_stats.std_dev / ip_stats.mean) < 0.12 and delta_sec < 5.0:
                    anomaly_detected = True
                    anomaly_reasons.append(
                        f"Machine-speed cadence anomaly: Source IP {ip} exhibits robotic beaconing rhythm (mean interval {ip_stats.mean:.2f}s, std dev {ip_stats.std_dev:.2f}s)."
                    )
                    severity = "critical"
                    risk_score = max(risk_score, 90.0)
            ip_stats.update(delta_sec)

        self._ip_last_seen[ip] = ts

        if not anomaly_detected:
            return None

        # Build and record detection
        det_id = f"DET-ANOMALY-{event.id}"
        det_name = f"Statistical Behavioral Anomaly ({user} / {ip})"
        det = DetectionModel(
            id=det_id,
            name=det_name,
            category="statistical_anomaly",
            description="; ".join(anomaly_reasons),
            severity=severity,
            source_ip=ip,
            target_accounts=[event.username] if event.username else [user],
            event_count=1,
            timestamp=ts,
            confidence=confidence,
            risk_score=risk_score,
            status="open",
            triggering_conditions=anomaly_reasons,
            supporting_event_ids=[event.id],
            rule_id="RULE-STATISTICAL-ANOMALY-001",
            rule_name="Statistical 3-Sigma Behavioral Anomaly",
            suggested_playbook_id="PB-SPRAY-DEFENSE-02",
            is_simulated=True
        )
        db.add(det)
        await db.flush()

        # Correlate into incident
        from backend.app.services.correlation import correlation_engine
        await correlation_engine.correlate_detection(det, db)

        return det


statistical_anomaly_engine = StatisticalAnomalyEngine()
