import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.user import User
from backend.app.core.security import get_password_hash


@pytest.fixture
async def seed_user(db_session: AsyncSession):
    user = User(
        id="USR-001",
        username="secops_analyst@sentinel.ai",
        full_name="SecOps Lead Analyst",
        hashed_password=get_password_hash("sentinel_secops_2026!"),
        role="admin",
        is_active=True
    )
    db_session.add(user)
    await db_session.commit()
    return user


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, seed_user: User):
    response = await client.post("/api/v1/auth/login", json={
        "username": "secops_analyst@sentinel.ai",
        "password": "sentinel_secops_2026!"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == "secops_analyst@sentinel.ai"
    assert data["user"]["role"] == "admin"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, seed_user: User):
    response = await client.post("/api/v1/auth/login", json={
        "username": "secops_analyst@sentinel.ai",
        "password": "wrong_password_attempt"
    })
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "INVALID_CREDENTIALS"


@pytest.mark.asyncio
async def test_login_unknown_user(client: AsyncClient, db_session: AsyncSession):
    response = await client.post("/api/v1/auth/login", json={
        "username": "ghost@sentinel.ai",
        "password": "any_password"
    })
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "INVALID_CREDENTIALS"


@pytest.mark.asyncio
async def test_auth_me_with_valid_token(client: AsyncClient, seed_user: User):
    login_res = await client.post("/api/v1/auth/login", json={
        "username": "secops_analyst@sentinel.ai",
        "password": "sentinel_secops_2026!"
    })
    token = login_res.json()["access_token"]

    response = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "secops_analyst@sentinel.ai"
    assert data["fullName"] == "SecOps Lead Analyst"


@pytest.mark.asyncio
async def test_auth_me_missing_token(client: AsyncClient):
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "UNAUTHENTICATED"


@pytest.mark.asyncio
async def test_auth_me_invalid_token(client: AsyncClient):
    response = await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid.fake.token"})
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "INVALID_TOKEN"
