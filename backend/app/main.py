from contextlib import asynccontextmanager
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.db.init_db import init_db
from backend.app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize DB schema & initial seed data
    await init_db()
    yield
    # Shutdown logic if needed


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


@app.get("/health", status_code=status.HTTP_200_OK, tags=["Health"])
@app.get(f"{settings.API_V1_STR}/health", status_code=status.HTTP_200_OK, tags=["Health"])
async def health_check():
    return {
        "status": "HEALTHY",
        "service": "SENTINEL AI Backend",
        "version": settings.VERSION,
        "demoMode": settings.DEMO_MODE,
        "engine": "PostgreSQL/SQLite Dual Engine",
        "defenseStatus": "ONLINE" if settings.AUTONOMOUS_RESPONSE_GLOBAL_ENABLED else "HALTED"
    }


# Include master API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)
