import pytest
from httpx import AsyncClient
from backend.app.core.config import settings
from backend.app.models.user import User
from backend.app.core.security import get_password_hash


@pytest.fixture
async def auth_headers(client: AsyncClient, db_session):
    user = User(
        id="USR-INC-01",
        username="lead_analyst@sentinel.ai",
        full_name="Lead Analyst",
        hashed_password=get_password_hash("test_pwd_2026!"),
        role="analyst",
        is_active=True
    )
    db_session.add(user)
    await db_session.commit()

    login = await client.post("/api/v1/auth/login", json={
        "username": "lead_analyst@sentinel.ai",
        "password": "test_pwd_2026!"
    })
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_incident_creation_and_update(client: AsyncClient, auth_headers: dict):
    # Ingest 12 failed attempts from 198.51.100.99
    logs = [
        {
            "timestamp": f"2026-10-31T10:15:{i:02d}Z",
            "raw": f"Oct 31 10:15:{i:02d} bastion-01 sshd[{12400+i}]: Failed password for invalid user root from 198.51.100.99 port {41200+i} ssh2"
        }
        for i in range(12)
    ]

    await client.post(
        "/api/v1/ingest/batch",
        json={"source": "linux_ssh", "logs": logs},
        headers={"X-Sentinel-Forwarder-Key": settings.FORWARDER_API_KEY}
    )

    # List incidents
    inc_res = await client.get("/api/v1/incidents")
    assert inc_res.status_code == 200
    incidents = inc_res.json()
    assert incidents["total"] >= 1

    inc = incidents["items"][0]
    assert "198.51.100.99" in inc["sourceIps"]
    assert inc["status"] == "active"
    assert len(inc["detectionIds"]) >= 1
    assert len(inc["mitreAttack"]) >= 1
    assert inc["mitreAttack"][0]["techniqueId"] == "T1110.001"
    assert "executiveSummary" in inc["aiSummary"]

    # Update incident status to contained
    patch_res = await client.patch(
        f"/api/v1/incidents/{inc['id']}/status",
        json={"status": "contained"},
        headers=auth_headers
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "contained"
