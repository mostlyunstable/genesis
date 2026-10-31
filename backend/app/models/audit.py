from datetime import datetime
from typing import Dict, Any
from sqlalchemy import String, Boolean, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.db.base import Base


class AuditRecordModel(Base):
    __tablename__ = "audit_records"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    action: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    actor: Mapped[str] = mapped_column(String(128), nullable=False)
    target: Mapped[str] = mapped_column(String(128), nullable=False)
    result: Mapped[str] = mapped_column(String(32), nullable=False)  # SUCCESS, WARNING, FAILURE, INFO
    details: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    is_simulated: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
