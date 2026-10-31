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


@pytest.mark.asyncio
async def test_action_idempotency(client: AsyncClient, setup_playbook_and_auth: dict):
    # First execution
    res1 = await client.post(
        "/api/v1/response/execute",
        json={
            "playbookId": "PB-TEST-01",
            "actionName": "iptables drop",
            "target": "203.0.113.88"
        },
        headers=setup_playbook_and_auth
    )
    assert res1.status_code == 200
    act1 = res1.json()["action"]
    assert res1.json()["message"] == "Executed successfully"

    # Second execution on identical target with identical playbook
    res2 = await client.post(
        "/api/v1/response/execute",
        json={
            "playbookId": "PB-TEST-01",
            "actionName": "iptables drop",
            "target": "203.0.113.88"
        },
        headers=setup_playbook_and_auth
    )
    assert res2.status_code == 200
    act2 = res2.json()["action"]
    assert "idempotent" in res2.json()["message"].lower()
    assert act1["id"] == act2["id"]


@pytest.mark.asyncio
async def test_action_expiration_and_rollback_denial(client: AsyncClient, setup_playbook_and_auth: dict, db_session):
    from datetime import datetime, timezone, timedelta
    from backend.app.models.response import ResponseActionModel
    from backend.app.services.response import response_service

    # Create action backdated by 120 minutes
    two_hours_ago = datetime.now(timezone.utc) - timedelta(minutes=120)
    old_action = ResponseActionModel(
        id="ACT-EXP-001",
        playbook_id="PB-TEST-01",
        action_name="iptables drop",
        target="198.51.100.99",
        status="simulated_success",
        execution_mode="simulated",
        timestamp=two_hours_ago,
        duration_ms=100,
        details="Stale action for TTL test",
        verification_status="verified",
        rollback_available=True,
        is_simulated=True
    )
    db_session.add(old_action)
    await db_session.commit()

    # Run expiration service with TTL=60 minutes
    expired_count = await response_service.expire_stale_actions(ttl_minutes=60, db=db_session)
    assert expired_count >= 1

    # Verify action status transitioned to expired and rollback is disabled
    await db_session.refresh(old_action)
    assert old_action.status == "expired"
    assert old_action.rollback_available is False

    # Attempt to rollback expired action via API -> must fail
    res_rollback = await client.post(
        f"/api/v1/response/actions/{old_action.id}/rollback",
        headers=setup_playbook_and_auth
    )
    assert res_rollback.status_code == 400
    assert "expired" in res_rollback.json()["detail"]["message"].lower()

