from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy import String, Boolean, DateTime, Text, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.db.base import Base


class ReportModel(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    incident_id: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    report_type: Mapped[str] = mapped_column(String(64), index=True, default="INCIDENT_DOSSIER", nullable=False)
    classification: Mapped[str] = mapped_column(String(64), default="CONFIDENTIAL // SECOPS USE ONLY", nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    findings: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    recommendations: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    markdown_content: Mapped[str] = mapped_column(Text, nullable=False)
    pdf_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    record_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True, nullable=False
    )
    generated_by: Mapped[str] = mapped_column(String(128), default="Genesis Autonomous Engine", nullable=False)
    is_simulated: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        Index("ix_reports_type_created", "report_type", "created_at"),
    )
