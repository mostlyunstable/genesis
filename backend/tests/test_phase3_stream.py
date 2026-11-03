import asyncio
import json
import pytest
from httpx import AsyncClient
from backend.app.services.stream import stream_broadcaster
from backend.app.core.config import settings


@pytest.mark.asyncio
async def test_stream_broadcaster_event_generation_and_fanout():
    """Verify that stream broadcaster fans out events across registered listeners with valid SSE format."""
    q1 = stream_broadcaster.register_listener()
    q2 = stream_broadcaster.register_listener()

    gen1 = stream_broadcaster.event_generator(q1)
    gen2 = stream_broadcaster.event_generator(q2)

    # 1. Verify Handshakes
    handshake1 = await anext(gen1)
    handshake2 = await anext(gen2)

    assert "event: handshake" in handshake1
    assert "event: handshake" in handshake2
    assert "CONNECTED" in handshake1

    # 2. Broadcast a detection alert
    await stream_broadcaster.broadcast(
        "detection_alert",
        {
            "detectionId": "DET-2026-LIVE-99",
            "name": "Coordinated Multi-IP Target Probing",
            "severity": "critical"
        }
    )

    evt1 = await anext(gen1)
    evt2 = await anext(gen2)

    assert "event: detection_alert" in evt1
    assert "event: detection_alert" in evt2
    assert "DET-2026-LIVE-99" in evt1
    assert "DET-2026-LIVE-99" in evt2

    # 3. Cleanup
    stream_broadcaster.remove_listener(q1)
    stream_broadcaster.remove_listener(q2)


@pytest.mark.asyncio
async def test_stream_broadcast_api_endpoint(client: AsyncClient):
    """Verify POST /api/v1/stream/broadcast routes to registered listeners."""
    q = stream_broadcaster.register_listener()
    gen = stream_broadcaster.event_generator(q)
    _ = await anext(gen)  # consume handshake

    res = await client.post(
        "/api/v1/stream/broadcast",
        headers={"X-Sentinel-Forwarder-Key": settings.FORWARDER_API_KEY},
        json={"eventType": "incident_update", "data": {"incidentId": "INC-01", "status": "contained"}}
    )
    assert res.status_code == 200
    assert res.json()["status"] == "BROADCASTED"

    streamed_msg = await anext(gen)
    assert "event: incident_update" in streamed_msg
    assert "INC-01" in streamed_msg
    assert "contained" in streamed_msg

    stream_broadcaster.remove_listener(q)


def test_sse_endpoint_route_registered():
    """Verify that /stream router is registered on api_router."""
    from backend.app.api.v1.router import api_router
    prefixes = [r.original_router.prefix for r in api_router.routes if hasattr(r, "original_router")]
    assert "/stream" in prefixes

@pytest.mark.asyncio
async def test_broadcast_rejects_anonymous_publish(client):
    response = await client.post("/api/v1/stream/broadcast", json={"eventType": "alert", "data": {}})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_broadcast_rejects_injected_sse_fields(client, auth_headers):
    response = await client.post(
        "/api/v1/stream/broadcast",
        headers=auth_headers,
        json={"eventType": "alert\ndata: forged", "data": {}},
    )
    assert response.status_code == 422
