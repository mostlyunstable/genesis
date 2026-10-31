import pytest
from httpx import AsyncClient
from backend.app.core.config import settings


@pytest.mark.asyncio
async def test_ssh_brute_force_detection(client: AsyncClient):
    # Ingest 12 failed attempts from 198.51.100.42 within 30 seconds
    logs = [
        {
            "timestamp": f"2026-10-31T10:15:{i:02d}Z",
            "raw": f"Oct 31 10:15:{i:02d} bastion-01 sshd[{12400+i}]: Failed password for invalid user user_{i} from 198.51.100.42 port {41200+i} ssh2"
        }
        for i in range(12)
    ]

    res = await client.post(
        "/api/v1/ingest/batch",
        json={"source": "linux_ssh", "logs": logs},
        headers={"X-Sentinel-Forwarder-Key": settings.FORWARDER_API_KEY}
    )
    assert res.status_code == 202

    # Query detections
    det_res = await client.get("/api/v1/detections?category=ssh_brute_force")
    assert det_res.status_code == 200
    detections = det_res.json()
    assert detections["total"] >= 1

    det = detections["items"][0]
    assert det["sourceIp"] == "198.51.100.42"
    assert det["category"] == "ssh_brute_force"
    assert det["eventCount"] >= 10
    assert len(det["supportingEventIds"]) >= 10
    assert det["confidence"] >= 80.0
    assert det["riskScore"] >= 70.0
    assert det["suggestedPlaybookId"] == "PB-SSH-BRUTE-01"


@pytest.mark.asyncio
async def test_suspicious_success_after_failure(client: AsyncClient):
    # Ingest 4 failed attempts followed by 1 successful login for 'deploy'
    logs = [
        {
            "timestamp": f"2026-10-31T10:16:{10+i}Z",
            "raw": f"Oct 31 10:16:{10+i} bastion-01 sshd[{12500+i}]: Failed password for invalid user root from 198.51.100.55 port {41300+i} ssh2"
        }
        for i in range(4)
    ]
    logs.append({
        "timestamp": "2026-10-31T10:16:15Z",
        "raw": "Oct 31 10:16:15 bastion-01 sshd[12505]: Accepted password for deploy from 198.51.100.55 port 41305 ssh2"
    })

    res = await client.post(
        "/api/v1/ingest/batch",
        json={"source": "linux_ssh", "logs": logs},
        headers={"X-Sentinel-Forwarder-Key": settings.FORWARDER_API_KEY}
    )
    assert res.status_code == 202

    # Query detections for suspicious_auth
    det_res = await client.get("/api/v1/detections?category=suspicious_auth")
    assert det_res.status_code == 200
    detections = det_res.json()
    assert detections["total"] >= 1

    det = detections["items"][0]
    assert det["severity"] == "critical"
    assert det["sourceIp"] == "198.51.100.55"
    assert "deploy" in det["targetAccounts"]
    assert det["riskScore"] >= 90.0


@pytest.mark.asyncio
async def test_password_spraying_detection(client: AsyncClient):
    # Ingest 7 attempts against 7 distinct users from 203.0.113.88
    spray_users = ["a.smith", "b.johnson", "c.williams", "d.brown", "e.jones", "f.garcia", "g.miller"]
    logs = [
        {
            "timestamp": f"2026-10-31T10:18:{i*5:02d}Z",
            "raw": f'{{"eventType": "SSO_LOGIN_FAIL", "username": "{user}", "sourceIp": "203.0.113.88", "outcome": "failure"}}'
        }
        for i, user in enumerate(spray_users)
    ]

    res = await client.post(
        "/api/v1/ingest/batch",
        json={"source": "app_auth", "logs": logs},
        headers={"X-Sentinel-Forwarder-Key": settings.FORWARDER_API_KEY}
    )
    assert res.status_code == 202

    # Query detections for password_spraying
    det_res = await client.get("/api/v1/detections?category=password_spraying")
    assert det_res.status_code == 200
    detections = det_res.json()
    assert detections["total"] >= 1

    det = detections["items"][0]
    assert det["sourceIp"] == "203.0.113.88"
    assert len(det["targetAccounts"]) >= 5
    assert det["suggestedPlaybookId"] == "PB-SPRAY-DEFENSE-02"
