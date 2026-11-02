from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.session import get_db
from backend.app.models.asset import AssetModel
from backend.app.schemas.asset import (
    AssetResponse,
    AssetListResponse,
    CreateAssetRequest,
    UpdateAssetRequest
)
from backend.app.services.asset import asset_service, TIER_MULTIPLIERS
from backend.app.api.v1.auth import get_current_user

router = APIRouter(prefix="/assets", tags=["Assets & BIA Inventory"])


@router.get("", response_model=AssetListResponse)
async def list_assets(
    tier: Optional[int] = Query(None, ge=1, le=3, description="Filter by asset tier"),
    search: Optional[str] = Query(None, description="Search hostname or IP"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List enterprise monitored assets with their BIA criticality tiers and multipliers."""
    # Ensure seed assets exist in DB
    await asset_service.ensure_seed_assets(db)

    stmt = select(AssetModel)
    if tier is not None:
        stmt = stmt.where(AssetModel.asset_tier == tier)
    if search:
        term = f"%{search.strip()}%"
        stmt = stmt.where((AssetModel.hostname.ilike(term)) | (AssetModel.ip_address.ilike(term)))

    res = await db.execute(stmt)
    assets = res.scalars().all()

    items = []
    for a in assets:
        resp = AssetResponse(
            id=a.id,
            hostname=a.hostname,
            ip_address=a.ip_address,
            mac_address=a.mac_address,
            asset_tier=a.asset_tier,
            asset_type=a.asset_type,
            os_family=a.os_family,
            os_version=a.os_version,
            running_services=a.running_services or [],
            cve_vulnerabilities=a.cve_vulnerabilities or [],
            business_unit=a.business_unit,
            owner=a.owner,
            is_active=a.is_active,
            created_at=a.created_at,
            updated_at=a.updated_at,
            tier_multiplier=TIER_MULTIPLIERS.get(a.asset_tier, 1.0)
        )
        items.append(resp)

    return AssetListResponse(items=items, total=len(items))


@router.get("/{asset_id}", response_model=AssetResponse)
async def get_asset(
    asset_id: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Retrieve asset details by ID or IP address."""
    await asset_service.ensure_seed_assets(db)

    stmt = select(AssetModel).where((AssetModel.id == asset_id) | (AssetModel.ip_address == asset_id))
    res = await db.execute(stmt)
    asset = res.scalar_one_or_none()

    if not asset:
        raise HTTPException(status_code=404, detail=f"Asset '{asset_id}' not found.")

    return AssetResponse(
        id=asset.id,
        hostname=asset.hostname,
        ip_address=asset.ip_address,
        mac_address=asset.mac_address,
        asset_tier=asset.asset_tier,
        asset_type=asset.asset_type,
        os_family=asset.os_family,
        os_version=asset.os_version,
        running_services=asset.running_services or [],
        cve_vulnerabilities=asset.cve_vulnerabilities or [],
        business_unit=asset.business_unit,
        owner=asset.owner,
        is_active=asset.is_active,
        created_at=asset.created_at,
        updated_at=asset.updated_at,
        tier_multiplier=TIER_MULTIPLIERS.get(asset.asset_tier, 1.0)
    )


@router.post("", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
async def create_asset(
    payload: CreateAssetRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Register a new asset with its BIA tier in the inventory."""
    import uuid
    asset_id = payload.id or f"AST-{uuid.uuid4().hex[:8].upper()}"

    existing = await db.execute(select(AssetModel).where(AssetModel.ip_address == payload.ip_address))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Asset with IP {payload.ip_address} already exists.")

    asset = AssetModel(
        id=asset_id,
        hostname=payload.hostname,
        ip_address=payload.ip_address,
        mac_address=payload.mac_address,
        asset_tier=payload.asset_tier,
        asset_type=payload.asset_type,
        os_family=payload.os_family,
        os_version=payload.os_version,
        running_services=payload.running_services,
        cve_vulnerabilities=payload.cve_vulnerabilities,
        business_unit=payload.business_unit,
        owner=payload.owner,
        is_active=payload.is_active
    )
    db.add(asset)
    await db.commit()
    await db.refresh(asset)

    return AssetResponse(
        id=asset.id,
        hostname=asset.hostname,
        ip_address=asset.ip_address,
        mac_address=asset.mac_address,
        asset_tier=asset.asset_tier,
        asset_type=asset.asset_type,
        os_family=asset.os_family,
        os_version=asset.os_version,
        running_services=asset.running_services or [],
        cve_vulnerabilities=asset.cve_vulnerabilities or [],
        business_unit=asset.business_unit,
        owner=asset.owner,
        is_active=asset.is_active,
        created_at=asset.created_at,
        updated_at=asset.updated_at,
        tier_multiplier=TIER_MULTIPLIERS.get(asset.asset_tier, 1.0)
    )
