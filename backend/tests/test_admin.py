import pytest
from httpx import AsyncClient
from backend.app.models.user import User
from backend.app.models.settings import SettingsModel
from backend.app.models.source import LogSourceModel
from backend.app.models.threat_intel import ThreatIntelModel
from backend.app.core.security import get_password_hash
from datetime import datetime, timezone


@pytest.fixture
async def setup_admin_and_data(client: AsyncClient, db_session):
    user = User(
        id="USR-ADM-01",
        username="admin_secops@sentinel.ai",
        full_name="Admin SecOps",
        hashed_password=get_password_hash("admin_secret_2026!"),
        role="admin",
        is_active=True
    )
    st = SettingsModel(id=1, ssh_failed_attempt_threshold=10)
    src = LogSourceModel(
        id="SRC-TEST-01",
        name="Test Collector",
        type="linux_ssh",
        status="active",
        last_event_received=datetime.now(timezone.utc),
        events_processed_24h=1000,
        error_count_24h=0,
        host="test.internal",
        port=514,
        agent_version="1.0",
        format="syslog",
        description="test"
    )
    ti = ThreatIntelModel(
        ip="198.51.100.42",
        threat_classification="Brute Force Bot",
        reputation_score=90,
        associated_incidents=[],
        first_seen=datetime.now(timezone.utc),
        last_seen=datetime.now(timezone.utc),
        confidence=95,
        country="SA",
        country_code="SA",
        asn="AS64512",
        mitre_techniques=["T1110"],
        tags=["SSH"],
        simulated_data_source="Test Feed"
    )
    db_session.add_all([user, st, src, ti])
    await db_session.commit()

    login = await client.post("/api/v1/auth/login", json={
        "username": "admin_secops@sentinel.ai",
        "password": "admin_secret_2026!"
    })
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_sources_and_threat_intel(client: AsyncClient, setup_admin_and_data: dict):
    # Sources
    sources_res = await client.get("/api/v1/sources")
    assert sources_res.status_code == 200
    assert len(sources_res.json()) >= 1

    # Threat Intel
    ti_res = await client.get("/api/v1/threat-intel/198.51.100.42")
    assert ti_res.status_code == 200
    assert ti_res.json()["ip"] == "198.51.100.42"
    assert ti_res.json()["reputationScore"] == 90


@pytest.mark.asyncio
async def test_settings_thresholds_update(client: AsyncClient, setup_admin_and_data: dict):
    # Get thresholds
    get_res = await client.get("/api/v1/settings/thresholds")
    assert get_res.status_code == 200
    assert get_res.json()["sshFailedAttemptThreshold"] == 10

    # Update thresholds
    put_res = await client.put(
        "/api/v1/settings/thresholds",
        json={"sshFailedAttemptThreshold": 15, "sshWindowSeconds": 90},
        headers=setup_admin_and_data
    )
    assert put_res.status_code == 200
    assert put_res.json()["sshFailedAttemptThreshold"] == 15
    assert put_res.json()["sshWindowSeconds"] == 90
