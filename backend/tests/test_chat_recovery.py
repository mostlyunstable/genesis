import json

import httpx
import pytest
from sqlalchemy import select

from backend.app.models.chat import ChatMessageModel
from backend.app.services.chat import ChatCopilotService


def mock_generation(monkeypatch):
    requests = []
    def respond(request):
        payload = json.loads(request.content)
        requests.append(payload)
        reply = f"Generated reply {len(requests)}."
        return httpx.Response(200, text=json.dumps({"message": {"content": reply}, "done": True}) + "\n")
    original = httpx.AsyncClient
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kwargs: original(transport=httpx.MockTransport(respond), **kwargs))
    return requests


@pytest.mark.asyncio
async def test_retry_replaces_selected_reply_without_duplicate_turns(db_session, monkeypatch):
    requests = mock_generation(monkeypatch)
    service = ChatCopilotService()
    conv = await service.get_or_create_conversation(None, db_session)
    for prompt in ("First question", "Second question"):
        _ = [chunk async for chunk in service.process_message_stream(conv, prompt, db_session)]
    messages = list(await db_session.scalars(select(ChatMessageModel).order_by(ChatMessageModel.created_at)))
    target = messages[1]
    assert target.content == "Generated reply 1."
    _ = [chunk async for chunk in service.process_message_stream(
        conv, "ignored client question", db_session, retry_message_id=target.id)]
    await db_session.refresh(target)
    assert target.content == "Generated reply 3."
    assert any(v.get("content") == "Generated reply 1." for v in target.tool_calls)
    assert requests[-1]["messages"][-1]["content"] == "First question"
    saved = list(await db_session.scalars(select(ChatMessageModel)))
    assert len(saved) == 4
    assert saved[-1].content == "Generated reply 2."


@pytest.mark.asyncio
async def test_stopped_reply_survives_conversation_reload(client, auth_headers, db_session, monkeypatch):
    mock_generation(monkeypatch)
    service = ChatCopilotService()
    conv = await service.get_or_create_conversation(None, db_session, user_id="USR-CONFTEST-01")
    generation = service.process_message_stream(conv, "Explain SSH", db_session)
    handshake = await anext(generation)
    data = json.loads(handshake.split("data: ")[1])
    response = await client.post(
        f"/api/v1/chat/conversations/{conv.id}/messages/{data['assistantMessageId']}/stop",
        headers=auth_headers, json={"content": "Partial generated explanation"},
    )
    assert response.status_code == 200
    await generation.aclose()
    detail = await client.get(f"/api/v1/chat/conversations/{conv.id}", headers=auth_headers)
    assert detail.status_code == 200
    stopped = next(m for m in detail.json()["messages"] if m["role"] == "assistant")
    assert "Partial generated explanation" in stopped["content"]
    assert stopped["thoughtProcess"] == "interrupted"


@pytest.mark.asyncio
async def test_retry_cannot_read_another_conversation(db_session, monkeypatch):
    mock_generation(monkeypatch)
    service = ChatCopilotService()
    first = await service.get_or_create_conversation(None, db_session)
    _ = [chunk async for chunk in service.process_message_stream(first, "Private question", db_session)]
    reply = await db_session.scalar(select(ChatMessageModel).where(ChatMessageModel.role == "assistant"))
    other = await service.get_or_create_conversation(None, db_session)
    chunks = [chunk async for chunk in service.process_message_stream(
        other, "Another question", db_session, retry_message_id=reply.id)]
    assert "event: error" in chunks[0]
