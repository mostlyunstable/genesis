import pytest
from httpx import AsyncClient
from backend.app.models.user import User
from backend.app.models.response import ResponsePlaybookModel
from backend.app.core.security import get_password_hash


@pytest.fixture
async def setup_playbook_and_auth(client: AsyncClient, db_session):
    user = User(
        id="USR-RESP-01",
        username="commander@sentinel.ai",
        full_name="Incident Commander",
        hashed_password=get_password_hash("commander_pwd_2026!"),
        role="admin",
        is_active=True
    )
    pb = ResponsePlaybookModel(
        id="PB-TEST-01",
        name="Test Defense Playbook",
        description="Test playbook",
        severity_trigger=["critical"],
        triggers=["test"],
        investigation_requirements=["test"],
        response_steps=[{"stepNumber": 1, "action": "iptables drop", "targetType": "ip", "automated": True, "requiresApproval": False}],
        allowed_scope="Test scope",
        verification_steps=["test"],
        rollback_strategy="iptables delete",
        enabled=True,
        execution_count=0
    )
    db_session.add_all([user, pb])
    await db_session.commit()

    login = await client.post("/api/v1/auth/login", json={
        "username": "commander@sentinel.ai",
        "password": "commander_pwd_2026!"
    })
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_execute_action_success_and_rollback(client: AsyncClient, setup_playbook_and_auth: dict):
    # Execute action against valid attacker IP
    res = await client.post(
        "/api/v1/response/execute",
        json={
            "playbookId": "PB-TEST-01",
            "actionName": "iptables drop",
            "target": "198.51.100.42"
        },
        headers=setup_playbook_and_auth
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    act = data["action"]
    assert act["target"] == "198.51.100.42"
    assert act["verificationStatus"] == "verified"
    assert act["rollbackAvailable"] is True

    # Rollback the action
    roll_res = await client.post(
        f"/api/v1/response/actions/{act['id']}/rollback",
        headers=setup_playbook_and_auth
    )
    assert roll_res.status_code == 200
    assert roll_res.json()["status"] == "rolled_back"


@pytest.mark.asyncio
async def test_policy_rejects_protected_ip(client: AsyncClient, setup_playbook_and_auth: dict):
    # Attempt action against protected Domain Controller (10.240.0.5)
    res = await client.post(
        "/api/v1/response/execute",
        json={
            "playbookId": "PB-TEST-01",
            "actionName": "iptables drop",
            "target": "10.240.0.5"
        },
        headers=setup_playbook_and_auth
    )
    assert res.status_code == 400
    assert res.json()["detail"]["code"] == "POLICY_REJECTION"
    assert "protected exclusion subnet" in res.json()["detail"]["message"]


@pytest.mark.asyncio
async def test_emergency_halt_blocks_all_actions(client: AsyncClient, setup_playbook_and_auth: dict):
    # Engage Emergency Halt
    halt_res = await client.post(
        "/api/v1/response/emergency-toggle",
        json={"enabled": False},
        headers=setup_playbook_and_auth
    )
    assert halt_res.status_code == 200
    assert halt_res.json()["autonomousResponseGlobalEnabled"] is False

    # Attempt action while halted
    res = await client.post(
        "/api/v1/response/execute",
        json={
            "playbookId": "PB-TEST-01",
            "actionName": "iptables drop",
            "target": "198.51.100.42"
        },
        headers=setup_playbook_and_auth
    )
    assert res.status_code == 400
    assert "Emergency Halt" in res.json()["detail"]["message"]

    # Restore engine
    restore_res = await client.post(
        "/api/v1/response/emergency-toggle",
        json={"enabled": True},
        headers=setup_playbook_and_auth
    )
    assert restore_res.status_code == 200
    assert restore_res.json()["autonomousResponseGlobalEnabled"] is True
