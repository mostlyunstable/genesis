import json

import httpx
import pytest
from sqlalchemy import select

from backend.app.models.chat import ChatMessageModel
from backend.app.services.chat import ChatCopilotService
from backend.app.services.local_chat import analyze_inline_logs


def test_inline_log_evidence_is_separate_and_counts_successes():
    evidence = analyze_inline_logs(
        "Analyze this:\n"
        "sshd[1]: Failed password for root from 192.0.2.123 port 22 ssh2\n"
        "sshd[2]: Failed password for root from 192.0.2.123 port 23 ssh2\n"
        "sshd[3]: Accepted password for alice from 192.0.2.124 port 24 ssh2"
    )
    assert evidence["failures"] == 2
    assert evidence["successes"] == 1
    assert evidence["failuresByIp"] == {"192.0.2.123": 2}
    assert evidence["successesByIp"] == {"192.0.2.124": 1}


@pytest.mark.asyncio
async def test_generated_reply_uses_history_and_is_persisted(db_session, monkeypatch):
    requests = []
    def respond(request):
        payload = json.loads(request.content)
        requests.append(payload)
        return httpx.Response(200, text=json.dumps({"message": {"content": "A fresh generated answer."}, "done": True})+"\n")
    original = httpx.AsyncClient
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kwargs: original(transport=httpx.MockTransport(respond), **kwargs))
    service = ChatCopilotService()
    conv = await service.get_or_create_conversation(None, db_session)
    for prompt in ("Hello", "Explain your previous answer in one sentence"):
        chunks = [chunk async for chunk in service.process_message_stream(conv, prompt, db_session)]
        assert any("A fresh generated answer." in c for c in chunks)
        assert any("event: done" in c for c in chunks)
        assert not any("event: actions" in c for c in chunks)
    history = requests[1]["messages"]
    assert any(m["role"] == "assistant" and m["content"] == "A fresh generated answer." for m in history)
    stored = list(await db_session.scalars(select(ChatMessageModel).where(ChatMessageModel.role == "assistant")))
    assert len(stored) == 2
    assert all(not m.suggested_actions for m in stored)


@pytest.mark.asyncio
async def test_model_outage_emits_error_instead_of_saved_response(db_session, monkeypatch):
    def respond(request):
        return httpx.Response(503, text="unavailable")
    original = httpx.AsyncClient
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kwargs: original(transport=httpx.MockTransport(respond), **kwargs))
    service = ChatCopilotService()
    conv = await service.get_or_create_conversation(None, db_session)
    chunks = [chunk async for chunk in service.process_message_stream(conv, "Hello", db_session)]
    assert any("event: error" in c for c in chunks)
    assert not any("event: token" in c for c in chunks)
    failed = list(await db_session.scalars(select(ChatMessageModel).where(ChatMessageModel.role == "assistant")))
    assert len(failed) == 1
    assert failed[0].thought_process == "failed"
    assert "Generation failed" in failed[0].content


@pytest.mark.asyncio
async def test_model_cannot_execute_countermeasures(db_session, monkeypatch):
    calls = []
    def respond(request):
        payload = json.loads(request.content)
        calls.append(payload)
        if len(calls) == 1:
            message = {"tool_calls": [{"function": {"name": "execute_action", "arguments": {}}}]}
        else:
            assert payload["messages"][-1]["role"] == "tool"
            assert "ERROR" in payload["messages"][-1]["content"]
            message = {"content": "I cannot execute firewall changes."}
        return httpx.Response(200, text=json.dumps({"message": message, "done": True})+"\n")
    original = httpx.AsyncClient
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kwargs: original(transport=httpx.MockTransport(respond), **kwargs))
    service = ChatCopilotService()
    conv = await service.get_or_create_conversation(None, db_session)
    chunks = [chunk async for chunk in service.process_message_stream(conv, "Investigate an IP", db_session)]
    assert len(calls) == 2
    assert any("event: done" in c for c in chunks)
    assert not any("event: actions" in c for c in chunks)


@pytest.mark.asyncio
async def test_model_reads_real_database_through_validated_tool(db_session, monkeypatch):
    requests = []
    def respond(request):
        payload = json.loads(request.content)
        requests.append(payload)
        if len(requests) == 1:
            message = {"tool_calls": [{"function": {
                "name": "investigate_ip_address", "arguments": {"ip": "192.0.2.200"}}}]}
        else:
            result = json.loads(payload["messages"][-1]["content"])
            assert result["totalObservedEvents"] == 0
            message = {"content": "No events were recorded for that IP."}
        return httpx.Response(200, text=json.dumps({"message": message, "done": True})+"\n")
    original = httpx.AsyncClient
    monkeypatch.setattr(httpx, "AsyncClient", lambda **kwargs: original(transport=httpx.MockTransport(respond), **kwargs))
    service = ChatCopilotService()
    conv = await service.get_or_create_conversation(None, db_session)
    chunks = [chunk async for chunk in service.process_message_stream(conv, "Investigate 192.0.2.200", db_session)]
    assert any("No events were recorded" in c for c in chunks)
    assert not any("event: actions" in c for c in chunks)


def test_pasted_burst_duration_is_computed_from_all_lines():
    lines = [f"Nov 3 11:00:{i*2:02d} host sshd[{i}]: Failed password for root from 198.51.100.90 port 22 ssh2" for i in range(12)]
    evidence = analyze_inline_logs("\n".join(lines))
    assert evidence["failures"] == 12
    assert evidence["timeSpanSeconds"] == 22
    assert evidence["lastTimestamp"] == "Nov 03 11:00:22"
