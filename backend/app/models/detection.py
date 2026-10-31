from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Integer, Float, Boolean, DateTime, Text, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.db.base import Base


class DetectionModel(Base):
    __tablename__ = "detections"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    category: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    source_ip: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    target_accounts: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    event_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=100.0, nullable=False)
    risk_score: Mapped[float] = mapped_column(Float, default=50.0, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="open", index=True, nullable=False)
    triggering_conditions: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    supporting_event_ids: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    rule_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    rule_name: Mapped[str] = mapped_column(String(128), nullable=False)
    associated_incident_id: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    suggested_playbook_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    is_simulated: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        Index("ix_detections_cat_status", "category", "status"),
    )
