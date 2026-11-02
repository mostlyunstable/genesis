from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy import String, Integer, Float, Boolean, DateTime, Text, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.db.base import Base


class AssetModel(Base):
    """
    Asset Inventory & Business Impact Analysis (BIA) Model (Stage F).
    Captures infrastructure assets, their tier criticality, and vulnerability posture.
    Tier 1: Mission Critical (Domain Controllers, Core Databases, PKI, Payment Gateways) - Multiplier 1.3x
    Tier 2: Production Business Services (Web Servers, API Gateways, App Nodes) - Multiplier 1.0x
    Tier 3: Internal Workstations & Non-Critical (Developer Sandboxes, Guest Workstations) - Multiplier 0.8x
    """
    __tablename__ = "assets"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    hostname: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    ip_address: Mapped[str] = mapped_column(String(45), index=True, nullable=False)
    mac_address: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    asset_tier: Mapped[int] = mapped_column(Integer, default=2, index=True, nullable=False)  # 1, 2, or 3
    asset_type: Mapped[str] = mapped_column(String(64), default="server", nullable=False)    # domain_controller, database_server, web_application, workstation, firewall
    os_family: Mapped[str] = mapped_column(String(64), default="linux", nullable=False)       # linux, windows, network_os
    os_version: Mapped[str] = mapped_column(String(64), default="Debian 12", nullable=False)
    running_services: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    cve_vulnerabilities: Mapped[List[Dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    business_unit: Mapped[str] = mapped_column(String(128), default="Infrastructure Operations", nullable=False)
    owner: Mapped[str] = mapped_column(String(128), default="SecOps Core", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("ix_assets_ip_tier", "ip_address", "asset_tier"),
    )
