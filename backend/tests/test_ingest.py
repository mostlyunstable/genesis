import pytest
from httpx import AsyncClient
from backend.app.core.config import settings


@pytest.mark.asyncio
async def test_batch_ingest_linux_ssh(client: AsyncClient):
    logs = [
        {
            "timestamp": "2026-10-31T10:15:00Z",
            "raw": "Oct 31 10:15:00 bastion-01 sshd[12401]: Failed password for invalid user root from 198.51.100.42 port 41201 ssh2",
            "metadata": {"host": "bastion-01"}
        },
        {
            "timestamp": "2026-10-31T10:15:02Z",
            "raw": "Oct 31 10:15:02 bastion-01 sshd[12402]: Failed password for invalid user admin from 198.51.100.42 port 41202 ssh2",
            "metadata": {"host": "bastion-01"}
        },
        {
            "timestamp": "2026-10-31T10:15:05Z",
            "raw": "Oct 31 10:15:05 bastion-01 sshd[12403]: Accepted password for deploy from 198.51.100.42 port 41203 ssh2",
            "metadata": {"host": "bastion-01"}
        }
    ]

    response = await client.post(
        "/api/v1/ingest/batch",
        json={"source": "linux_ssh", "logs": logs},
        headers={"X-Sentinel-Forwarder-Key": settings.FORWARDER_API_KEY}
    )
    assert response.status_code == 202
    data = response.json()
    assert data["status"] == "ACCEPTED"
    assert data["receivedCount"] == 3
    assert data["normalizedCount"] == 3
    assert data["duplicateCount"] == 0

    # Query events back
    events_res = await client.get("/api/v1/events?source=linux_ssh")
    assert events_res.status_code == 200
    evts = events_res.json()
    assert evts["total"] == 3

    # Check accepted log fields
    success_evt = next(e for e in evts["items"] if e["outcome"] == "success")
    assert success_evt["username"] == "deploy"
    assert success_evt["sourceIp"] == "198.51.100.42"
    assert success_evt["eventType"] == "SSH_AUTH_SUCCESS"
    assert success_evt["parsedFields"]["authMethod"] == "password"


@pytest.mark.asyncio
async def test_batch_ingest_deduplication(client: AsyncClient):
    log = {
        "timestamp": "2026-10-31T10:20:00Z",
        "raw": "Oct 31 10:20:00 bastion-01 sshd[12499]: Failed password for invalid user oracle from 198.51.100.42 port 41299 ssh2"
    }

    # First ingest
    res1 = await client.post(
        "/api/v1/ingest/batch",
        json={"source": "linux_ssh", "logs": [log]},
        headers={"X-Sentinel-Forwarder-Key": settings.FORWARDER_API_KEY}
    )
    assert res1.json()["normalizedCount"] == 1

    # Second ingest of identical log
    res2 = await client.post(
        "/api/v1/ingest/batch",
        json={"source": "linux_ssh", "logs": [log]},
        headers={"X-Sentinel-Forwarder-Key": settings.FORWARDER_API_KEY}
    )
    assert res2.json()["duplicateCount"] == 1
    assert res2.json()["normalizedCount"] == 0


@pytest.mark.asyncio
async def test_ingest_unauthorized(client: AsyncClient):
    response = await client.post(
        "/api/v1/ingest/batch",
        json={"source": "linux_ssh", "logs": []}
    )
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "UNAUTHORIZED_INGEST"
