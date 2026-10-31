import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient
from sqlalchemy import select

from backend.app.models.user import User
from backend.app.models.response import ResponsePlaybookModel, ResponseActionModel
from backend.app.models.audit import AuditRecordModel
from backend.app.core.security import get_password_hash
from backend.app.services.response import response_service


@pytest.fixture
async def secops_commander(client: AsyncClient, db_session):
    user = User(
        id="USR-CMDR-P2",
        username="secops_commander@sentinel.ai",
        full_name="SOAR Incident Commander",
        hashed_password=get_password_hash("commander_matrix_2026!"),
        role="admin",
        is_active=True
    )
    pb = ResponsePlaybookModel(
        id="PB-SAFETY-01",
        name="Safety Validation Playbook",
        description="Playbook used for response safety verification",
        severity_trigger=["critical", "high"],
        triggers=["test_attack"],
        investigation_requirements=["verify target IP"],
        response_steps=[
            {"stepNumber": 1, "action": "iptables drop", "targetType": "ip", "automated": True, "requiresApproval": False}
        ],
        allowed_scope="Isolated lab assets",
        verification_steps=["ping target"],
        rollback_strategy="iptables delete",
        enabled=True,
        execution_count=0
    )
    db_session.add_all([user, pb])
    await db_session.commit()

    login = await client.post("/api/v1/auth/login", json={
        "username": "secops_commander@sentinel.ai",
        "password": "commander_matrix_2026!"
    })
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_unauthorized_action_rejected(client: AsyncClient, secops_commander: dict):
    """Verify arbitrary or unapproved action verbs (e.g. 'rm -rf', 'reboot', 'dd') are rejected."""
    res = await client.post(
        "/api/v1/response/execute",
        json={
            "playbookId": "PB-SAFETY-01",
            "actionName": "rm -rf / --no-preserve-root",
            "target": "198.51.100.99"
        },
        headers=secops_commander
    )
    assert res.status_code == 400
    assert res.json()["detail"]["code"] == "POLICY_REJECTION"
    assert "not in the authorized defense allowlist" in res.json()["detail"]["message"]


@pytest.mark.asyncio
async def test_all_protected_subnets_rejected(client: AsyncClient, secops_commander: dict):
    """Verify that protected subnets (127.0.0.0/8, 10.240.0.0/24, 10.0.0.1, 10.0.0.254) cannot be targeted."""
    forbidden_targets = [
        "127.0.0.1",       # Loopback
        "127.0.0.254",     # Loopback range
        "10.240.0.5",      # Protected DC
        "10.240.0.100",    # Core Identity Cluster
        "10.0.0.1",        # Core DNS
        "10.0.0.254",      # Gateway
    ]
    for target in forbidden_targets:
        res = await client.post(
            "/api/v1/response/execute",
            json={
                "playbookId": "PB-SAFETY-01",
                "actionName": "iptables drop",
                "target": target
            },
            headers=secops_commander
        )
        assert res.status_code == 400
        assert res.json()["detail"]["code"] == "POLICY_REJECTION"
        assert "protected exclusion subnet" in res.json()["detail"]["message"]


@pytest.mark.asyncio
async def test_emergency_halt_and_audit(client: AsyncClient, secops_commander: dict, db_session):
    """Verify emergency halt stops actions and emits audit log."""
    # 1. Engage halt
    halt_res = await client.post(
        "/api/v1/response/emergency-toggle",
        json={"enabled": False},
        headers=secops_commander
    )
    assert halt_res.status_code == 200
    assert halt_res.json()["autonomousResponseGlobalEnabled"] is False

    # 2. Verify action blocked
    blocked_res = await client.post(
        "/api/v1/response/execute",
        json={
            "playbookId": "PB-SAFETY-01",
            "actionName": "iptables drop",
            "target": "198.51.100.77"
        },
        headers=secops_commander
    )
    assert blocked_res.status_code == 400
    assert "Emergency Halt" in blocked_res.json()["detail"]["message"]

    # 3. Restore switch
    await client.post(
        "/api/v1/response/emergency-toggle",
        json={"enabled": True},
        headers=secops_commander
    )

    # 4. Check audit record created for emergency toggle
    audits_res = await client.get("/api/v1/audit", headers=secops_commander)
    assert audits_res.status_code == 200
    items = audits_res.json()
    assert any("AutonomousResponseGlobalSwitch" in a["target"] for a in items)


@pytest.mark.asyncio
async def test_action_budget_enforcement(client: AsyncClient, secops_commander: dict, db_session):
    """Verify circuit breaker triggers if hourly action budget (20 actions/hour) is exceeded."""
    now = datetime.now(timezone.utc)
    # Seed 20 historical actions within the past 10 minutes
    dummy_actions = [
        ResponseActionModel(
            id=f"ACT-BUDGET-{i:03d}",
            playbook_id="PB-SAFETY-01",
            action_name="iptables drop",
            target=f"198.51.100.{100+i}",
            status="simulated_success",
            execution_mode="simulated",
            timestamp=now - timedelta(minutes=5),
            duration_ms=50,
            details="Budget exhaustion test",
            verification_status="verified",
            rollback_available=True,
            is_simulated=True
        )
        for i in range(20)
    ]
    db_session.add_all(dummy_actions)
    await db_session.commit()

    # Attempt 21st action -> must be rejected by budget circuit breaker
    res = await client.post(
        "/api/v1/response/execute",
        json={
            "playbookId": "PB-SAFETY-01",
            "actionName": "iptables drop",
            "target": "198.51.100.250"
        },
        headers=secops_commander
    )
    assert res.status_code == 400
    assert "hourly action budget of 20 exceeded" in res.json()["detail"]["message"]
