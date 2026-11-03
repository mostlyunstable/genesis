import json
from unittest.mock import AsyncMock

import httpx
import pytest

from backend.app.core.config import settings
from backend.app.services.chat_generation import generate_chat_reply


@pytest.mark.asyncio
@pytest.mark.parametrize("response_data,expected_provider", [
    ({"candidates": [{"finishReason": "STOP", "content": {"parts": [{"text": "Observed failed SSH logins."}]}}]}, "gemini"),
    ({"candidates": []}, "local_fallback"),
    ({"candidates": [{"finishReason": "SAFETY"}]}, "local_fallback"),
])
async def test_generation_and_invalid_provider_output(monkeypatch, response_data, expected_provider):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "test-key")
    post = AsyncMock(return_value=httpx.Response(200, json=response_data, request=httpx.Request("POST", "https://example.com")))
    monkeypatch.setattr(httpx.AsyncClient, "post", post)
    reply, provider = await generate_chat_reply("Analyze logs", "Local findings", [{"failures": 12}])
    assert provider.startswith(expected_provider)
    assert reply == ("Observed failed SSH logins." if expected_provider == "gemini" else "Local findings")
    request = post.call_args.kwargs
    assert request["headers"]["x-goog-api-key"] == "test-key"
    assert json.loads(request["json"]["contents"][0]["parts"][0]["text"])["tool_evidence"]


@pytest.mark.asyncio
async def test_provider_timeout_preserves_findings(monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(httpx.AsyncClient, "post", AsyncMock(side_effect=httpx.ReadTimeout("timeout")))
    assert await generate_chat_reply("Analyze", "Findings", []) == ("Findings", "local_fallback")


@pytest.mark.asyncio
async def test_no_key_uses_local_findings(monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", None)
    assert await generate_chat_reply("Analyze", "Findings", []) == ("Findings", "local")
