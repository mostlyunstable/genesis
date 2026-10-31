from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, desc, or_
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.session import get_db
from backend.app.models.incident import IncidentModel
from backend.app.schemas.incident import (
    IncidentSchema,
    IncidentListResponse,
    UpdateIncidentStatusRequest
)
from backend.app.api.deps import get_current_user

router = APIRouter(prefix="/incidents", tags=["Incident Workspace"])


@router.get("", response_model=IncidentListResponse)
async def list_incidents(
    severity: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    query: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(IncidentModel)

    if severity and severity != "all":
        stmt = stmt.where(IncidentModel.severity == severity)
    if status_filter and status_filter != "all":
        stmt = stmt.where(IncidentModel.status == status_filter)
    if query:
        q = f"%{query.strip().lower()}%"
        stmt = stmt.where(
            or_(
                IncidentModel.title.ilike(q),
                IncidentModel.id.ilike(q),
                IncidentModel.category.ilike(q)
            )
        )

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_res = await db.execute(count_stmt)
    total = total_res.scalar_one()

    stmt = stmt.order_by(desc(IncidentModel.created_at)).limit(limit).offset(offset)
    res = await db.execute(stmt)
    models = res.scalars().all()

    items = [
        IncidentSchema(
            id=m.id,
            title=m.title,
            category=m.category,
            severity=m.severity,
            status=m.status,
            riskScore=m.risk_score,
            confidenceScore=m.confidence_score,
            sourceIps=m.source_ips or [],
            targetAccounts=m.target_accounts or [],
            eventCount=m.event_count,
            createdAt=m.created_at.isoformat() if hasattr(m.created_at, "isoformat") else str(m.created_at),
            updatedAt=m.updated_at.isoformat() if hasattr(m.updated_at, "isoformat") else str(m.updated_at),
            detectionIds=m.detection_ids or [],
            eventIds=m.event_ids or [],
            detectionExplanation=m.detection_explanation or "",
            mitreAttack=m.mitre_attack or [],
            aiSummary=m.ai_summary or {},
            timelineEvents=m.timeline_events or [],
            assignedPlaybookId=m.assigned_playbook_id,
            isSimulated=m.is_simulated
        )
        for m in models
    ]

    return IncidentListResponse(items=items, total=total)


@router.get("/{incident_id}", response_model=IncidentSchema)
async def get_incident(incident_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(IncidentModel).where(IncidentModel.id == incident_id))
    m = res.scalar_one_or_none()
    if not m:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "INCIDENT_NOT_FOUND", "message": f"Incident {incident_id} not found"}
        )

    return IncidentSchema(
        id=m.id,
        title=m.title,
        category=m.category,
        severity=m.severity,
        status=m.status,
        riskScore=m.risk_score,
        confidenceScore=m.confidence_score,
        sourceIps=m.source_ips or [],
        targetAccounts=m.target_accounts or [],
        eventCount=m.event_count,
        createdAt=m.created_at.isoformat() if hasattr(m.created_at, "isoformat") else str(m.created_at),
        updatedAt=m.updated_at.isoformat() if hasattr(m.updated_at, "isoformat") else str(m.updated_at),
        detectionIds=m.detection_ids or [],
        eventIds=m.event_ids or [],
        detectionExplanation=m.detection_explanation or "",
        mitreAttack=m.mitre_attack or [],
        aiSummary=m.ai_summary or {},
        timelineEvents=m.timeline_events or [],
        assignedPlaybookId=m.assigned_playbook_id,
        isSimulated=m.is_simulated
    )


@router.patch("/{incident_id}/status", response_model=IncidentSchema)
async def update_incident_status(
    incident_id: str,
    payload: UpdateIncidentStatusRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    res = await db.execute(select(IncidentModel).where(IncidentModel.id == incident_id))
    m = res.scalar_one_or_none()
    if not m:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "INCIDENT_NOT_FOUND", "message": f"Incident {incident_id} not found"}
        )

    m.status = payload.status
    await db.commit()

    return IncidentSchema(
        id=m.id,
        title=m.title,
        category=m.category,
        severity=m.severity,
        status=m.status,
        riskScore=m.risk_score,
        confidenceScore=m.confidence_score,
        sourceIps=m.source_ips or [],
        targetAccounts=m.target_accounts or [],
        eventCount=m.event_count,
        createdAt=m.created_at.isoformat() if hasattr(m.created_at, "isoformat") else str(m.created_at),
        updatedAt=m.updated_at.isoformat() if hasattr(m.updated_at, "isoformat") else str(m.updated_at),
        detectionIds=m.detection_ids or [],
        eventIds=m.event_ids or [],
        detectionExplanation=m.detection_explanation or "",
        mitreAttack=m.mitre_attack or [],
        aiSummary=m.ai_summary or {},
        timelineEvents=m.timeline_events or [],
        assignedPlaybookId=m.assigned_playbook_id,
        isSimulated=m.is_simulated
    )
