from fastapi import APIRouter, Request, Depends
from fastapi.responses import StreamingResponse
from typing import Dict, Any
from pydantic import BaseModel, Field

from backend.app.api.deps import verify_forwarder_auth
from backend.app.services.stream import stream_broadcaster

router = APIRouter(prefix="/stream", tags=["Real-Time Event Streaming"])


class BroadcastEventRequest(BaseModel):
    eventType: str = Field(pattern=r"^[^\r\n]+$")
    data: Dict[str, Any]


@router.get("/events")
async def stream_security_events(request: Request):
    """
    Server-Sent Events (SSE) streaming endpoint.
    Streams real-time telemetry events, detection alerts, incident lifecycle updates,
    and periodic keep-alive heartbeats.
    """
    queue = stream_broadcaster.register_listener()
    return StreamingResponse(
        stream_broadcaster.event_generator(queue),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/broadcast", dependencies=[Depends(verify_forwarder_auth)])
async def broadcast_event(payload: BroadcastEventRequest):
    """Broadcast an event to all connected SSE clients (used by internal pipelines)."""
    await stream_broadcaster.broadcast(payload.eventType, payload.data)
    return {"status": "BROADCASTED", "eventType": payload.eventType}
