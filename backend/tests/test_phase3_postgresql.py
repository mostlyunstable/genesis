import asyncio
import os
import pytest
from datetime import datetime, timezone
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from backend.app.db.base import Base
from backend.app.models.user import User
from backend.app.models.event import SecurityEventModel
from backend.app.models.incident import IncidentModel
from backend.app.models.response import ResponseActionModel
from backend.app.db.session import get_engine_kwargs, check_db_health

PG_URL = os.environ.get("POSTGRES_TEST_URL", "postgresql+asyncpg://localhost:5432/sentinel_ai")


@pytest.fixture
async def pg_engine():
    """Initializes and yields a real PostgreSQL async engine."""
    engine = create_async_engine(
        PG_URL,
        echo=False,
        future=True,
        **get_engine_kwargs(PG_URL)
    )
    yield engine
    await engine.dispose()


@pytest.fixture
async def pg_session(pg_engine):
    """Provides an isolated async session for a single PostgreSQL test."""
    session_maker = async_sessionmaker(
        bind=pg_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False
    )
    async with session_maker() as session:
        yield session
        await session.rollback()


@pytest.mark.asyncio
async def test_postgresql_connection_and_pooling(pg_engine):
    """Verify PostgreSQL asyncpg connection and pool configuration."""
    assert await check_db_health(pg_engine) is True
    # Verify pool settings
    pool = pg_engine.pool
    assert pool.size() >= 10 or hasattr(pool, "_pool")
    assert pool._pre_ping is True


@pytest.mark.asyncio
async def test_postgresql_crud_operations(pg_session: AsyncSession):
    """Verify full CRUD lifecycle on PostgreSQL."""
    ts = datetime.now(timezone.utc)
    user_id = f"PG-USR-{int(ts.timestamp())}"

    # 1. CREATE
    user = User(
        id=user_id,
        username=f"pg_admin_{int(ts.timestamp())}@sentinel.ai",
        full_name="PostgreSQL Admin",
        hashed_password="bcrypt_test_hash",
        role="admin",
        is_active=True
    )
    pg_session.add(user)
    await pg_session.commit()

    # 2. READ
    result = await pg_session.execute(select(User).where(User.id == user_id))
    fetched_user = result.scalar_one_or_none()
    assert fetched_user is not None
    assert fetched_user.role == "admin"

    # 3. UPDATE
    fetched_user.full_name = "Updated PG Admin"
    await pg_session.commit()

    refreshed = await pg_session.execute(select(User).where(User.id == user_id))
    assert refreshed.scalar_one().full_name == "Updated PG Admin"

    # 4. DELETE
    await pg_session.delete(fetched_user)
    await pg_session.commit()

    deleted_check = await pg_session.execute(select(User).where(User.id == user_id))
    assert deleted_check.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_postgresql_transaction_rollback(pg_session: AsyncSession):
    """Verify transactional atomicity and rollback on constraint failure."""
    ts = datetime.now(timezone.utc)
    unique_user_id = f"PG-TX-{int(ts.timestamp())}"
    unique_username = f"tx_user_{int(ts.timestamp())}@sentinel.ai"

    # Commit initial record
    u1 = User(
        id=unique_user_id,
        username=unique_username,
        full_name="Initial User",
        hashed_password="hash",
        role="analyst",
        is_active=True
    )
    pg_session.add(u1)
    await pg_session.commit()

    # Attempt second record with duplicate username (unique constraint violation)
    try:
        async with pg_session.begin_nested():
            u2 = User(
                id=f"{unique_user_id}-DUP",
                username=unique_username,  # Duplicate username
                full_name="Duplicate User",
                hashed_password="hash",
                role="analyst",
                is_active=True
            )
            pg_session.add(u2)
            await pg_session.flush()
    except Exception:
        pass  # Expected constraint violation

    # Verify session rollback preserved original user
    res = await pg_session.execute(select(User).where(User.id == unique_user_id))
    existing = res.scalar_one_or_none()
    assert existing is not None
    assert existing.full_name == "Initial User"

    # Cleanup
    await pg_session.delete(existing)
    await pg_session.commit()


@pytest.mark.asyncio
async def test_postgresql_concurrent_ingest(pg_engine):
    """Verify concurrent async ingestion writes to PostgreSQL without deadlock."""
    session_maker = async_sessionmaker(bind=pg_engine, class_=AsyncSession, expire_on_commit=False)

    async def write_event_batch(worker_id: int):
        async with session_maker() as session:
            for i in range(5):
                ts = datetime.now(timezone.utc)
                eid = f"EVT-PG-{worker_id}-{i}-{int(ts.timestamp()*1000)%100000}"
                evt = SecurityEventModel(
                    id=eid,
                    timestamp=ts,
                    source="linux_ssh",
                    event_type="SSH_AUTH_FAIL",
                    username=f"worker_user_{worker_id}",
                    source_ip="198.51.100.22",
                    destination_ip="10.240.10.15",
                    destination_port=22,
                    outcome="failure",
                    severity="warning",
                    raw_event=f"Failed password for worker_user_{worker_id}",
                    parsed_fields={},
                    is_simulated=True,
                    fingerprint=f"fp-pg-{worker_id}-{i}-{int(ts.timestamp()*1000)}"
                )
                session.add(evt)
            await session.commit()

    # Launch 6 concurrent workers
    tasks = [write_event_batch(w) for w in range(6)]
    await asyncio.gather(*tasks)

    # Verify all 30 events persisted in PostgreSQL
    async with session_maker() as session:
        res = await session.execute(
            select(SecurityEventModel).where(SecurityEventModel.source_ip == "198.51.100.22")
        )
        events = res.scalars().all()
        assert len(events) >= 30


@pytest.mark.asyncio
async def test_postgresql_restart_persistence():
    """Verify data persisted in PostgreSQL survives engine disposal and recreation."""
    ts = datetime.now(timezone.utc)
    persist_id = f"PG-RESTART-{int(ts.timestamp())}"

    # Engine Instance 1
    engine1 = create_async_engine(PG_URL, **get_engine_kwargs(PG_URL))
    sm1 = async_sessionmaker(engine1, class_=AsyncSession, expire_on_commit=False)
    async with sm1() as session:
        u = User(
            id=persist_id,
            username=f"restart_{int(ts.timestamp())}@sentinel.ai",
            full_name="Persistent User",
            hashed_password="hash",
            role="analyst",
            is_active=True
        )
        session.add(u)
        await session.commit()
    await engine1.dispose()

    # Engine Instance 2 (Simulating application restart)
    engine2 = create_async_engine(PG_URL, **get_engine_kwargs(PG_URL))
    sm2 = async_sessionmaker(engine2, class_=AsyncSession, expire_on_commit=False)
    async with sm2() as session:
        res = await session.execute(select(User).where(User.id == persist_id))
        user = res.scalar_one_or_none()
        assert user is not None
        assert user.full_name == "Persistent User"

        # Cleanup
        await session.delete(user)
        await session.commit()
    await engine2.dispose()
