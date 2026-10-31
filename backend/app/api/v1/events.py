from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, desc, or_
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.session import get_db
from backend.app.models.event import SecurityEventModel
from backend.app.schemas.event import (
    IngestBatchRequest,
    IngestBatchResponse,
    SecurityEventSchema,
    EventListResponse
)
from backend.app.services.ingest import NormalizerService
from backend.app.api.deps import verify_forwarder_auth

router = APIRouter(tags=["Log Ingestion & Security Events"])


@router.post("/ingest/batch", response_model=IngestBatchResponse, status_code=status.HTTP_202_ACCEPTED)
async def ingest_batch(
    payload: IngestBatchRequest,
    db: AsyncSession = Depends(get_db),
    authorized: bool = Depends(verify_forwarder_auth)
):
    received = len(payload.logs)
    normalized = 0
    duplicates = 0
    dropped = 0
    new_events: List[SecurityEventModel] = []

    for item in payload.logs:
        event = NormalizerService.parse_log(payload.source, item)
        if not event:
            dropped += 1
            continue

        # Deduplication check
        existing = await db.execute(
            select(SecurityEventModel.id).where(SecurityEventModel.fingerprint == event.fingerprint)
        )
        if existing.scalar_one_or_none():
            duplicates += 1
            continue

        db.add(event)
        new_events.append(event)
        normalized += 1

    await db.commit()

    # Pass newly ingested events to detection engine pipeline if present
    from backend.app.services.detection import detection_engine
    for evt in new_events:
        await detection_engine.process_event(evt, db)

    await db.commit()

    return IngestBatchResponse(
        status="ACCEPTED",
        receivedCount=received,
        normalizedCount=normalized,
        duplicateCount=duplicates,
        droppedCount=dropped
    )


@router.get("/events", response_model=EventListResponse)
async def list_events(
    source: Optional[str] = Query(None),
    outcome: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    ip: Optional[str] = Query(None),
    query: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(SecurityEventModel)

    if source and source != "all":
        stmt = stmt.where(SecurityEventModel.source == source)
    if outcome and outcome != "all":
        stmt = stmt.where(SecurityEventModel.outcome == outcome)
    if severity and severity != "all":
        stmt = stmt.where(SecurityEventModel.severity == severity)
    if ip:
        clean_ip = ip.strip()
        stmt = stmt.where(
            or_(
                SecurityEventModel.source_ip.contains(clean_ip),
                SecurityEventModel.destination_ip.contains(clean_ip)
            )
        )
    if query:
        q = f"%{query.strip().lower()}%"
        stmt = stmt.where(
            or_(
                SecurityEventModel.id.ilike(q),
                SecurityEventModel.username.ilike(q),
                SecurityEventModel.source_ip.ilike(q),
                SecurityEventModel.event_type.ilike(q),
                SecurityEventModel.raw_event.ilike(q)
            )
        )

    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_res = await db.execute(count_stmt)
    total = total_res.scalar_one()

    # Fetch items ordered by timestamp descending
    stmt = stmt.order_by(desc(SecurityEventModel.timestamp)).limit(limit).offset(offset)
    res = await db.execute(stmt)
    models = res.scalars().all()

    items = [
        SecurityEventSchema(
            id=m.id,
            timestamp=m.timestamp.isoformat() if hasattr(m.timestamp, "isoformat") else str(m.timestamp),
            source=m.source,
            eventType=m.event_type,
            username=m.username,
            sourceIp=m.source_ip,
            destinationIp=m.destination_ip,
            destinationPort=m.destination_port,
            outcome=m.outcome,
            severity=m.severity,
            rawEvent=m.raw_event,
            parsedFields=m.parsed_fields or {},
            correlationId=m.correlation_id,
            isSimulated=m.is_simulated
        )
        for m in models
    ]

    return EventListResponse(items=items, total=total)


@router.get("/events/{event_id}", response_model=SecurityEventSchema)
async def get_event(event_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SecurityEventModel).where(SecurityEventModel.id == event_id))
    m = result.scalar_one_or_none()
    if not m:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "EVENT_NOT_FOUND", "message": f"Event {event_id} not found"}
        )

    return SecurityEventSchema(
        id=m.id,
        timestamp=m.timestamp.isoformat() if hasattr(m.timestamp, "isoformat") else str(m.timestamp),
        source=m.source,
        eventType=m.event_type,
        username=m.username,
        sourceIp=m.source_ip,
        destinationIp=m.destination_ip,
        destinationPort=m.destination_port,
        outcome=m.outcome,
        severity=m.severity,
        rawEvent=m.raw_event,
        parsedFields=m.parsed_fields or {},
        correlationId=m.correlation_id,
        isSimulated=m.is_simulated
    )
