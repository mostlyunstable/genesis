from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.db.base import Base


class LogSourceModel(Base):
    __tablename__ = "log_sources"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    type: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False)
    last_event_received: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    events_processed_24h: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_count_24h: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    host: Mapped[str] = mapped_column(String(128), nullable=False)
    port: Mapped[int] = mapped_column(Integer, nullable=False)
    agent_version: Mapped[str] = mapped_column(String(64), nullable=False)
    format: Mapped[str] = mapped_column(String(64), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
