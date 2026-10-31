import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "SENTINEL AI Autonomous Cybersecurity Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    # Persistence
    DATABASE_URL: str = "sqlite+aiosqlite:///./sentinel.db"
    REDIS_URL: str = "redis://localhost:6379/0"

    # Security & JWT
    JWT_SECRET: str = "sentinel_dev_secret_key_8fbc23a19e840d2105c317a9"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours

    # Ingest & Forwarder Authentication
    FORWARDER_API_KEY: str = "sentinel_fwd_live_9942a8b9e1"

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:4173",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:4173",
        "http://localhost:3000",
    ]

    # Operation Modes & Safeguards
    DEMO_MODE: bool = True
    DRY_RUN_DEFAULT: bool = True
    AUTONOMOUS_RESPONSE_GLOBAL_ENABLED: bool = True

    # Detection Heuristics Baselines
    SSH_FAILED_ATTEMPT_THRESHOLD: int = 10
    SSH_WINDOW_SECONDS: int = 120
    PASSWORD_SPRAY_UNIQUE_USERS_THRESHOLD: int = 5
    PASSWORD_SPRAY_WINDOW_SECONDS: int = 300
    DISTRIBUTED_THRESHOLD_IPS: int = 3
    TEMPORARY_IP_BLOCK_DURATION_MINUTES: int = 30

    # AI / LLM Configuration
    GEMINI_API_KEY: str | None = None
    AI_MODEL_NAME: str = "gemini-2.5-flash"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
