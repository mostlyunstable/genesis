from contextlib import asynccontextmanager
from fastapi import FastAPI, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from backend.app.core.config import settings
from backend.app.db.init_db import init_db
from backend.app.db.session import async_session_factory
from backend.app.services.queue import job_worker
from backend.app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize DB schema & initial seed data
    await init_db()
    await job_worker.start()
    yield
    # Shutdown: Stop worker gracefully
    await job_worker.stop()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware for React/Vite frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
@app.get(f"{settings.API_V1_STR}/health", tags=["Health"])
async def health_check(response: Response):
    # 1. Probe real database connectivity
    db_healthy = False
    db_latency_ms = 0.0
    try:
        import time
        t0 = time.perf_counter()
        async with async_session_factory() as session:
            res = await session.execute(text("SELECT 1"))
            res.scalar_one()
            db_healthy = True
            db_latency_ms = (time.perf_counter() - t0) * 1000.0
    except Exception as e:
        db_healthy = False

    # 2. Probe background worker queue
    queue_healthy = job_worker.is_healthy

    # 3. Overall status evaluation
    is_healthy = db_healthy and queue_healthy
    if not is_healthy:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": "HEALTHY" if is_healthy else "UNHEALTHY",
        "service": "SENTINEL AI Backend",
        "version": settings.VERSION,
        "demoMode": settings.DEMO_MODE,
        "dependencies": {
            "database": {
                "status": "CONNECTED" if db_healthy else "DISCONNECTED",
                "latencyMs": round(db_latency_ms, 2)
            },
            "queueWorker": {
                "status": "ONLINE" if queue_healthy else "OFFLINE",
                "processedJobs": job_worker.processed_jobs_count,
                "averageLatencyMs": round(job_worker.average_latency_ms, 2)
            }
        },
        "defenseStatus": "ONLINE" if settings.AUTONOMOUS_RESPONSE_GLOBAL_ENABLED else "HALTED"
    }


# Include master API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)
