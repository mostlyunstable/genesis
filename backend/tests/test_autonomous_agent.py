import io
import json
import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone

from backend.app.services.chat_tools import (
    tool_registry,
    InvestigateIpAddressInput,
    GetAuthenticationEventsInput,
    DetectBruteForceActivityInput,
    MapMitreTechniquesInput,
    GetSecurityOverviewInput,
    ProposeResponseActionInput,
    SimulateResponseActionInput
)
from backend.app.models.event import SecurityEventModel
from backend.app.models.incident import IncidentModel


@pytest.mark.asyncio
async def test_multi_turn_investigation_flow(client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
    """
    Verifies multi-turn investigation and context memory:
    Turn 1: Upload and analyze an OpenSSH log with an attacker IP (198.51.100.77).
    Turn 2: Follow-up asking 'Investigate that IP' without repeating the IP.
    Turn 3: Follow-up asking 'Propose containment for that IP'.
    """
    # 1. Create conversation
    conv_resp = await client.post(
        "/api/v1/chat/conversations",
        json={"title": "Multi-Turn Autonomous Investigation"},
        headers=auth_headers
    )
    conv_id = conv_resp.json()["id"]

    # 2. Upload log file containing repeated failures from 198.51.100.77
    raw_log = (
        "Oct 31 11:00:01 bastion sshd[2001]: Failed password for root from 198.51.100.77 port 51101 ssh2\n"
        "Oct 31 11:00:03 bastion sshd[2002]: Failed password for admin from 198.51.100.77 port 51102 ssh2\n"
        "Oct 31 11:00:05 bastion sshd[2003]: Failed password for deploy from 198.51.100.77 port 51103 ssh2\n"
        "Oct 31 11:00:07 bastion sshd[2004]: Failed password for deploy from 198.51.100.77 port 51104 ssh2\n"
        "Oct 31 11:00:09 bastion sshd[2005]: Failed password for deploy from 198.51.100.77 port 51105 ssh2\n"
        "Oct 31 11:00:15 bastion sshd[2006]: Accepted password for deploy from 198.51.100.77 port 51106 ssh2\n"
    )
    files = {"file": ("auth_attack.log", io.BytesIO(raw_log.encode("utf-8")), "text/plain")}
    upload_resp = await client.post(
        f"/api/v1/chat/conversations/{conv_id}/upload",
        files=files,
        headers=auth_headers
    )
    assert upload_resp.status_code == 201
    file_id = upload_resp.json()["id"]

    # 3. Turn 1: Analyze uploaded log file
    turn1_resp = await client.post(
        f"/api/v1/chat/conversations/{conv_id}/messages",
        json={"message": "Analyze the uploaded log file and summarize the threat findings.", "contextFileId": file_id},
        headers=auth_headers
    )
    assert turn1_resp.status_code == 200, turn1_resp.text
    msg1 = turn1_resp.json()
    assert "198.51.100.77" in msg1["content"]
    assert "auth_attack.log" in msg1["content"]

    # 4. Turn 2: Contextual follow-up: 'Investigate that IP' (requires resolving 198.51.100.77 from previous turn)
    turn2_resp = await client.post(
        f"/api/v1/chat/conversations/{conv_id}/messages",
        json={"message": "Investigate that IP and check its threat reputation."},
        headers=auth_headers
    )
    assert turn2_resp.status_code == 200, turn2_resp.text
    msg2 = turn2_resp.json()
    assert "198.51.100.77" in msg2["content"]
    assert any(ref["id"] == "198.51.100.77" for ref in msg2["evidenceReferences"])

    # 5. Turn 3: Follow-up: 'Propose containment for that IP'
    turn3_resp = await client.post(
        f"/api/v1/chat/conversations/{conv_id}/messages",
        json={"message": "Propose containment action to block that IP."},
        headers=auth_headers
    )
    assert turn3_resp.status_code == 200, turn3_resp.text
    msg3 = turn3_resp.json()
    assert len(msg3["suggestedActions"]) > 0
    action = msg3["suggestedActions"][0]
    assert action["target"] == "198.51.100.77"
    assert action["status"] == "pending"
    assert action["requiresConfirmation"] is True


@pytest.mark.asyncio
async def test_cybersecurity_tools_direct_execution(db_session: AsyncSession):
    # Seed events
    now = datetime.now(timezone.utc)
    evt = SecurityEventModel(
        id="EVT-TOOL-001",
        timestamp=now,
        source="linux_ssh",
        event_type="SSH_AUTH_FAIL",
        source_ip="198.51.100.123",
        destination_ip="10.240.10.15",
        destination_port=22,
        username="admin",
        outcome="failure",
        severity="warning",
        raw_event="sshd: Failed password for admin from 198.51.100.123 port 22",
        parsed_fields={},
        fingerprint="fp-tool-001",
        is_simulated=True
    )
    db_session.add(evt)
    await db_session.commit()

    # 1. Test investigate_ip_address
    ip_res = await tool_registry.investigate_ip_address(InvestigateIpAddressInput(ip="198.51.100.123"), db_session)
    assert ip_res["status"] == "SUCCESS"
    assert ip_res["ip"] == "198.51.100.123"
    assert ip_res["failureCount"] >= 1
    assert ip_res["isProtected"] is False

    # 2. Test get_authentication_events
    auth_res = await tool_registry.get_authentication_events(GetAuthenticationEventsInput(source_ip="198.51.100.123"), db_session)
    assert auth_res["status"] == "SUCCESS"
    assert auth_res["count"] >= 1

    # 3. Test detect_brute_force_activity
    bf_res = await tool_registry.detect_brute_force_activity(DetectBruteForceActivityInput(target_ip="198.51.100.123"), db_session)
    assert bf_res["status"] == "SUCCESS"
    assert bf_res["totalFailures"] >= 1

    # 4. Test map_mitre_techniques
    mitre_res = await tool_registry.map_mitre_techniques(MapMitreTechniquesInput(technique_id="T1110.001"), db_session)
    assert mitre_res["status"] == "SUCCESS"
    assert len(mitre_res["techniques"]) > 0

    # 5. Test get_security_overview
    overview_res = await tool_registry.get_security_overview(GetSecurityOverviewInput(), db_session)
    assert overview_res["status"] == "SUCCESS"
    assert overview_res["totalEvents"] >= 1


@pytest.mark.asyncio
async def test_policy_engine_safeguard_blocks_protected_target(db_session: AsyncSession):
    # Propose action targeting protected internal loopback
    prop = await tool_registry.propose_response_action(
        ProposeResponseActionInput(
            action_name="iptables drop",
            target="127.0.0.1",
            playbook_id="PB-SSH-BRUTE-01",
            description="Isolate loopback"
        ),
        db_session
    )
    assert prop["status"] == "SUCCESS"
    assert prop["action"]["status"] == "blocked"
    assert "BLOCKED BY POLICY" in prop["action"]["description"]

    # Simulation check
    sim = await tool_registry.simulate_response_action(
        SimulateResponseActionInput(
            action_name="iptables drop",
            target="10.240.0.1",
            playbook_id="PB-SSH-BRUTE-01"
        ),
        db_session
    )
    assert sim["status"] == "SIMULATION_REJECTED"
    assert "protected" in sim["reason"].lower()
