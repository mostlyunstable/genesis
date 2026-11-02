import pytest
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.models.event import SecurityEventModel
from backend.app.models.detection import DetectionModel
from backend.app.models.incident import IncidentModel
from backend.app.services.anomaly import statistical_anomaly_engine, OnlineStatistics, StatisticalAnomalyEngine
from backend.app.services.detection import detection_engine


def test_welford_online_statistics():
    """Verifies Welford's algorithm online mean and variance calculations."""
    stats = OnlineStatistics()
    values = [10.0, 10.0, 10.0, 10.0, 10.0]
    for v in values:
        stats.update(v)

    assert stats.count == 5
    assert stats.mean == 10.0
    assert stats.variance == 0.0

    # Test Z-score computation
    stats2 = OnlineStatistics()
    for v in [9.0, 9.2, 8.8, 9.1, 8.9]:  # Mean ~9.0, StdDev ~0.15
        stats2.update(v)

    assert abs(stats2.mean - 9.0) < 0.1
    # Test an event at hour 3.0 (6 hours away from mean 9.0, with min_std=1.0 -> Z >= 5.0)
    z = stats2.z_score(3.0, min_std=1.0)
    assert z >= 5.0


def test_shannon_entropy_calculation():
    """Verifies Shannon entropy calculation on natural vs synthetic usernames."""
    calc = StatisticalAnomalyEngine.calculate_shannon_entropy

    # Low entropy natural words
    ent_admin = calc("admin")
    ent_john = calc("johnsmith")
    assert ent_admin < 2.5
    assert ent_john < 3.2

    # High entropy programmatic/random string
    ent_random = calc("x89q2m1pz7wk")
    assert ent_random >= 3.4


@pytest.mark.asyncio
async def test_logon_hour_zscore_anomaly_detection(db_session: AsyncSession):
    """
    Verifies that a user with habitual 9 AM logins who authenticates at 3 AM
    triggers a 3-sigma statistical anomaly detection.
    """
    statistical_anomaly_engine.reset()

    # Train baseline: 5 authentications at 9:00 AM UTC
    for i in range(5):
        ts_normal = datetime(2026, 10, 20 + i, 9, 0, 0, tzinfo=timezone.utc)
        evt_normal = SecurityEventModel(
            id=f"EVT-NORM-{i}",
            timestamp=ts_normal,
            source="linux_ssh",
            event_type="SSH_AUTH_SUCCESS",
            username="analyst_alice",
            source_ip="10.0.1.50",
            destination_ip="10.240.10.15",
            destination_port=22,
            outcome="success",
            severity="info",
            raw_event=f"Accepted password for analyst_alice from 10.0.1.50 port 22",
            parsed_fields={},
            fingerprint=f"fp_norm_{i}",
            is_simulated=True
        )
        db_session.add(evt_normal)
        det = await statistical_anomaly_engine.evaluate_event(evt_normal, db_session)
        assert det is None  # Baseline establishing, no anomaly

    await db_session.commit()

    # Anomalous Event: Authentication at 3:00 AM UTC (6 hours deviation from 9:00 AM mean)
    ts_anomaly = datetime(2026, 10, 26, 3, 0, 0, tzinfo=timezone.utc)
    evt_anomaly = SecurityEventModel(
        id="EVT-ANOM-001",
        timestamp=ts_anomaly,
        source="linux_ssh",
        event_type="SSH_AUTH_SUCCESS",
        username="analyst_alice",
        source_ip="10.0.1.50",
        destination_ip="10.240.10.15",
        destination_port=22,
        outcome="success",
        severity="info",
        raw_event="Accepted password for analyst_alice from 10.0.1.50 port 22",
        parsed_fields={},
        fingerprint="fp_anom_001",
        is_simulated=True
    )
    db_session.add(evt_anomaly)
    det_anomaly = await statistical_anomaly_engine.evaluate_event(evt_anomaly, db_session)

    assert det_anomaly is not None
    assert det_anomaly.category == "statistical_anomaly"
    assert "Logon time anomaly" in det_anomaly.description
    assert "Z-score=" in det_anomaly.description
    assert det_anomaly.confidence >= 85.0


@pytest.mark.asyncio
async def test_synthetic_username_entropy_anomaly(db_session: AsyncSession):
    """Verifies that high-entropy synthetic usernames trigger behavioral detections."""
    statistical_anomaly_engine.reset()
    ts = datetime.now(timezone.utc)
    evt = SecurityEventModel(
        id="EVT-ENTROPY-001",
        timestamp=ts,
        source="linux_ssh",
        event_type="SSH_AUTH_FAIL",
        username="x89q2m1pz7w",
        source_ip="198.51.100.42",
        destination_ip="10.240.10.15",
        destination_port=22,
        outcome="failure",
        severity="warning",
        raw_event="Failed password for invalid user x89q2m1pz7w from 198.51.100.42 port 22",
        parsed_fields={},
        fingerprint="fp_entropy_001",
        is_simulated=True
    )
    db_session.add(evt)
    det = await statistical_anomaly_engine.evaluate_event(evt, db_session)

    assert det is not None
    assert det.category == "statistical_anomaly"
    assert "Synthetic identity anomaly" in det.description
    assert "Shannon entropy" in det.description


@pytest.mark.asyncio
async def test_detection_engine_end_to_end_anomaly_integration(db_session: AsyncSession):
    """
    Verifies that passing events through detection_engine.process_event
    activates both rule heuristics and statistical anomaly detection,
    and correlates findings into IncidentModel.
    """
    detection_engine.reset()
    ts = datetime.now(timezone.utc)

    # Event with synthetic high-entropy user
    evt = SecurityEventModel(
        id="EVT-INTEG-001",
        timestamp=ts,
        source="linux_ssh",
        event_type="SSH_AUTH_FAIL",
        username="q8w7e6r5t4y3",
        source_ip="198.51.100.60",
        destination_ip="10.240.10.15",
        destination_port=22,
        outcome="failure",
        severity="warning",
        raw_event="Failed password for invalid user q8w7e6r5t4y3 from 198.51.100.60 port 22",
        parsed_fields={},
        fingerprint="fp_integ_001",
        is_simulated=True
    )
    db_session.add(evt)

    dets = await detection_engine.process_event(evt, db_session)
    assert any(d.category == "statistical_anomaly" for d in dets)

    # Verify incident was correlated
    res_inc = await db_session.execute(
        select(IncidentModel).where(IncidentModel.source_ips.contains(["198.51.100.60"]))
    )
    inc = res_inc.scalar_one_or_none()
    assert inc is not None
    assert any(m.get("techniqueId") == "T1078" for m in (inc.mitre_attack or []))
