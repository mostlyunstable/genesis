import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from backend.app.core.config import settings
from backend.app.db.base import Base
from backend.app.db.session import get_db
from backend.app.main import app

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DB_URL, echo=False)
test_session_factory = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)


@pytest_asyncio.fixture
async def test_db_setup():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session(test_db_setup):
    async with test_session_factory() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient, db_session: AsyncSession):
    from backend.app.models.user import User
    from backend.app.core.security import get_password_hash
    user = User(
        id="USR-CONFTEST-01",
        username="lead_analyst@sentinel.ai",
        full_name="Lead Analyst",
        hashed_password=get_password_hash("test_pwd_2026!"),
        role="analyst",
        is_active=True
    )
    db_session.add(user)
    await db_session.commit()

    login = await client.post("/api/v1/auth/login", json={
        "username": "lead_analyst@sentinel.ai",
        "password": "test_pwd_2026!"
    })
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
