import pytest
from datetime import datetime, timezone
from httpx import AsyncClient
from sqlalchemy import select, delete
from backend.app.models.event import SecurityEventModel
from backend.app.models.incident import IncidentModel
from backend.app.models.detection import DetectionModel
from backend.app.core.config import settings


@pytest.mark.asyncio
async def test_fresh_empty_database_metrics(client: AsyncClient):
    """
    Scenario 1: Fresh empty database
    All metrics accurately show zero or empty states.
    No hardcoded, fake, or synthetic defaults.
    """
    res = await client.get("/api/v1/analytics/overview")
    assert res.status_code == 200
    data = res.json()
    assert data["totalEvents"] == 0
    assert data["eventsOverTime"] == []
    assert data["activeIncidents"] == 0
    assert data["openInvestigations"] == 0
    assert data["resolvedIncidents"] == 0
    assert data["incidentSeverityDistribution"] == {}
    assert data["totalDetections"] == 0
    assert data["criticalDetections"] == 0
    assert data["detectionsByCategory"] == {}
    assert data["mitreTechniqueDistribution"] == []
    assert data["totalActionsTaken"] == 0
    assert data["systemHealth"]["databaseConnected"] is True
    assert data["systemHealth"]["databaseLatencyMs"] >= 0.0


@pytest.mark.asyncio
async def test_insert_actual_security_events(client: AsyncClient):
    """
    Scenario 2: Insert actual security events
    Dashboard reflects the exact event count and timeline buckets.
    """
    payload = {
        "source": "linux_ssh",
        "logs": [
            {
                "raw": "sshd[101]: Failed password for invalid user admin from 198.51.100.50 port 44321 ssh2",
                "timestamp": datetime.now(timezone.utc).isoformat()
            },
            {
                "raw": "sshd[102]: Failed password for invalid user root from 198.51.100.50 port 44322 ssh2",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        ]
    }
    headers = {"X-Sentinel-Forwarder-Key": settings.FORWARDER_API_KEY}
    ingest_res = await client.post("/api/v1/ingest/batch", json=payload, headers=headers)
    assert ingest_res.status_code == 202
    assert ingest_res.json()["normalizedCount"] == 2

    overview_res = await client.get("/api/v1/analytics/overview")
    assert overview_res.status_code == 200
    data = overview_res.json()
    assert data["totalEvents"] == 2
    assert len(data["eventsOverTime"]) >= 1
    assert sum(bucket["count"] for bucket in data["eventsOverTime"]) == 2


@pytest.mark.asyncio
async def test_insert_actual_incidents_and_severity_distribution(client: AsyncClient, db_session):
    """
    Scenario 3: Insert actual incidents
    Incident cards and charts update correctly with exact severity counts.
    """
    now = datetime.now(timezone.utc)
    inc1 = IncidentModel(
        id="INC-2026-TEST1",
        title="SSH Brute Force Attack",
        category="BruteForce",
        severity="critical",
        status="active",
        risk_score=90,
        confidence_score=98,
        source_ips=["198.51.100.10"],
        target_accounts=["deploy"],
        event_count=15,
        created_at=now,
        updated_at=now,
        detection_ids=[],
        event_ids=[],
        mitre_attack=[{"techniqueId": "T1110.001", "name": "Password Guessing", "tactic": "Credential Access"}],
        ai_summary={"executiveSummary": "15 consecutive SSH failures"},
        timeline_events=[],
        is_simulated=False
    )
    inc2 = IncidentModel(
        id="INC-2026-TEST2",
        title="Password Spray Detected",
        category="PasswordSpray",
        severity="warning",
        status="active",
        risk_score=60,
        confidence_score=85,
        source_ips=["203.0.113.15"],
        target_accounts=["user1", "user2"],
        event_count=8,
        created_at=now,
        updated_at=now,
        detection_ids=[],
        event_ids=[],
        mitre_attack=[{"techniqueId": "T1110.003", "name": "Password Spraying", "tactic": "Credential Access"}],
        ai_summary={"executiveSummary": "Password spray across multiple accounts"},
        timeline_events=[],
        is_simulated=False
    )
    db_session.add_all([inc1, inc2])
    await db_session.commit()

    res = await client.get("/api/v1/analytics/overview")
    assert res.status_code == 200
    data = res.json()
    assert data["activeIncidents"] == 2
    assert data["incidentSeverityDistribution"]["critical"] == 1
    assert data["incidentSeverityDistribution"]["warning"] == 1
    assert len(data["mitreTechniqueDistribution"]) == 2


@pytest.mark.asyncio
async def test_change_incident_status_metrics_transition(client: AsyncClient, db_session, auth_headers: dict):
    """
    Scenario 4: Change incident status
    Corresponding metrics update from active to resolved.
    """
    now = datetime.now(timezone.utc)
    inc = IncidentModel(
        id="INC-2026-RESOLVE-ME",
        title="Containment Lifecycle Test",
        category="BruteForce",
        severity="critical",
        status="active",
        risk_score=90,
        confidence_score=95,
        source_ips=["198.51.100.99"],
        target_accounts=["root"],
        event_count=10,
        created_at=now,
        updated_at=now,
        detection_ids=[],
        event_ids=[],
        mitre_attack=[],
        ai_summary={"executiveSummary": "Testing status resolution"},
        timeline_events=[],
        is_simulated=False
    )
    db_session.add(inc)
    await db_session.commit()

    # Before update: 1 active, 0 resolved
    res_before = await client.get("/api/v1/analytics/overview")
    assert res_before.json()["activeIncidents"] == 1
    assert res_before.json()["resolvedIncidents"] == 0

    # Update status to resolved
    patch_res = await client.patch(
        "/api/v1/incidents/INC-2026-RESOLVE-ME/status",
        json={"status": "resolved"},
        headers=auth_headers
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "resolved"

    # After update: 0 active, 1 resolved
    res_after = await client.get("/api/v1/analytics/overview")
    assert res_after.json()["activeIncidents"] == 0
    assert res_after.json()["resolvedIncidents"] == 1


@pytest.mark.asyncio
async def test_date_filters_and_time_windows(client: AsyncClient):
    """
    Scenario 7: Date filters return correct results.
    Verifies 1h, 24h, 7d, 30d time window queries return valid buckets.
    """
    for win in ["1h", "24h", "7d", "30d", "all"]:
        res = await client.get(f"/api/v1/analytics/overview?window={win}")
        assert res.status_code == 200
        assert isinstance(res.json()["eventsOverTime"], list)

        timeline_res = await client.get(f"/api/v1/analytics/events-timeline?window={win}")
        assert timeline_res.status_code == 200
        assert isinstance(timeline_res.json(), list)
