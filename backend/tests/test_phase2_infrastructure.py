import asyncio
import os
import subprocess
import tempfile
import pytest
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from backend.app.db.base import Base
from backend.app.models.user import User
from backend.app.models.event import SecurityEventModel
from backend.app.services.queue import BackgroundJobWorker, BackgroundJob


@pytest.mark.asyncio
async def test_sqlite_persistence_across_restart():
    """Verify data persists after engine disconnect and reconnect using a temporary SQLite DB file."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path = tmp.name

    db_url = f"sqlite+aiosqlite:///{db_path}"
    try:
        # Phase 1: Initialize DB, create schema and write a test user
        engine1 = create_async_engine(db_url, echo=False)
        async with engine1.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        session_maker1 = async_sessionmaker(engine1, expire_on_commit=False, class_=AsyncSession)
        async with session_maker1() as session:
            test_user = User(
                id="PERSIST-001",
                username="persist_check@sentinel.ai",
                full_name="Persistence Tester",
                hashed_password="hash",
                role="analyst",
                is_active=True
            )
            session.add(test_user)
            await session.commit()

        await engine1.dispose()

        # Phase 2: Open a fresh connection/engine to simulate application restart
        engine2 = create_async_engine(db_url, echo=False)
        session_maker2 = async_sessionmaker(engine2, expire_on_commit=False, class_=AsyncSession)
        async with session_maker2() as session:
            result = await session.execute(select(User).where(User.id == "PERSIST-001"))
            persisted = result.scalar_one_or_none()
            assert persisted is not None
            assert persisted.username == "persist_check@sentinel.ai"
            assert persisted.role == "analyst"

        await engine2.dispose()
    finally:
        if os.path.exists(db_path):
            os.remove(db_path)


@pytest.mark.asyncio
async def test_database_transaction_rollback_integrity():
    """Verify that an exception causes rollback and preserves clean database state."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path = tmp.name

    db_url = f"sqlite+aiosqlite:///{db_path}"
    try:
        engine = create_async_engine(db_url, echo=False)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        session_maker = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
        
        # 1. Commit a valid record
        async with session_maker() as session:
            clean_user = User(
                id="ROLLBACK-CLEAN",
                username="rollback_clean@sentinel.ai",
                full_name="Rollback Clean",
                hashed_password="hash",
                role="analyst",
                is_active=True
            )
            session.add(clean_user)
            await session.commit()

        # 2. Attempt failed transaction with duplicate primary key
        async with session_maker() as session:
            try:
                dup_user = User(
                    id="ROLLBACK-CLEAN",  # Duplicate PK
                    username="duplicate@sentinel.ai",
                    full_name="Duplicate",
                    hashed_password="hash",
                    role="analyst",
                    is_active=True
                )
                session.add(dup_user)
                await session.commit()
            except Exception:
                await session.rollback()

        # 3. Verify clean state is intact
        async with session_maker() as session:
            res = await session.execute(select(User).where(User.id == "ROLLBACK-CLEAN"))
            user = res.scalar_one_or_none()
            assert user is not None
            assert user.username == "rollback_clean@sentinel.ai"

        await engine.dispose()
    finally:
        if os.path.exists(db_path):
            os.remove(db_path)


def test_alembic_offline_postgresql_sql_generation():
    """Verify Alembic can generate clean DDL offline without running an external server."""
    result = subprocess.run(
        ["backend/.venv/bin/alembic", "-c", "backend/alembic.ini", "upgrade", "head", "--sql"],
        cwd="/Users/mayankkumar/genysis",
        capture_output=True,
        text=True
    )
    assert result.returncode == 0, f"Alembic SQL generation failed: {result.stderr}"
    sql_output = result.stdout
    # Verify standard tables are generated
    assert "CREATE TABLE users" in sql_output or "users" in sql_output
    assert "security_events" in sql_output
    assert "incidents" in sql_output
    assert "response_actions" in sql_output
    assert "audit_records" in sql_output


@pytest.mark.asyncio
async def test_background_worker_queue_execution():
    """Verify that BackgroundJobWorker consumes, executes, and records latency for real queued jobs."""
    worker = BackgroundJobWorker()
    completed_jobs = []

    async def sample_handler(job: BackgroundJob):
        await asyncio.sleep(0.01)  # 10ms synthetic workload
        completed_jobs.append(job.payload["task"])

    worker.register_handler("TEST_TASK", sample_handler)
    await worker.start()

    try:
        # Enqueue 3 jobs
        job_ids = []
        for i in range(3):
            jid = await worker.enqueue("TEST_TASK", {"task": f"task_{i}"})
            job_ids.append(jid)

        # Allow processing
        await asyncio.sleep(0.1)

        assert worker.processed_jobs_count == 3
        assert worker.failed_jobs_count == 0
        assert len(completed_jobs) == 3
        assert completed_jobs == ["task_0", "task_1", "task_2"]
        assert worker.average_latency_ms > 0
        assert worker.is_healthy is True
    finally:
        await worker.stop()
