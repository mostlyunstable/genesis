from typing import AsyncGenerator, Dict, Any, Optional
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession, AsyncEngine
from backend.app.core.config import settings

def get_engine_kwargs(url: str) -> Dict[str, Any]:
    if url.startswith("sqlite"):
        return {"connect_args": {"check_same_thread": False}}
    return {
        "pool_pre_ping": True,
        "pool_size": 20,
        "max_overflow": 10,
        "pool_recycle": 3600,
        "connect_args": {
            "server_settings": {"application_name": "sentinel_ai_backend"}
        } if "asyncpg" in url else {}
    }

engine: AsyncEngine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    **get_engine_kwargs(settings.DATABASE_URL)
)

async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)


async def check_db_health(db_engine: Optional[AsyncEngine] = None) -> bool:
    """Executes a fast SELECT 1 probe against the database engine."""
    eng = db_engine or engine
    try:
        async with eng.connect() as conn:
            res = await conn.execute(text("SELECT 1"))
            return res.scalar() == 1
    except Exception:
        return False


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that yields an async database session per request."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
