import json
import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone

from backend.app.models.incident import IncidentModel
from backend.app.models.event import SecurityEventModel
from backend.app.models.chat import ConversationModel, ChatMessageModel
from backend.app.models.user import User
from backend.app.core.security import get_password_hash, create_access_token


@pytest.mark.asyncio
async def test_conversation_lifecycle(client: AsyncClient, auth_headers: dict):
    # 1. Create Conversation
    create_resp = await client.post(
        "/api/v1/chat/conversations",
        json={"title": "Investigation into SSH Brute Force", "contextMetadata": {"category": "brute_force"}},
        headers=auth_headers
    )
    assert create_resp.status_code == 200, create_resp.text
    conv_data = create_resp.json()
    conv_id = conv_data["id"]
    assert conv_data["title"] == "Investigation into SSH Brute Force"
    assert conv_data["isPinned"] is False

    # 2. List Conversations
    list_resp = await client.get("/api/v1/chat/conversations", headers=auth_headers)
    assert list_resp.status_code == 200
    conv_list = list_resp.json()
    assert any(c["id"] == conv_id for c in conv_list)

    # 3. Get Conversation Details
    get_resp = await client.get(f"/api/v1/chat/conversations/{conv_id}", headers=auth_headers)
    assert get_resp.status_code == 200
    detail = get_resp.json()
    assert detail["id"] == conv_id
    assert detail["title"] == "Investigation into SSH Brute Force"
    assert isinstance(detail["messages"], list)

    # 4. Patch Conversation (Pin and Rename)
    patch_resp = await client.patch(
        f"/api/v1/chat/conversations/{conv_id}",
        json={"title": "High Priority SSH Incident", "isPinned": True},
        headers=auth_headers
    )
    assert patch_resp.status_code == 200
    updated = patch_resp.json()
    assert updated["title"] == "High Priority SSH Incident"
    assert updated["isPinned"] is True

    # 5. Delete Conversation
    del_resp = await client.delete(f"/api/v1/chat/conversations/{conv_id}", headers=auth_headers)
    assert del_resp.status_code == 200
    assert del_resp.json()["status"] == "DELETED"

    # Confirm 404 after deletion
    get_after_del = await client.get(f"/api/v1/chat/conversations/{conv_id}", headers=auth_headers)
    assert get_after_del.status_code == 404


@pytest.mark.asyncio
async def test_message_sync_and_grounding(client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
    # Seed an incident and an event to ground the copilot
    now = datetime.now(timezone.utc)
    inc = IncidentModel(
        id="INC-COPILOT-001",
        title="Distributed SSH Brute Force against Bastion",
        category="brute_force",
        severity="critical",
        status="open",
        risk_score=92,
        confidence_score=95,
        source_ips=["198.51.100.42"],
        target_accounts=["root", "admin"],
        created_at=now,
        updated_at=now,
        detection_explanation="High volume distributed credential attack on bastion host."
    )
    db_session.add(inc)

    evt = SecurityEventModel(
        id="EVT-COPILOT-001",
        timestamp=now,
        source="ssh",
        event_type="authentication_failed",
        source_ip="198.51.100.42",
        destination_ip="10.0.0.5",
        destination_port=22,
        username="root",
        outcome="failure",
        severity="high",
        raw_event='{"auth_method": "password"}',
        parsed_fields={"auth_method": "password"},
        fingerprint="fp-copilot-001"
    )
    db_session.add(evt)
    await db_session.commit()

    # Create conversation
    create_resp = await client.post(
        "/api/v1/chat/conversations",
        json={"title": "Incident Investigation"},
        headers=auth_headers
    )
    conv_id = create_resp.json()["id"]

    # Send message querying real incident
    send_resp = await client.post(
        f"/api/v1/chat/conversations/{conv_id}/messages",
        json={"message": "Can you summarize incident INC-COPILOT-001 and recommend actions?"},
        headers=auth_headers
    )
    assert send_resp.status_code == 200, send_resp.text
    msg = send_resp.json()
    assert msg["role"] == "assistant"
    assert "INC-COPILOT-001" in msg["content"]
    assert "198.51.100.42" in msg["content"]
    assert len(msg["evidenceReferences"]) > 0
    assert any(ref["id"] == "INC-COPILOT-001" for ref in msg["evidenceReferences"])

    # Verify message persistence in conversation history
    history_resp = await client.get(f"/api/v1/chat/conversations/{conv_id}", headers=auth_headers)
    history = history_resp.json()
    assert len(history["messages"]) >= 2  # user message and assistant message


@pytest.mark.asyncio
async def test_zero_hallucination_on_missing_records(client: AsyncClient, auth_headers: dict):
    # Create conversation
    create_resp = await client.post(
        "/api/v1/chat/conversations",
        json={"title": "Verification of non-existent incident"},
        headers=auth_headers
    )
    conv_id = create_resp.json()["id"]

    # Ask about non-existent incident
    send_resp = await client.post(
        f"/api/v1/chat/conversations/{conv_id}/messages",
        json={"message": "What are the details for incident INC-NONEXISTENT-999?"},
        headers=auth_headers
    )
    assert send_resp.status_code == 200
    msg = send_resp.json()
    content = msg["content"].lower()
    # Ensure copilot explicitly communicates that the incident was not found
    assert "not found" in content or "no incident" in content or "does not exist" in content
    # Ensure it did not hallucinate evidence references for nonexistent incident
    assert not any(ref["id"] == "INC-NONEXISTENT-999" for ref in msg["evidenceReferences"])


@pytest.mark.asyncio
async def test_streaming_sse_endpoint(client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
    # Create conversation
    create_resp = await client.post(
        "/api/v1/chat/conversations",
        json={"title": "Streaming Test"},
        headers=auth_headers
    )
    conv_id = create_resp.json()["id"]

    # Call streaming endpoint
    stream_resp = await client.post(
        f"/api/v1/chat/conversations/{conv_id}/stream",
        json={"message": "Analyze system health and threat status"},
        headers=auth_headers
    )
    assert stream_resp.status_code == 200
    assert "text/event-stream" in stream_resp.headers["content-type"]

    body = stream_resp.text
    # Verify presence of SSE protocol events
    assert "event: step" in body
    assert "event: token" in body
    assert "event: done" in body

    # Parse done event data
    done_payload = None
    for chunk in body.split("\n\n"):
        if chunk.startswith("event: done"):
            for line in chunk.split("\n"):
                if line.startswith("data:"):
                    done_payload = json.loads(line[5:].strip())
    assert done_payload is not None
    assert "messageId" in done_payload
    assert done_payload["tokenCount"] > 0


@pytest.mark.asyncio
async def test_defensive_action_confirmation_and_policy(client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
    # 1. Rejection test
    reject_resp = await client.post(
        "/api/v1/chat/actions/confirm",
        json={
            "actionProposalId": "ACT-PROP-001",
            "confirmed": False,
            "actionName": "block_ip",
            "target": "203.0.113.5",
            "playbookId": "pb-ssh-containment"
        },
        headers=auth_headers
    )
    assert reject_resp.status_code == 200
    assert reject_resp.json()["status"] == "REJECTED_BY_USER"

    # 2. Protected Subnet Blocking test (127.0.0.1 or 10.240.0.1)
    protected_resp = await client.post(
        "/api/v1/chat/actions/confirm",
        json={
            "actionProposalId": "ACT-PROP-002",
            "confirmed": True,
            "actionName": "block_ip",
            "target": "127.0.0.1",
            "playbookId": "pb-ssh-containment"
        },
        headers=auth_headers
    )
    # PolicyEngine must reject protected address
    assert protected_resp.status_code == 400
    assert "protected" in protected_resp.text.lower() or "blocked" in protected_resp.text.lower()


@pytest.mark.asyncio
async def test_cross_user_isolation(client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
    # User 1 creates conversation
    create_resp = await client.post(
        "/api/v1/chat/conversations",
        json={"title": "Private Analyst Chat"},
        headers=auth_headers
    )
    conv_id = create_resp.json()["id"]

    # Create User 2
    user2 = User(
        id="USR-COPILOT-02",
        username="junior_analyst@sentinel.ai",
        full_name="Junior Analyst",
        hashed_password=get_password_hash("pass_123!"),
        role="analyst",
        is_active=True
    )
    db_session.add(user2)
    await db_session.commit()

    token2 = create_access_token(data={"sub": user2.username, "user_id": user2.id, "role": user2.role})
    headers2 = {"Authorization": f"Bearer {token2}"}

    # User 2 attempts to get User 1's conversation
    get_resp = await client.get(f"/api/v1/chat/conversations/{conv_id}", headers=headers2)
    assert get_resp.status_code == 403

    # User 2 attempts to delete User 1's conversation
    del_resp = await client.delete(f"/api/v1/chat/conversations/{conv_id}", headers=headers2)
    assert del_resp.status_code == 403
