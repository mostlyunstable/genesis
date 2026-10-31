from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy import String, Integer, Boolean, DateTime, Text, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.db.base import Base


class IncidentModel(Base):
    __tablename__ = "incidents"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    category: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    severity: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="active", index=True, nullable=False)
    risk_score: Mapped[int] = mapped_column(Integer, default=50, nullable=False)
    confidence_score: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    source_ips: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    target_accounts: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    event_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    detection_ids: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    event_ids: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    detection_explanation: Mapped[str] = mapped_column(Text, default="", nullable=False)
    mitre_attack: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    ai_summary: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    timeline_events: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    assigned_playbook_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    is_simulated: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        Index("ix_incidents_sev_status", "severity", "status"),
    )
