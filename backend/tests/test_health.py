import pytest
from httpx import AsyncClient
from unittest.mock import patch


@pytest.mark.asyncio
async def test_health_check_root(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "HEALTHY"
    assert "version" in data
    assert data["service"] == "SENTINEL AI Backend"
    assert data["dependencies"]["database"]["status"] == "CONNECTED"
    assert data["dependencies"]["queueWorker"]["status"] == "ONLINE"


@pytest.mark.asyncio
async def test_health_check_v1(client: AsyncClient):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "HEALTHY"
    assert data["dependencies"]["database"]["status"] == "CONNECTED"


@pytest.mark.asyncio
async def test_health_check_detects_db_outage(client: AsyncClient):
    # Simulate database failure during health check
    with patch("backend.app.main.async_session_factory", side_effect=RuntimeError("Database connection timed out")):
        response = await client.get("/health")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "UNHEALTHY"
        assert data["dependencies"]["database"]["status"] == "DISCONNECTED"
