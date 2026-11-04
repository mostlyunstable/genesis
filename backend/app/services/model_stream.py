"""Keep the HTTP stream alive while a self-hosted model loads or queues."""
import asyncio
from contextlib import suppress


async def model_lines(response, heartbeat_seconds=10):
    lines = response.aiter_lines().__aiter__()
    pending = asyncio.create_task(anext(lines))
    try:
        while True:
            ready, _ = await asyncio.wait({pending}, timeout=heartbeat_seconds)
            if not ready:
                yield None
                continue
            try:
                line = pending.result()
            except StopAsyncIteration:
                return
            pending = asyncio.create_task(anext(lines))
            yield line
    finally:
        pending.cancel()
        with suppress(asyncio.CancelledError, Exception):
            await pending
