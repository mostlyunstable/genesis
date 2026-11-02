from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, ConfigDict


class CVEVulnerabilitySchema(BaseModel):
    cve_id: str
    severity: str  # LOW, MEDIUM, HIGH, CRITICAL
    cvss: float
    service: str
    description: Optional[str] = None


class AssetBaseSchema(BaseModel):
    hostname: str
    ip_address: str
    mac_address: Optional[str] = None
    asset_tier: int = Field(default=2, ge=1, le=3, description="1=Mission Critical (1.3x), 2=Standard (1.0x), 3=Non-Critical (0.8x)")
    asset_type: str = "server"
    os_family: str = "linux"
    os_version: str = "Debian 12"
    running_services: List[str] = Field(default_factory=list)
    cve_vulnerabilities: List[Dict[str, Any]] = Field(default_factory=list)
    business_unit: str = "Infrastructure Operations"
    owner: str = "SecOps Core"
    is_active: bool = True


class CreateAssetRequest(AssetBaseSchema):
    id: Optional[str] = None


class UpdateAssetRequest(BaseModel):
    hostname: Optional[str] = None
    ip_address: Optional[str] = None
    asset_tier: Optional[int] = Field(default=None, ge=1, le=3)
    asset_type: Optional[str] = None
    os_family: Optional[str] = None
    os_version: Optional[str] = None
    running_services: Optional[List[str]] = None
    cve_vulnerabilities: Optional[List[Dict[str, Any]]] = None
    business_unit: Optional[str] = None
    owner: Optional[str] = None
    is_active: Optional[bool] = None


class AssetResponse(AssetBaseSchema):
    id: str
    created_at: datetime
    updated_at: datetime
    tier_multiplier: float = 1.0

    model_config = ConfigDict(from_attributes=True)


class AssetListResponse(BaseModel):
    items: List[AssetResponse]
    total: int
