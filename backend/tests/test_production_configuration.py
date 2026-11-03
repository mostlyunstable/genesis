import pytest
from pydantic import ValidationError
from sqlalchemy import select

from backend.app.core.config import Settings, settings
from backend.app.core.security import get_password_hash
from backend.app.models.user import User


def test_production_requires_unique_secrets():
    with pytest.raises(ValidationError):
        Settings(_env_file=None, DEMO_MODE=False, JWT_SECRET="sentinel_default", FORWARDER_API_KEY="sentinel_default")
    config = Settings(_env_file=None, DEMO_MODE=False, JWT_SECRET="a"*40, FORWARDER_API_KEY="b"*32)
    assert not config.DEMO_MODE


@pytest.mark.asyncio
async def test_production_disables_default_accounts(db_session, monkeypatch):
    from backend.app.db import init_db as initializer
    from sqlalchemy.ext.asyncio import async_sessionmaker
    db_session.add(User(id="legacy", username="secops_analyst@genesis.ai", full_name="Demo",
                        hashed_password=get_password_hash("genesis_secops_2026!"), role="admin", is_active=True))
    await db_session.commit()
    monkeypatch.setattr(settings, "DEMO_MODE", False)
    monkeypatch.setattr(initializer, "engine", db_session.bind)
    monkeypatch.setattr(initializer, "async_session_factory", async_sessionmaker(db_session.bind, expire_on_commit=False))
    await initializer.init_db()
    db_session.expire_all()
    user = await db_session.scalar(select(User).where(User.id == "legacy"))
    assert not user.is_active
    assert await db_session.scalar(select(User).where(User.username == "secops_analyst@sentinel.ai")) is None


@pytest.mark.asyncio
@pytest.mark.parametrize("path", ["/events", "/incidents", "/audit", "/stream/events", "/response/playbooks"])
async def test_production_telemetry_requires_sign_in(client, monkeypatch, path):
    monkeypatch.setattr(settings, "DEMO_MODE", False)
    response = await client.get("/api/v1" + path)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_production_allows_authenticated_telemetry_and_forwarder(client, auth_headers, monkeypatch):
    monkeypatch.setattr(settings, "DEMO_MODE", False)
    response = await client.get("/api/v1/events", headers=auth_headers)
    assert response.status_code == 200
    ingested = await client.post("/api/v1/ingest/batch",
        headers={"X-Sentinel-Forwarder-Key": settings.FORWARDER_API_KEY},
        json={"source": "linux_ssh", "logs": [{
            "raw": "sshd[101]: Failed password for root from 192.0.2.40 port 12345 ssh2"
        }]})
    assert ingested.status_code == 202
