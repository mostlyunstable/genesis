from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, desc, or_
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.session import get_db
from backend.app.models.detection import DetectionModel
from backend.app.schemas.detection import (
    DetectionSchema,
    DetectionListResponse,
    UpdateDetectionStatusRequest
)
from backend.app.api.deps import get_current_user

router = APIRouter(prefix="/detections", tags=["Threat Detections"])


@router.get("", response_model=DetectionListResponse)
async def list_detections(
    category: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    query: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(DetectionModel)

    if category and category != "all":
        stmt = stmt.where(DetectionModel.category == category)
    if severity and severity != "all":
        stmt = stmt.where(DetectionModel.severity == severity)
    if status_filter and status_filter != "all":
        stmt = stmt.where(DetectionModel.status == status_filter)
    if query:
        q = f"%{query.strip().lower()}%"
        stmt = stmt.where(
            or_(
                DetectionModel.name.ilike(q),
                DetectionModel.id.ilike(q),
                DetectionModel.source_ip.ilike(q),
                DetectionModel.rule_name.ilike(q)
            )
        )

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_res = await db.execute(count_stmt)
    total = total_res.scalar_one()

    stmt = stmt.order_by(desc(DetectionModel.timestamp)).limit(limit).offset(offset)
    res = await db.execute(stmt)
    models = res.scalars().all()

    items = [
        DetectionSchema(
            id=m.id,
            name=m.name,
            category=m.category,
            description=m.description,
            severity=m.severity,
            sourceIp=m.source_ip,
            targetAccounts=m.target_accounts or [],
            eventCount=m.event_count,
            timestamp=m.timestamp.isoformat() if hasattr(m.timestamp, "isoformat") else str(m.timestamp),
            confidence=m.confidence,
            riskScore=m.risk_score,
            status=m.status,
            triggeringConditions=m.triggering_conditions or [],
            supportingEventIds=m.supporting_event_ids or [],
            ruleId=m.rule_id,
            ruleName=m.rule_name,
            associatedIncidentId=m.associated_incident_id,
            suggestedPlaybookId=m.suggested_playbook_id,
            isSimulated=m.is_simulated
        )
        for m in models
    ]

    return DetectionListResponse(items=items, total=total)


@router.patch("/{detection_id}/status", response_model=DetectionSchema)
async def update_detection_status(
    detection_id: str,
    payload: UpdateDetectionStatusRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    res = await db.execute(select(DetectionModel).where(DetectionModel.id == detection_id))
    m = res.scalar_one_or_none()
    if not m:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "DETECTION_NOT_FOUND", "message": f"Detection {detection_id} not found"}
        )

    m.status = payload.status
    await db.commit()

    return DetectionSchema(
        id=m.id,
        name=m.name,
        category=m.category,
        description=m.description,
        severity=m.severity,
        sourceIp=m.source_ip,
        targetAccounts=m.target_accounts or [],
        eventCount=m.event_count,
        timestamp=m.timestamp.isoformat() if hasattr(m.timestamp, "isoformat") else str(m.timestamp),
        confidence=m.confidence,
        riskScore=m.risk_score,
        status=m.status,
        triggeringConditions=m.triggering_conditions or [],
        supportingEventIds=m.supporting_event_ids or [],
        ruleId=m.rule_id,
        ruleName=m.rule_name,
        associatedIncidentId=m.associated_incident_id,
        suggestedPlaybookId=m.suggested_playbook_id,
        isSimulated=m.is_simulated
    )
