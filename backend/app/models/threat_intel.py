from datetime import datetime, timezone
from typing import List
from sqlalchemy import String, Integer, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.db.base import Base


class ThreatIntelModel(Base):
    __tablename__ = "threat_intel"

    ip: Mapped[str] = mapped_column(String(64), primary_key=True)
    threat_classification: Mapped[str] = mapped_column(String(128), nullable=False)
    reputation_score: Mapped[int] = mapped_column(Integer, default=50, nullable=False)  # 0-100
    associated_incidents: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    first_seen: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    last_seen: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    confidence: Mapped[int] = mapped_column(Integer, default=80, nullable=False)
    country: Mapped[str] = mapped_column(String(64), default="", nullable=False)
    country_code: Mapped[str] = mapped_column(String(8), default="", nullable=False)
    asn: Mapped[str] = mapped_column(String(64), default="", nullable=False)
    mitre_techniques: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    tags: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    simulated_data_source: Mapped[str] = mapped_column(String(128), default="Sentinel Synthetic Feed", nullable=False)
