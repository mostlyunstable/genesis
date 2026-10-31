import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient
from backend.app.core.config import settings
from backend.app.models.user import User
from backend.app.models.detection import DetectionModel
from backend.app.models.incident import IncidentModel
from backend.app.core.security import get_password_hash


@pytest.fixture
async def secops_auth(client: AsyncClient, db_session):
    user = User(
        id="USR-SECOPS-P2",
        username="lead_analyst@sentinel.ai",
        full_name="Lead Analyst",
        hashed_password=get_password_hash("analyst_matrix_2026!"),
        role="analyst",
        is_active=True
    )
    db_session.add(user)
    await db_session.commit()

    login = await client.post("/api/v1/auth/login", json={
        "username": "lead_analyst@sentinel.ai",
        "password": "analyst_matrix_2026!"
    })
    token = login.json()["access_token"]
    return {
        "Authorization": f"Bearer {token}",
        "X-Sentinel-Forwarder-Key": settings.FORWARDER_API_KEY
    }


@pytest.mark.asyncio
async def test_ssh_brute_force_positive_and_negative(client: AsyncClient, secops_auth: dict):
    """
    Test Section 3: SSH Brute Force
    Positive: 12 failures from same IP targeting root -> triggers RULE-SSH-BRUTE-001 (threshold is 10).
    Negative: 3 failures from same IP (< 10 threshold) -> does not trigger detection.
    """
    from backend.app.services.detection import detection_engine
    detection_engine.reset()

    base_time = datetime.now(timezone.utc)
    target_attacker_ip = "198.51.100.111"

    # 1. Negative Case: Only 3 failed attempts from target_attacker_ip
    neg_logs = [
        {
            "timestamp": (base_time + timedelta(seconds=i*2)).isoformat(),
            "raw": f"{(base_time + timedelta(seconds=i*2)).strftime('%b %d %H:%M:%S')} auth-srv sshd[{101+i}]: Failed password for root from {target_attacker_ip} port {44100+i} ssh2"
        }
        for i in range(3)
    ]
    res_neg = await client.post("/api/v1/ingest/batch", json={"source": "linux_ssh", "logs": neg_logs}, headers=secops_auth)
    assert res_neg.status_code == 202
    assert res_neg.json()["normalizedCount"] == 3

    det_check1 = await client.get("/api/v1/detections?category=ssh_brute_force", headers=secops_auth)
    assert not any(target_attacker_ip in d["sourceIp"] for d in det_check1.json()["items"])

    # 2. Positive Case: Ingest 9 more failed attempts from target_attacker_ip for root (total 12 >= threshold 10)
    pos_logs = [
        {
            "timestamp": (base_time + timedelta(seconds=10+i*2)).isoformat(),
            "raw": f"{(base_time + timedelta(seconds=10+i*2)).strftime('%b %d %H:%M:%S')} auth-srv sshd[{110+i}]: Failed password for root from {target_attacker_ip} port {44110+i} ssh2"
        }
        for i in range(9)
    ]
    res_pos = await client.post("/api/v1/ingest/batch", json={"source": "linux_ssh", "logs": pos_logs}, headers=secops_auth)
    assert res_pos.status_code == 202
    assert res_pos.json()["normalizedCount"] == 9

    # Verify detection details
    det_res = await client.get("/api/v1/detections?category=ssh_brute_force", headers=secops_auth)
    detections = det_res.json()["items"]
    ssh_det = next((d for d in detections if target_attacker_ip in d["sourceIp"]), None)
    assert ssh_det is not None
    assert ssh_det["ruleId"] == "RULE-SSH-BRUTE-001"
    assert ssh_det["severity"] in ["high", "warning", "critical"]

    # Verify incident created
    inc_res = await client.get("/api/v1/incidents", headers=secops_auth)
    assert any(target_attacker_ip in inc["sourceIps"] for inc in inc_res.json()["items"])


@pytest.mark.asyncio
async def test_password_spraying_positive_and_negative(client: AsyncClient, secops_auth: dict):
    """
    Test Section 3: Horizontal Password Spraying
    Positive: 1 IP targeting 6 distinct usernames -> triggers RULE-SPRAY-002.
    Negative: 1 IP targeting 2 usernames -> does not trigger spray detection.
    """
    base_time = datetime.now(timezone.utc)

    # Negative Case: 2 usernames from 203.0.113.50
    neg_logs = [
        {
            "timestamp": base_time.isoformat(),
            "raw": f'{{"eventType": "SSO_LOGIN_FAIL", "username": "alice", "sourceIp": "203.0.113.50", "outcome": "failure"}}'
        },
        {
            "timestamp": (base_time + timedelta(seconds=5)).isoformat(),
            "raw": f'{{"eventType": "SSO_LOGIN_FAIL", "username": "bob", "sourceIp": "203.0.113.50", "outcome": "failure"}}'
        },
    ]
    res_neg = await client.post("/api/v1/ingest/batch", json={"source": "app_auth", "logs": neg_logs}, headers=secops_auth)
    assert res_neg.status_code == 202

    det_check = await client.get("/api/v1/detections?category=password_spraying", headers=secops_auth)
    assert not any(d["ruleId"] == "RULE-SPRAY-002" and "203.0.113.50" in d["sourceIp"] for d in det_check.json()["items"])

    # Positive Case: 4 more distinct usernames from 203.0.113.50 (total 6 distinct accounts)
    spray_users = ["charlie", "david", "elena", "frank"]
    pos_logs = [
        {
            "timestamp": (base_time + timedelta(seconds=10+i*2)).isoformat(),
            "raw": f'{{"eventType": "SSO_LOGIN_FAIL", "username": "{u}", "sourceIp": "203.0.113.50", "outcome": "failure"}}'
        }
        for i, u in enumerate(spray_users)
    ]
    res_pos = await client.post("/api/v1/ingest/batch", json={"source": "app_auth", "logs": pos_logs}, headers=secops_auth)
    assert res_pos.status_code == 202

    det_res = await client.get("/api/v1/detections?category=password_spraying", headers=secops_auth)
    spray_det = next((d for d in det_res.json()["items"] if d["ruleId"] == "RULE-SPRAY-002" and "203.0.113.50" in d["sourceIp"]), None)
    assert spray_det is not None
    assert len(spray_det["targetAccounts"]) >= 5


@pytest.mark.asyncio
async def test_suspicious_success_after_failure_detection(client: AsyncClient, secops_auth: dict):
    """
    Test Section 3: Suspicious successful login after repeated failures.
    1. Ingest 4 failures for account 'deployer' from attacker IP 192.0.2.77.
    2. Ingest 1 successful login for account 'deployer' from the same attacker IP.
    -> Must trigger RULE-AUTH-SUCCESS-AFTER-FAIL.
    """
    base_time = datetime.now(timezone.utc)
    logs = [
        {
            "timestamp": (base_time + timedelta(seconds=i*2)).isoformat(),
            "raw": f"{(base_time + timedelta(seconds=i*2)).strftime('%b %d %H:%M:%S')} auth-srv sshd[{201+i}]: Failed password for deployer from 192.0.2.77 port {33001+i} ssh2"
        }
        for i in range(4)
    ]
    logs.append({
        "timestamp": (base_time + timedelta(seconds=10)).isoformat(),
        "raw": f"{(base_time + timedelta(seconds=10)).strftime('%b %d %H:%M:%S')} auth-srv sshd[205]: Accepted password for deployer from 192.0.2.77 port 33005 ssh2"
    })

    res = await client.post("/api/v1/ingest/batch", json={"source": "linux_ssh", "logs": logs}, headers=secops_auth)
    assert res.status_code == 202
    assert res.json()["normalizedCount"] == 5

    det_res = await client.get("/api/v1/detections?category=suspicious_auth", headers=secops_auth)
    success_det = next((d for d in det_res.json()["items"] if d["ruleId"] == "RULE-AUTH-SUCCESS-AFTER-FAIL"), None)
    assert success_det is not None
    assert "deployer" in success_det["targetAccounts"]


@pytest.mark.asyncio
async def test_out_of_order_and_duplicate_events(client: AsyncClient, secops_auth: dict):
    """
    Test Section 3: Out-of-order event timestamps and duplicate event deduplication.
    """
    now = datetime.now(timezone.utc)
    older_time = now - timedelta(minutes=5)
    # Log 1: newer timestamp
    log1 = {
        "timestamp": now.isoformat(),
        "raw": f"{now.strftime('%b %d %H:%M:%S')} auth-srv sshd[301]: Failed password for audit_user from 198.51.100.99 port 50000 ssh2"
    }
    # Log 2: older timestamp (out-of-order)
    log2 = {
        "timestamp": older_time.isoformat(),
        "raw": f"{older_time.strftime('%b %d %H:%M:%S')} auth-srv sshd[300]: Failed password for audit_user from 198.51.100.99 port 49999 ssh2"
    }

    # Ingest out of order
    res = await client.post("/api/v1/ingest/batch", json={"source": "linux_ssh", "logs": [log1, log2]}, headers=secops_auth)
    assert res.status_code == 202
    assert res.json()["normalizedCount"] == 2

    # Ingest duplicate batch (same timestamps & raw logs)
    res_dup = await client.post("/api/v1/ingest/batch", json={"source": "linux_ssh", "logs": [log1, log2]}, headers=secops_auth)
    assert res_dup.status_code == 202
    assert res_dup.json()["normalizedCount"] == 0
    assert res_dup.json()["duplicateCount"] == 2


@pytest.mark.asyncio
async def test_multiple_independent_log_sources(client: AsyncClient, secops_auth: dict):
    """
    Test Section 3: Multiple independent log sources (syslog, JSON, Windows Auth).
    """
    iso_now = datetime.now(timezone.utc).isoformat()
    raw_logs = [
        # Linux SSH format
        {"timestamp": iso_now, "raw": "Oct 31 12:00:00 ip-10-0-1-12 sshd[999]: Failed password for invalid user oracle from 198.51.100.222 port 51234 ssh2"},
        # Structured JSON format
        {"timestamp": iso_now, "raw": f'{{"timestamp": "{iso_now}", "src_ip": "198.51.100.223", "dst_port": 443, "user": "admin", "action": "login_failed", "vendor": "okta"}}'},
        # Windows Security Event 4625
        {"timestamp": iso_now, "raw": f"Event 4625: An account failed to log on. Subject: User=administrator, Source Network Address: 198.51.100.224, Port: 3389, Time: {iso_now}"}
    ]

    res = await client.post("/api/v1/ingest/batch", json={"source": "generic", "logs": raw_logs}, headers=secops_auth)
    assert res.status_code == 202
    assert res.json()["normalizedCount"] == 3


@pytest.mark.asyncio
async def test_detections_independent_of_ai_provider(client: AsyncClient, secops_auth: dict, monkeypatch):
    """
    Test Section 3: Detections and incident creation must trigger even if AI providers are completely disabled.
    """
    monkeypatch.setenv("GEMINI_API_KEY", "")
    base_time = datetime.now(timezone.utc)
    logs = [
        {
            "timestamp": (base_time + timedelta(seconds=i)).isoformat(),
            "raw": f"{(base_time + timedelta(seconds=i)).strftime('%b %d %H:%M:%S')} auth-srv sshd[{400+i}]: Failed password for root from 203.0.113.119 port {45000+i} ssh2"
        }
        for i in range(12)
    ]

    res = await client.post("/api/v1/ingest/batch", json={"source": "linux_ssh", "logs": logs}, headers=secops_auth)
    assert res.status_code == 202

    # Query detections to verify rule-based detection was triggered independently of AI
    det_res = await client.get("/api/v1/detections?category=ssh_brute_force", headers=secops_auth)
    assert any("203.0.113.119" in d["sourceIp"] for d in det_res.json()["items"])

    # Query incidents to verify incident was created independently of AI
    inc_res = await client.get("/api/v1/incidents", headers=secops_auth)
    assert any("203.0.113.119" in inc["sourceIps"] for inc in inc_res.json()["items"])

