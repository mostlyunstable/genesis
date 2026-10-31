import asyncio
import json
import time
from datetime import datetime, timezone
from typing import Dict, Any, Set, AsyncGenerator


class StreamBroadcaster:
    """
    In-memory Pub/Sub broadcaster for real-time Server-Sent Events (SSE).
    Distributes telemetry events, detection alerts, incident transitions, and response actions.
    """
    def __init__(self):
        self._listeners: Set[asyncio.Queue] = set()

    def register_listener(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=100)
        self._listeners.add(q)
        return q

    def remove_listener(self, q: asyncio.Queue):
        self._listeners.discard(q)

    async def broadcast(self, event_type: str, data: Dict[str, Any]):
        """Broadcast an event to all connected SSE clients."""
        payload = {
            "type": event_type,
            "data": data,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        dead_queues = set()
        for q in self._listeners:
            try:
                q.put_nowait(payload)
            except asyncio.QueueFull:
                dead_queues.add(q)
            except Exception:
                dead_queues.add(q)

        for dq in dead_queues:
            self._listeners.discard(dq)

    async def event_generator(self, queue: asyncio.Queue) -> AsyncGenerator[str, None]:
        """
        Yields Server-Sent Events formatting compliant with the W3C EventSource spec:
        event: <event_name>\n
        data: <json_payload>\n\n
        """
        # Initial connection event
        handshake = {
            "status": "CONNECTED",
            "serverTime": datetime.now(timezone.utc).isoformat(),
            "clientCount": len(self._listeners)
        }
        yield f"event: handshake\ndata: {json.dumps(handshake)}\n\n"

        try:
            while True:
                try:
                    # Wait up to 15 seconds for incoming broadcast or send keep-alive heartbeat
                    msg = await asyncio.wait_for(queue.get(), timeout=15.0)
                    evt_type = msg.get("type", "message")
                    evt_data = json.dumps(msg.get("data", {}))
                    yield f"event: {evt_type}\ndata: {evt_data}\n\n"
                    queue.task_done()
                except asyncio.TimeoutError:
                    # Keep-alive heartbeat
                    heartbeat = {"ping": int(time.time()), "iso": datetime.now(timezone.utc).isoformat()}
                    yield f"event: heartbeat\ndata: {json.dumps(heartbeat)}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            self.remove_listener(queue)


stream_broadcaster = StreamBroadcaster()
