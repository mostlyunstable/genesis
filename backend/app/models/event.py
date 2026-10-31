from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy import String, Integer, Boolean, DateTime, Text, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.db.base import Base


class SecurityEventModel(Base):
    __tablename__ = "security_events"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, index=True, nullable=False)
    source: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    event_type: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    source_ip: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    destination_ip: Mapped[str] = mapped_column(String(64), nullable=False)
    destination_port: Mapped[int] = mapped_column(Integer, nullable=False)
    outcome: Mapped[str] = mapped_column(String(32), index=True, nullable=False)  # failure, success, blocked, challenged
    severity: Mapped[str] = mapped_column(String(32), index=True, nullable=False)  # critical, warning, info, low
    raw_event: Mapped[str] = mapped_column(Text, nullable=False)
    parsed_fields: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    correlation_id: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    is_simulated: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    fingerprint: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)

    __table_args__ = (
        Index("ix_security_events_source_outcome", "source", "outcome"),
        Index("ix_security_events_source_ip_time", "source_ip", "timestamp"),
    )
