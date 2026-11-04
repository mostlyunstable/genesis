import asyncio
import stat

import pytest

from backend.app.services.model_stream import model_lines
from scripts.prepare_cloud_env import cloud_values, write_environment


@pytest.mark.asyncio
async def test_heartbeat_preserves_pending_model_read():
    ready = asyncio.Event()
    class SlowModel:
        async def aiter_lines(self):
            await ready.wait()
            yield '{"message":{"content":"Hello"}}'

    stream = model_lines(SlowModel(), heartbeat_seconds=0.001)
    assert await anext(stream) is None
    ready.set()
    assert await anext(stream) == '{"message":{"content":"Hello"}}'
    with pytest.raises(StopAsyncIteration):
        await anext(stream)


@pytest.mark.asyncio
async def test_closing_stream_cancels_pending_model_read():
    closed = asyncio.Event()
    class SlowModel:
        async def aiter_lines(self):
            try:
                await asyncio.Event().wait()
                yield ""
            finally:
                closed.set()

    stream = model_lines(SlowModel(), heartbeat_seconds=0.001)
    assert await anext(stream) is None
    await stream.aclose()
    assert closed.is_set()


def test_cloud_secrets_are_private_independent_and_not_overwritten(tmp_path):
    values = cloud_values("api.genesis.host", "https://genesis.vercel.app/")
    assert values["CORS_ORIGINS"] == '["https://genesis.vercel.app"]'
    assert len({values["POSTGRES_PASSWORD"], values["JWT_SECRET"], values["FORWARDER_API_KEY"]}) == 3
    destination = tmp_path / ".env.cloud"
    write_environment(destination, values)
    assert stat.S_IMODE(destination.stat().st_mode) == 0o600
    original = destination.read_text()
    with pytest.raises(FileExistsError):
        write_environment(destination, cloud_values("another.genesis.host", "https://other.vercel.app"))
    assert destination.read_text() == original


@pytest.mark.parametrize("domain,origin", [
    ("https://api.genesis.host", "https://genesis.vercel.app"),
    ("api.genesis.host { injected }", "https://genesis.vercel.app"),
    ("api.genesis.host", "http://genesis.vercel.app"),
    ("api.genesis.host", "https://genesis.vercel.app/copilot"),
    ("api.genesis.host", "https://user:password@genesis.vercel.app"),
])
def test_cloud_configuration_rejects_invalid_inputs(domain, origin):
    with pytest.raises(ValueError):
        cloud_values(domain, origin)
