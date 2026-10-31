import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient
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
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_ssh_brute_force_positive_and_negative(client: AsyncClient, secops_auth: dict):
    """
    Test Section 3: SSH Brute Force
    Positive: 5 failures from same IP within window -> triggers detection & incident.
    Negative: 2 failures from same IP (< 5 threshold) -> does not trigger detection.
    """
    base_time = datetime.now(timezone.utc)

    # 1. Negative Case: Only 2 failed attempts from 198.51.100.10
    neg_logs = [
        f"{base_time.strftime('%b %d %H:%M:%S')} auth-srv sshd[101]: Failed password for root from 198.51.100.10 port 44100 ssh2",
        f"{(base_time + timedelta(seconds=2)).strftime('%b %d %H:%M:%S')} auth-srv sshd[102]: Failed password for admin from 198.51.100.10 port 44102 ssh2",
    ]
    res_neg = await client.post("/api/v1/events/ingest", json={"rawLogs": neg_logs, "sourceType": "linux_syslog"}, headers=secops_auth)
    assert res_neg.status_code == 200
    assert res_neg.json()["newDetectionsCount"] == 0

    # 2. Positive Case: Ingest 3 more failed attempts from 198.51.100.10 (reaching threshold 5)
    pos_logs = [
        f"{(base_time + timedelta(seconds=4)).strftime('%b %d %H:%M:%S')} auth-srv sshd[103]: Failed password for user1 from 198.51.100.10 port 44104 ssh2",
        f"{(base_time + timedelta(seconds=6)).strftime('%b %d %H:%M:%S')} auth-srv sshd[104]: Failed password for user2 from 198.51.100.10 port 44106 ssh2",
        f"{(base_time + timedelta(seconds=8)).strftime('%b %d %H:%M:%S')} auth-srv sshd[105]: Failed password for user3 from 198.51.100.10 port 44108 ssh2",
    ]
    res_pos = await client.post("/api/v1/events/ingest", json={"rawLogs": pos_logs, "sourceType": "linux_syslog"}, headers=secops_auth)
    assert res_pos.status_code == 200
    assert res_pos.json()["newDetectionsCount"] >= 1
    assert res_pos.json()["newIncidentsCount"] >= 1

    # Verify detection details
    det_res = await client.get("/api/v1/detections", headers=secops_auth)
    detections = det_res.json()
    ssh_det = next((d for d in detections if "198.51.100.10" in d["sourceIp"]), None)
    assert ssh_det is not None
    assert ssh_det["ruleId"] == "RULE-SSH-BRUTE-FORCE"
    assert ssh_det["severity"] in ["high", "critical"]


@pytest.mark.asyncio
async def test_password_spraying_positive_and_negative(client: AsyncClient, secops_auth: dict):
    """
    Test Section 3: Horizontal Password Spraying
    Positive: 1 IP targeting 6 distinct usernames -> triggers RULE-PASSWORD-SPRAY.
    Negative: 1 IP targeting 2 usernames -> does not trigger spray detection.
    """
    base_time = datetime.now(timezone.utc)

    # Negative Case: 2 usernames from 203.0.113.50
    neg_logs = [
        f"{base_time.strftime('%b %d %H:%M:%S')} pam_unix(sshd:auth): authentication failure; logname= uid=0 euid=0 tty=ssh ruser= rhost=203.0.113.50  user=alice",
        f"{(base_time + timedelta(seconds=5)).strftime('%b %d %H:%M:%S')} pam_unix(sshd:auth): authentication failure; logname= uid=0 euid=0 tty=ssh ruser= rhost=203.0.113.50  user=bob",
    ]
    res_neg = await client.post("/api/v1/events/ingest", json={"rawLogs": neg_logs, "sourceType": "linux_syslog"}, headers=secops_auth)
    assert res_neg.status_code == 200
    assert res_neg.json()["newDetectionsCount"] == 0

    # Positive Case: 4 more distinct usernames from 203.0.113.50 (total 6 distinct accounts)
    spray_users = ["charlie", "david", "elena", "frank"]
    pos_logs = [
        f"{(base_time + timedelta(seconds=10+i*2)).strftime('%b %d %H:%M:%S')} pam_unix(sshd:auth): authentication failure; logname= uid=0 euid=0 tty=ssh ruser= rhost=203.0.113.50  user={u}"
        for i, u in enumerate(spray_users)
    ]
    res_pos = await client.post("/api/v1/events/ingest", json={"rawLogs": pos_logs, "sourceType": "linux_syslog"}, headers=secops_auth)
    assert res_pos.status_code == 200
    assert res_pos.json()["newDetectionsCount"] >= 1

    det_res = await client.get("/api/v1/detections", headers=secops_auth)
    spray_det = next((d for d in det_res.json() if d["ruleId"] == "RULE-PASSWORD-SPRAY" and "203.0.113.50" in d["sourceIp"]), None)
    assert spray_det is not None
    assert len(spray_det["targetAccounts"]) >= 5


@pytest.mark.asyncio
async def test_suspicious_success_after_failure_detection(client: AsyncClient, secops_auth: dict):
    """
    Test Section 3: Suspicious successful login after repeated failures.
    1. Ingest 4 failures for account 'deployer' from attacker IP 192.0.2.77.
    2. Ingest 1 successful login for account 'deployer' from the same attacker IP.
    -> Must trigger RULE-SUSPICIOUS-SUCCESS.
    """
    base_time = datetime.now(timezone.utc)
    logs = [
        f"{base_time.strftime('%b %d %H:%M:%S')} auth-srv sshd[201]: Failed password for deployer from 192.0.2.77 port 33001 ssh2",
        f"{(base_time + timedelta(seconds=3)).strftime('%b %d %H:%M:%S')} auth-srv sshd[202]: Failed password for deployer from 192.0.2.77 port 33002 ssh2",
        f"{(base_time + timedelta(seconds=6)).strftime('%b %d %H:%M:%S')} auth-srv sshd[203]: Failed password for deployer from 192.0.2.77 port 33003 ssh2",
        f"{(base_time + timedelta(seconds=9)).strftime('%b %d %H:%M:%S')} auth-srv sshd[204]: Failed password for deployer from 192.0.2.77 port 33004 ssh2",
        f"{(base_time + timedelta(seconds=12)).strftime('%b %d %H:%M:%S')} auth-srv sshd[205]: Accepted password for deployer from 192.0.2.77 port 33005 ssh2",
    ]
    res = await client.post("/api/v1/events/ingest", json={"rawLogs": logs, "sourceType": "linux_syslog"}, headers=secops_auth)
    assert res.status_code == 200
    assert res.json()["newDetectionsCount"] >= 1

    det_res = await client.get("/api/v1/detections", headers=secops_auth)
    success_det = next((d for d in det_res.json() if d["ruleId"] == "RULE-SUSPICIOUS-SUCCESS"), None)
    assert success_det is not None
    assert "deployer" in success_det["targetAccounts"]


@pytest.mark.asyncio
async def test_out_of_order_and_duplicate_events(client: AsyncClient, secops_auth: dict):
    """
    Test Section 3: Out-of-order event timestamps and duplicate event deduplication.
    """
    now = datetime.now(timezone.utc)
    # Log 1: newer timestamp
    log1 = f"{now.strftime('%b %d %H:%M:%S')} auth-srv sshd[301]: Failed password for audit_user from 198.51.100.99 port 50000 ssh2"
    # Log 2: older timestamp (out-of-order)
    older_time = now - timedelta(minutes=5)
    log2 = f"{older_time.strftime('%b %d %H:%M:%S')} auth-srv sshd[300]: Failed password for audit_user from 198.51.100.99 port 49999 ssh2"

    # Ingest out of order
    res = await client.post("/api/v1/events/ingest", json={"rawLogs": [log1, log2], "sourceType": "linux_syslog"}, headers=secops_auth)
    assert res.status_code == 200
    assert res.json()["ingestedCount"] == 2

    # Ingest duplicate batch
    res_dup = await client.post("/api/v1/events/ingest", json={"rawLogs": [log1, log2], "sourceType": "linux_syslog"}, headers=secops_auth)
    assert res_dup.status_code == 200
    assert res_dup.json()["ingestedCount"] == 0
    assert res_dup.json()["duplicateCount"] == 2


@pytest.mark.asyncio
async def test_multiple_independent_log_sources(client: AsyncClient, secops_auth: dict):
    """
    Test Section 3: Multiple independent log sources (syslog, JSON, Windows Auth, Cloud Audit).
    """
    iso_now = datetime.now(timezone.utc).isoformat()
    raw_logs = [
        # Linux SSH format
        "Oct 31 12:00:00 ip-10-0-1-12 sshd[999]: Failed password for invalid user oracle from 198.51.100.222 port 51234 ssh2",
        # Structured JSON format
        f'{{"timestamp": "{iso_now}", "src_ip": "198.51.100.223", "dst_port": 443, "user": "admin", "action": "login_failed", "vendor": "okta"}}',
        # Windows Security Event 4625
        f"Event 4625: An account failed to log on. Subject: User=administrator, Source Network Address: 198.51.100.224, Port: 3389, Time: {iso_now}"
    ]

    res = await client.post("/api/v1/events/ingest", json={"rawLogs": raw_logs, "sourceType": "generic"}, headers=secops_auth)
    assert res.status_code == 200
    assert res.json()["ingestedCount"] == 3


@pytest.mark.asyncio
async def test_detections_independent_of_ai_provider(client: AsyncClient, secops_auth: dict, monkeypatch):
    """
    Test Section 3: Detections and incident creation must trigger even if AI providers are completely disabled.
    """
    # Force GEMINI_API_KEY to None
    monkeypatch.setenv("GEMINI_API_KEY", "")
    base_time = datetime.now(timezone.utc)
    logs = [
        f"{(base_time + timedelta(seconds=i)).strftime('%b %d %H:%M:%S')} auth-srv sshd[40{i}]: Failed password for testbot from 203.0.113.119 port {45000+i} ssh2"
        for i in range(5)
    ]

    res = await client.post("/api/v1/events/ingest", json={"rawLogs": logs, "sourceType": "linux_syslog"}, headers=secops_auth)
    assert res.status_code == 200
    # Must create detection and incident purely through rule-based sliding window
    assert res.json()["newDetectionsCount"] >= 1
    assert res.json()["newIncidentsCount"] >= 1
