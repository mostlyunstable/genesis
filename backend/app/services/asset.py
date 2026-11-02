from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.asset import AssetModel


# Pre-configured authoritative enterprise infrastructure catalog
DEFAULT_SEED_ASSETS: List[Dict[str, Any]] = [
    {
        "id": "AST-DC-01",
        "hostname": "dc-01.corp.internal",
        "ip_address": "10.240.10.1",
        "mac_address": "52:54:00:12:34:01",
        "asset_tier": 1,
        "asset_type": "domain_controller",
        "os_family": "windows",
        "os_version": "Windows Server 2022 Datacenter",
        "running_services": ["active_directory", "kerberos", "ldap", "dns", "smb"],
        "cve_vulnerabilities": [
            {
                "cve_id": "CVE-2022-37967",
                "severity": "CRITICAL",
                "cvss": 8.8,
                "service": "kerberos",
                "description": "Windows Kerberos Elevation of Privilege Vulnerability"
            }
        ],
        "business_unit": "Core Identity & Directory Services",
        "owner": "Identity SecOps",
        "is_active": True
    },
    {
        "id": "AST-DB-PROD",
        "hostname": "db-prod-01.corp.internal",
        "ip_address": "10.240.10.15",
        "mac_address": "52:54:00:12:34:15",
        "asset_tier": 1,
        "asset_type": "database_server",
        "os_family": "linux",
        "os_version": "Debian GNU/Linux 12 (bookworm)",
        "running_services": ["postgresql", "ssh", "node_exporter"],
        "cve_vulnerabilities": [
            {
                "cve_id": "CVE-2024-6387",
                "severity": "HIGH",
                "cvss": 8.1,
                "service": "openssh",
                "description": "regreSSHion: Remote Code Execution vulnerability in OpenSSH sshd"
            }
        ],
        "business_unit": "Enterprise Data Platform",
        "owner": "Database Operations",
        "is_active": True
    },
    {
        "id": "AST-GW-01",
        "hostname": "app-gateway-01.corp.internal",
        "ip_address": "10.240.10.50",
        "mac_address": "52:54:00:12:34:50",
        "asset_tier": 2,
        "asset_type": "web_application",
        "os_family": "linux",
        "os_version": "Ubuntu 22.04 LTS",
        "running_services": ["nginx", "envoy", "ssh"],
        "cve_vulnerabilities": [],
        "business_unit": "Customer Facing Applications",
        "owner": "Edge Networking Team",
        "is_active": True
    },
    {
        "id": "AST-DEV-WS01",
        "hostname": "dev-sandbox-01.local",
        "ip_address": "192.168.1.100",
        "mac_address": "52:54:00:99:88:77",
        "asset_tier": 3,
        "asset_type": "workstation",
        "os_family": "linux",
        "os_version": "Ubuntu 24.04 LTS",
        "running_services": ["docker", "ssh"],
        "cve_vulnerabilities": [],
        "business_unit": "Engineering Sandbox",
        "owner": "DevOps Sandbox",
        "is_active": True
    }
]

TIER_MULTIPLIERS = {
    1: 1.3,  # Tier 1 Mission Critical: 30% risk boost
    2: 1.0,  # Tier 2 Production / Standard: baseline
    3: 0.8   # Tier 3 Workstation / Sandbox: 20% risk attenuation
}


class AssetInventoryService:
    """
    Asset Criticality & Business Impact Analysis (BIA) Service.
    Maps IP addresses and hostnames to business tiers, services, and CVEs.
    """

    @staticmethod
    def get_tier_multiplier(tier: int) -> float:
        return TIER_MULTIPLIERS.get(tier, 1.0)

    async def get_asset_by_ip(self, ip_address: str, db: Optional[AsyncSession] = None) -> Optional[Dict[str, Any]]:
        """Look up asset by IP address, checking DB first then seed catalog."""
        if db is not None:
            stmt = select(AssetModel).where(AssetModel.ip_address == ip_address)
            res = await db.execute(stmt)
            asset = res.scalar_one_or_none()
            if asset:
                return {
                    "id": asset.id,
                    "hostname": asset.hostname,
                    "ip_address": asset.ip_address,
                    "asset_tier": asset.asset_tier,
                    "tier_multiplier": self.get_tier_multiplier(asset.asset_tier),
                    "asset_type": asset.asset_type,
                    "os_family": asset.os_family,
                    "os_version": asset.os_version,
                    "running_services": asset.running_services or [],
                    "cve_vulnerabilities": asset.cve_vulnerabilities or [],
                    "business_unit": asset.business_unit,
                    "owner": asset.owner,
                    "is_active": asset.is_active
                }

        # Check default catalog
        for seed in DEFAULT_SEED_ASSETS:
            if seed["ip_address"] == ip_address:
                copy_item = dict(seed)
                copy_item["tier_multiplier"] = self.get_tier_multiplier(seed["asset_tier"])
                return copy_item

        return None

    async def get_criticality_multiplier(self, ip_address: str, db: Optional[AsyncSession] = None) -> float:
        """Determines the risk multiplication factor for a given IP."""
        asset = await self.get_asset_by_ip(ip_address, db)
        if asset:
            return float(asset.get("tier_multiplier", 1.0))
        return 1.0

    async def ensure_seed_assets(self, db: AsyncSession) -> None:
        """Seed default enterprise infrastructure assets if table is empty."""
        stmt = select(AssetModel).limit(1)
        res = await db.execute(stmt)
        if res.scalar_one_or_none() is not None:
            return

        now = datetime.now(timezone.utc)
        for seed in DEFAULT_SEED_ASSETS:
            asset = AssetModel(
                id=seed["id"],
                hostname=seed["hostname"],
                ip_address=seed["ip_address"],
                mac_address=seed.get("mac_address"),
                asset_tier=seed["asset_tier"],
                asset_type=seed["asset_type"],
                os_family=seed["os_family"],
                os_version=seed["os_version"],
                running_services=seed["running_services"],
                cve_vulnerabilities=seed["cve_vulnerabilities"],
                business_unit=seed["business_unit"],
                owner=seed["owner"],
                is_active=seed["is_active"],
                created_at=now,
                updated_at=now
            )
            db.add(asset)
        await db.commit()


asset_service = AssetInventoryService()
