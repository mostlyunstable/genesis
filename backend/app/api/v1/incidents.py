import time
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, desc, or_
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.session import get_db
from backend.app.models.incident import IncidentModel
from backend.app.schemas.incident import (
    IncidentSchema,
    IncidentListResponse,
    UpdateIncidentStatusRequest,
    AddCommentRequest,
    IncidentCommentSchema
)
from backend.app.api.deps import get_current_user

router = APIRouter(prefix="/incidents", tags=["Incident Workspace"])


def _to_incident_schema(m: IncidentModel) -> IncidentSchema:
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
        assignedAnalyst=getattr(m, "assigned_analyst", None),
        comments=[IncidentCommentSchema(**c) if isinstance(c, dict) and "author" in c else c for c in (getattr(m, "comments", []) or [])],
        resolutionNotes=getattr(m, "resolution_notes", None),
        isSimulated=m.is_simulated
    )


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

    items = [_to_incident_schema(m) for m in models]
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

    return _to_incident_schema(m)


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

    valid_statuses = {"active", "investigating", "contained", "resolved", "dismissed", "false_positive"}
    if payload.status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_STATUS", "message": f"Status must be one of: {sorted(list(valid_statuses))}"}
        )

    old_status = m.status
    m.status = payload.status
    now = datetime.now(timezone.utc)
    m.updated_at = now

    if payload.assignedAnalyst is not None:
        m.assigned_analyst = payload.assignedAnalyst
    if payload.resolutionNotes is not None:
        m.resolution_notes = payload.resolutionNotes

    # Append lifecycle transition to timeline
    timeline = list(m.timeline_events or [])
    timeline.append({
        "id": f"TL-STAT-{int(time.time() * 1000) % 1000000:06d}",
        "timestamp": now.isoformat(),
        "stage": "status_change",
        "title": f"Incident status transitioned: {old_status} -> {payload.status}",
        "description": f"Updated by {current_user.username if hasattr(current_user, 'username') else 'Analyst'}. {payload.resolutionNotes or ''}".strip(),
        "severity": "info",
        "type": "response"
    })
    m.timeline_events = timeline

    await db.commit()
    await db.refresh(m)
    return _to_incident_schema(m)


@router.post("/{incident_id}/comments", response_model=IncidentSchema)
async def add_incident_comment(
    incident_id: str,
    payload: AddCommentRequest,
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

    now = datetime.now(timezone.utc)
    comment_record = {
        "id": f"CMT-{int(time.time() * 1000) % 1000000:06d}",
        "author": payload.author or (current_user.username if hasattr(current_user, "username") else "Security Analyst"),
        "comment": payload.comment,
        "timestamp": now.isoformat()
    }

    comments = list(m.comments or [])
    comments.append(comment_record)
    m.comments = comments

    # Also log to incident timeline for unified provenance
    timeline = list(m.timeline_events or [])
    timeline.append({
        "id": f"TL-CMT-{int(time.time() * 1000) % 1000000:06d}",
        "timestamp": now.isoformat(),
        "stage": "analyst_note",
        "title": f"Analyst Note by {comment_record['author']}",
        "description": payload.comment,
        "severity": "info",
        "type": "ai_note"
    })
    m.timeline_events = timeline
    m.updated_at = now

    await db.commit()
    await db.refresh(m)
    return _to_incident_schema(m)
