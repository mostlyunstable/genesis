import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient

from backend.app.core.config import settings
from backend.app.services.detection import detection_engine
from backend.app.services.correlation import CorrelationEngine
from backend.app.models.user import User
from backend.app.core.security import get_password_hash


@pytest.fixture
async def secops_auth(client: AsyncClient, db_session):
    detection_engine.reset()
    user = User(
        id="USR-P3-DET-ADMIN",
        username="detection_lead@sentinel.ai",
        full_name="Detection Lead",
        hashed_password=get_password_hash("detection_matrix_2026!"),
        role="admin",
        is_active=True
    )
    db_session.add(user)
    await db_session.commit()

    login = await client.post("/api/v1/auth/login", json={
        "username": "detection_lead@sentinel.ai",
        "password": "detection_matrix_2026!"
    })
    token = login.json()["access_token"]
    return {
        "Authorization": f"Bearer {token}",
        "X-Sentinel-Forwarder-Key": settings.FORWARDER_API_KEY
    }


@pytest.mark.asyncio
async def test_distributed_multi_ip_brute_force(client: AsyncClient, secops_auth: dict):
    """
    Verify RULE-DISTRIB-BRUTE-003:
    When 3 distinct IPs target the same non-generic user account (e.g. 'cynthia_devops'),
    the engine flags a coordinated distributed brute force attack.
    """
    detection_engine.reset()
    base_time = datetime.now(timezone.utc)
    target_user = "cynthia_devops"

    logs = [
        # IP 1: 198.51.100.101
        {
            "timestamp": base_time.isoformat(),
            "raw": f"Oct 31 10:00:01 auth-srv sshd[1001]: Failed password for {target_user} from 198.51.100.101 port 41001 ssh2"
        },
        # IP 2: 198.51.100.102
        {
            "timestamp": (base_time + timedelta(seconds=2)).isoformat(),
            "raw": f"Oct 31 10:00:03 auth-srv sshd[1002]: Failed password for {target_user} from 198.51.100.102 port 41002 ssh2"
        },
        # IP 3: 198.51.100.103
        {
            "timestamp": (base_time + timedelta(seconds=4)).isoformat(),
            "raw": f"Oct 31 10:00:05 auth-srv sshd[1003]: Failed password for {target_user} from 198.51.100.103 port 41003 ssh2"
        }
    ]

    res = await client.post("/api/v1/ingest/batch", json={"source": "linux_ssh", "logs": logs}, headers=secops_auth)
    assert res.status_code == 202

    # Query detections for distributed_brute_force
    det_res = await client.get("/api/v1/detections?category=distributed_brute_force", headers=secops_auth)
    assert det_res.status_code == 200
    detections = det_res.json()["items"]
    distrib_det = next((d for d in detections if d["ruleId"] == "RULE-DISTRIB-BRUTE-003"), None)
    assert distrib_det is not None
    assert target_user in distrib_det["targetAccounts"]
    assert distrib_det["severity"] in ["warning", "high"]


@pytest.mark.asyncio
async def test_cross_asset_authentication_failures(client: AsyncClient, secops_auth: dict):
    """
    Verify RULE-CROSS-ASSET-FAIL-004:
    A single IP attempting failed logins across multiple distinct internal targets
    triggers lateral probing detection.
    """
    detection_engine.reset()
    base_time = datetime.now(timezone.utc)
    attacker_ip = "198.51.100.222"

    # Ingest 2 failures targeting Bastion (10.240.10.15) and 2 failures targeting Domain Controller (10.240.0.5)
    logs = [
        {
            "timestamp": (base_time + timedelta(seconds=1)).isoformat(),
            "raw": f"Oct 31 10:00:01 bastion sshd[201]: Failed password for user1 from {attacker_ip} port 50001 ssh2",
            "metadata": {"destinationIp": "10.240.10.15"}
        },
        {
            "timestamp": (base_time + timedelta(seconds=2)).isoformat(),
            "raw": f"Oct 31 10:00:02 bastion sshd[202]: Failed password for user2 from {attacker_ip} port 50002 ssh2",
            "metadata": {"destinationIp": "10.240.10.15"}
        },
        {
            "timestamp": (base_time + timedelta(seconds=3)).isoformat(),
            "raw": f"Event 4625: Logon Failure. Account Name: user3. Source Network Address: {attacker_ip}. Port: 3389.",
            "metadata": {"destinationIp": "10.240.0.5"}
        },
        {
            "timestamp": (base_time + timedelta(seconds=4)).isoformat(),
            "raw": f"Event 4625: Logon Failure. Account Name: user4. Source Network Address: {attacker_ip}. Port: 3389.",
            "metadata": {"destinationIp": "10.240.0.5"}
        }
    ]

    res = await client.post("/api/v1/ingest/batch", json={"source": "generic", "logs": logs}, headers=secops_auth)
    assert res.status_code == 202

    det_res = await client.get("/api/v1/detections?category=lateral_probing", headers=secops_auth)
    assert det_res.status_code == 200
    detections = det_res.json()["items"]
    assert any(d["ruleId"] == "RULE-CROSS-ASSET-FAIL-004" for d in detections)


@pytest.mark.asyncio
async def test_privileged_account_targeted_attack(client: AsyncClient, secops_auth: dict):
    """
    Verify RULE-PRIV-TARGET-005:
    5+ targeted failures specifically targeting high-value account 'domain_admin'
    triggers critical privilege targeting detection.
    """
    detection_engine.reset()
    base_time = datetime.now(timezone.utc)
    attacker_ip = "198.51.100.230"

    logs = [
        {
            "timestamp": (base_time + timedelta(seconds=i*2)).isoformat(),
            "raw": f"Event 4625: Logon Failure. Account Name: domain_admin. Source Network Address: {attacker_ip}. Port: 3389."
        }
        for i in range(5)
    ]

    res = await client.post("/api/v1/ingest/batch", json={"source": "windows_security", "logs": logs}, headers=secops_auth)
    assert res.status_code == 202

    det_res = await client.get("/api/v1/detections?category=privilege_targeting", headers=secops_auth)
    assert det_res.status_code == 200
    detections = det_res.json()["items"]
    priv_det = next((d for d in detections if d["ruleId"] == "RULE-PRIV-TARGET-005"), None)
    assert priv_det is not None
    assert "domain_admin" in priv_det["targetAccounts"]
    assert priv_det["riskScore"] >= 80.0


def test_deterministic_explainable_risk_calculation():
    """
    Verify risk scoring algorithm produces repeatable, explainable values
    without generative AI hallucinations.
    """
    # 1. Base SSH Brute Force (no breach, no privileged)
    risk1, conf1 = CorrelationEngine.calculate_risk(
        category="ssh_brute_force",
        event_count=10,
        target_accounts=["testuser1"],
        has_successful_breach=False
    )
    # Base 70 + 0 (not privileged) + 0 (no breach) + min(10, 10//5 = 2) = 72
    assert risk1 == 72
    assert conf1 == 80  # min(100, 75 + min(25, 10//2 = 5)) = 80

    # 2. Privileged Targeted Breach (breach=True, privileged=True)
    risk2, conf2 = CorrelationEngine.calculate_risk(
        category="privilege_targeting",
        event_count=20,
        target_accounts=["root"],
        has_successful_breach=True
    )
    # Base 80 + 12 (privileged) + 15 (breach) + min(10, 20//5 = 4) = 100 (capped at 100)
    assert risk2 == 100
    assert conf2 == 85  # min(100, 75 + min(25, 20//2 = 10)) = 85
