from datetime import datetime, timezone
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.models.asset import AssetModel
from backend.app.models.event import SecurityEventModel
from backend.app.models.detection import DetectionModel
from backend.app.services.asset import asset_service, TIER_MULTIPLIERS
from backend.app.services.correlation import correlation_engine, CorrelationEngine
from backend.app.services.chat_tools import tool_registry, GetAssetDetailsInput, ListMonitoredAssetsInput


@pytest.mark.asyncio
async def test_asset_inventory_seed_and_retrieval(db_session: AsyncSession):
    """Verifies that enterprise assets seed correctly with BIA criticality tiers and multipliers."""
    await asset_service.ensure_seed_assets(db_session)

    # 1. Tier 1 Domain Controller
    dc_asset = await asset_service.get_asset_by_ip("10.240.10.1", db_session)
    assert dc_asset is not None
    assert dc_asset["hostname"] == "dc-01.corp.internal"
    assert dc_asset["asset_tier"] == 1
    assert dc_asset["tier_multiplier"] == 1.3
    assert "active_directory" in dc_asset["running_services"]

    # 2. Tier 3 Dev Sandbox
    dev_asset = await asset_service.get_asset_by_ip("192.168.1.100", db_session)
    assert dev_asset is not None
    assert dev_asset["hostname"] == "dev-sandbox-01.local"
    assert dev_asset["asset_tier"] == 3
    assert dev_asset["tier_multiplier"] == 0.8

    # 3. Unknown IP fallback
    unknown_multiplier = await asset_service.get_criticality_multiplier("203.0.113.99", db_session)
    assert unknown_multiplier == 1.0


def test_asset_criticality_risk_amplification():
    """
    Verifies that the BIA Asset Criticality factor correctly scales incident risk scores:
    Tier 1 (Mission-Critical) = 1.3x multiplier
    Tier 3 (Workstation / Non-Critical) = 0.8x multiplier
    """
    # Baseline risk for ssh_brute_force with 5 events, non-privileged, no breach
    # subtotal = 70 (base) + 0 + 0 + 1 (5//5) = 71
    risk_baseline, _ = CorrelationEngine.calculate_risk(
        category="ssh_brute_force",
        event_count=5,
        target_accounts=["guest_user"],
        has_successful_breach=False,
        asset_tier_multiplier=1.0
    )
    assert risk_baseline == 71

    # Tier 1 Attack Amplification: 71 * 1.3 = 92
    risk_tier1, _ = CorrelationEngine.calculate_risk(
        category="ssh_brute_force",
        event_count=5,
        target_accounts=["guest_user"],
        has_successful_breach=False,
        asset_tier_multiplier=1.3
    )
    assert risk_tier1 == 92
    assert risk_tier1 > risk_baseline

    # Tier 3 Attack Attenuation: 71 * 0.8 = 56
    risk_tier3, _ = CorrelationEngine.calculate_risk(
        category="ssh_brute_force",
        event_count=5,
        target_accounts=["guest_user"],
        has_successful_breach=False,
        asset_tier_multiplier=0.8
    )
    assert risk_tier3 == 56
    assert risk_tier3 < risk_baseline


@pytest.mark.asyncio
async def test_correlate_detection_with_tier1_asset_and_cve_enrichment(db_session: AsyncSession):
    """
    Verifies that correlation engine identifies destination asset, applies 1.3x BIA multiplier,
    and enriches incident ai_summary with asset metadata and CVE context.
    """
    await asset_service.ensure_seed_assets(db_session)
    now = datetime.now(timezone.utc)

    # 1. Target is 10.240.10.15 (AST-DB-PROD, Tier 1, CVE-2024-6387)
    evt = SecurityEventModel(
        id="EVT-BIA-TEST-001",
        timestamp=now,
        source="linux_ssh",
        event_type="SSH_AUTH_FAIL",
        username="postgres",
        source_ip="198.51.100.99",
        destination_ip="10.240.10.15",
        destination_port=22,
        outcome="failure",
        severity="warning",
        raw_event="Failed password for postgres from 198.51.100.99 port 22",
        parsed_fields={},
        fingerprint="fp_bia_001",
        is_simulated=True
    )
    db_session.add(evt)

    det = DetectionModel(
        id="DET-BIA-TEST-001",
        name="SSH Brute Force Attack",
        category="ssh_brute_force",
        description="Observed rapid failed authentication attempts from 198.51.100.99",
        severity="high",
        source_ip="198.51.100.99",
        target_accounts=["postgres"],
        event_count=5,
        timestamp=now,
        confidence=90.0,
        risk_score=70.0,
        status="open",
        triggering_conditions=["Failure velocity >= 5"],
        supporting_event_ids=["EVT-BIA-TEST-001"],
        rule_id="RULE-SSH-BRUTE-001",
        rule_name="SSH Brute Force",
        is_simulated=True
    )
    db_session.add(det)
    await db_session.flush()

    incident = await correlation_engine.correlate_detection(det, db_session)
    await db_session.commit()

    assert incident is not None
    # Risk should be amplified by Tier 1 multiplier (1.3x)
    assert incident.risk_score >= 90
    assert "affectedAsset" in incident.ai_summary
    asset_ctx = incident.ai_summary["affectedAsset"]
    assert asset_ctx["hostname"] == "db-prod-01.corp.internal"
    assert asset_ctx["assetTier"] == 1
    assert asset_ctx["tierMultiplier"] == 1.3
    # Check CVE vulnerability context
    cves = asset_ctx["vulnerabilities"]
    assert any(c["cve_id"] == "CVE-2024-6387" for c in cves)
    assert "CVE-2024-6387" in incident.ai_summary["rootCauseAnalysis"]


@pytest.mark.asyncio
async def test_assets_api_endpoints(client: AsyncClient, auth_headers: dict):
    """Verifies GET /assets and GET /assets/{id} REST API endpoints."""
    # List all assets
    res = await client.get("/api/v1/assets", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 4
    items = data["items"]
    assert any(a["id"] == "AST-DC-01" for a in items)

    # Filter by Tier 1
    tier1_res = await client.get("/api/v1/assets?tier=1", headers=auth_headers)
    assert tier1_res.status_code == 200
    tier1_items = tier1_res.json()["items"]
    assert all(a["asset_tier"] == 1 for a in tier1_items)
    assert any(a["id"] == "AST-DC-01" for a in tier1_items)

    # Retrieve specific asset by ID
    single_res = await client.get("/api/v1/assets/AST-DC-01", headers=auth_headers)
    assert single_res.status_code == 200
    single = single_res.json()
    assert single["hostname"] == "dc-01.corp.internal"
    assert single["tier_multiplier"] == 1.3


@pytest.mark.asyncio
async def test_copilot_tool_get_asset_details(db_session: AsyncSession):
    """Verifies that the Copilot tool can inspect asset criticality for BIA investigations."""
    await asset_service.ensure_seed_assets(db_session)

    res = await tool_registry.get_asset_details(
        GetAssetDetailsInput(ip_or_hostname="10.240.10.1"),
        db_session
    )
    assert res["status"] == "SUCCESS"
    assert res["asset_tier"] == 1
    assert res["criticality_multiplier"] == 1.3
    assert "Tier 1: Mission Critical" in res["tier_description"]
    assert len(res["evidence"]) == 1
