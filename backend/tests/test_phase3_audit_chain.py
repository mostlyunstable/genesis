import pytest
from httpx import AsyncClient
from sqlalchemy import select

from backend.app.models.audit import AuditRecordModel
from backend.app.models.response import ResponsePlaybookModel
from backend.app.services.audit import audit_service
from backend.app.services.response import response_service, PolicyEngine


@pytest.mark.asyncio
async def test_audit_hash_chain_sequential_integrity(db_session):
    """Verify that records form an unbroken SHA-256 cryptographic chain."""
    # Create 3 audit records sequentially
    r1 = await audit_service.record_audit(
        db=db_session,
        category="AUTHENTICATION",
        action="USER_LOGIN_SUCCESS",
        actor="admin@sentinel.ai",
        target="10.240.10.15",
        result="SUCCESS",
        details={"method": "password"}
    )
    await db_session.commit()

    r2 = await audit_service.record_audit(
        db=db_session,
        category="POLICY_DECISION",
        action="DEFENSIVE_ACTION_BLOCKED",
        actor="sentinel_autonomous_engine",
        target="10.240.0.5",
        result="FAILURE",
        details={"reason": "Protected CIDR"}
    )
    await db_session.commit()

    r3 = await audit_service.record_audit(
        db=db_session,
        category="RESPONSE_EXECUTION",
        action="DEFENSIVE_ACTION_EXECUTED",
        actor="lead_analyst",
        target="198.51.100.42",
        result="SUCCESS",
        details={"playbookId": "PB-SSH-BRUTE-01"}
    )
    await db_session.commit()

    # 1. Verify link integrity
    assert r1.previous_hash == "GENESIS_SENTINEL_AI_2026_BLOCK_0"
    assert r2.previous_hash == r1.record_hash
    assert r3.previous_hash == r2.record_hash

    # 2. Verify chain verification service
    verification = await audit_service.verify_chain(db_session)
    assert verification["verified"] is True
    assert verification["status"] == "VALID"
    assert verification["totalRecords"] >= 3
    assert verification["tamperedCount"] == 0
    assert verification["latestHash"] == r3.record_hash


@pytest.mark.asyncio
async def test_audit_tamper_detection_on_payload_modification(db_session):
    """Verify that tampering with an audit record's payload triggers cryptographic detection."""
    rec = await audit_service.record_audit(
        db=db_session,
        category="POLICY_DECISION",
        action="DEFENSIVE_ACTION_BLOCKED",
        actor="system",
        target="10.0.0.1",
        result="FAILURE",
        details={"reason": "Core Gateway Protected"}
    )
    await db_session.commit()

    # Tamper with the record directly in the database
    rec.actor = "malicious_actor_tamper"
    await db_session.commit()

    # Verify detection
    verification = await audit_service.verify_chain(db_session)
    assert verification["verified"] is False
    assert verification["status"] == "TAMPERED"
    assert any(t["id"] == rec.id and t["error"] == "PAYLOAD_TAMPERED" for t in verification["tamperedRecords"])


@pytest.mark.asyncio
async def test_audit_tamper_detection_on_broken_chain_pointer(db_session):
    """Verify that breaking the previous_hash link triggers CHAIN_BROKEN detection."""
    r1 = await audit_service.record_audit(
        db=db_session,
        category="AUTH",
        action="LOGIN",
        actor="user1",
        target="host1",
        result="SUCCESS",
        details={}
    )
    await db_session.commit()

    r2 = await audit_service.record_audit(
        db=db_session,
        category="AUTH",
        action="LOGIN",
        actor="user2",
        target="host2",
        result="SUCCESS",
        details={}
    )
    await db_session.commit()

    # Corrupt chain pointer
    r2.previous_hash = "FORGED_HASH_POINTER_000000000000000000000000000000000000000000000"
    await db_session.commit()

    verification = await audit_service.verify_chain(db_session)
    assert verification["verified"] is False
    assert any(t["id"] == r2.id and t["error"] == "CHAIN_BROKEN" for t in verification["tamperedRecords"])


@pytest.mark.asyncio
async def test_audit_verification_api_endpoint(client: AsyncClient, db_session):
    """Verify the /api/v1/audit/verify endpoint reflects cryptographic state."""
    await audit_service.record_audit(
        db=db_session,
        category="CONFIG",
        action="SETTINGS_UPDATE",
        actor="admin",
        target="Settings",
        result="SUCCESS",
        details={}
    )
    await db_session.commit()

    res = await client.get("/api/v1/audit/verify")
    assert res.status_code == 200
    data = res.json()
    assert data["verified"] is True
    assert data["status"] == "VALID"
    assert "latestHash" in data


@pytest.mark.asyncio
async def test_response_policy_protected_subnets_and_audit(db_session):
    """Verify that response execution strictly rejects protected subnets and records audit records."""
    # Ensure playbook exists
    pb = ResponsePlaybookModel(
        id="PB-SSH-BRUTE-01",
        name="SSH Brute-Force Neutralization",
        description="Neutralize SSH brute force",
        severity_trigger=["critical"],
        triggers=["linux_ssh_brute"],
        investigation_requirements=["verify_source_ip"],
        response_steps=[{"action": "iptables drop"}],
        allowed_scope="external_ips",
        verification_steps=["check_iptables"],
        rollback_strategy="iptables -D",
        enabled=True,
        execution_count=0
    )
    db_session.add(pb)
    await db_session.commit()

    # 1. Attempt targeting protected loopback
    ok, act, reason = await response_service.execute_action(
        playbook_id="PB-SSH-BRUTE-01",
        action_name="iptables drop",
        target="127.0.0.1",
        incident_id=None,
        actor="analyst",
        db=db_session
    )
    assert ok is False
    assert "protected exclusion subnet" in reason

    # 2. Attempt targeting protected DC domain controller
    ok2, act2, reason2 = await response_service.execute_action(
        playbook_id="PB-SSH-BRUTE-01",
        action_name="iptables drop",
        target="10.240.0.5",
        incident_id=None,
        actor="analyst",
        db=db_session
    )
    assert ok2 is False
    assert "protected exclusion subnet" in reason2

    # 3. Verify audit record was created and hash-chained
    verification = await audit_service.verify_chain(db_session)
    assert verification["verified"] is True
