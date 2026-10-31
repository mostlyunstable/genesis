from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy import String, Integer, Boolean, DateTime, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.db.base import Base


class ResponsePlaybookModel(Base):
    __tablename__ = "response_playbooks"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity_trigger: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    triggers: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    investigation_requirements: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    response_steps: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    allowed_scope: Mapped[str] = mapped_column(String(128), nullable=False)
    verification_steps: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    rollback_strategy: Mapped[str] = mapped_column(Text, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    execution_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class ResponseActionModel(Base):
    __tablename__ = "response_actions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    incident_id: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    playbook_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    action_name: Mapped[str] = mapped_column(String(128), nullable=False)
    target: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="simulated_success", nullable=False)
    execution_mode: Mapped[str] = mapped_column(String(32), default="simulated", nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), index=True, nullable=False)
    duration_ms: Mapped[int] = mapped_column(Integer, default=150, nullable=False)
    details: Mapped[str] = mapped_column(Text, default="", nullable=False)
    verification_status: Mapped[str] = mapped_column(String(32), default="verified", nullable=False)
    rollback_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_simulated: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
