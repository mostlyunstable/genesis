import time
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, text, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.session import get_db
from backend.app.models.event import SecurityEventModel
from backend.app.models.incident import IncidentModel
from backend.app.models.detection import DetectionModel
from backend.app.models.response import ResponseActionModel
from backend.app.models.source import LogSourceModel
from backend.app.models.settings import SettingsModel
from backend.app.schemas.analytics import (
    OverviewMetricsResponse,
    EventsTimelinePoint,
    MitreTechniqueCount,
    SystemHealthSummary
)

router = APIRouter(prefix="/analytics", tags=["Analytics & Operational Metrics"])


@router.get("/overview", response_model=OverviewMetricsResponse)
async def get_overview_metrics(
    window: Optional[str] = Query("24h", pattern="^(1h|24h|7d|30d|all)$"),
    db: AsyncSession = Depends(get_db)
):
    now_utc = datetime.now(timezone.utc)

    # 1. Total Ingested Events (persisted in database)
    total_events = await db.scalar(select(func.count(SecurityEventModel.id))) or 0

    # 2. Events Timeline within requested window
    events_timeline: List[EventsTimelinePoint] = []
    if total_events > 0:
        if window == "1h":
            start_time = now_utc - timedelta(hours=1)
            bucket_delta = timedelta(minutes=5)
            date_format = "%H:%M"
        elif window == "24h":
            start_time = now_utc - timedelta(hours=24)
            bucket_delta = timedelta(hours=1)
            date_format = "%H:00"
        elif window == "7d":
            start_time = now_utc - timedelta(days=7)
            bucket_delta = timedelta(days=1)
            date_format = "%b %d"
        elif window == "30d":
            start_time = now_utc - timedelta(days=30)
            bucket_delta = timedelta(days=1)
            date_format = "%b %d"
        else:
            start_time = now_utc - timedelta(days=365)
            bucket_delta = timedelta(days=1)
            date_format = "%Y-%m-%d"

        # Query events within the window ordered chronologically
        evt_res = await db.execute(
            select(SecurityEventModel.timestamp)
            .where(SecurityEventModel.timestamp >= start_time)
            .order_by(SecurityEventModel.timestamp.asc())
        )
        timestamps = evt_res.scalars().all()

        if timestamps:
            buckets: Dict[str, int] = defaultdict(int)
            for ts in timestamps:
                if ts.tzinfo is None:
                    ts = ts.replace(tzinfo=timezone.utc)
                key = ts.strftime(date_format)
                buckets[key] += 1

            for key, count in buckets.items():
                events_timeline.append(EventsTimelinePoint(timestamp=key, count=count))

    # 3. Active, Investigating, and Resolved Incidents
    active_incidents = await db.scalar(
        select(func.count(IncidentModel.id))
        .where(IncidentModel.status.in_(["active", "investigating", "open"]))
    ) or 0

    open_investigations = await db.scalar(
        select(func.count(IncidentModel.id))
        .where(IncidentModel.status == "investigating")
    ) or 0

    resolved_incidents = await db.scalar(
        select(func.count(IncidentModel.id))
        .where(IncidentModel.status.in_(["resolved", "contained", "closed"]))
    ) or 0

    # 4. Incident Severity Distribution
    sev_res = await db.execute(
        select(IncidentModel.severity, func.count(IncidentModel.id))
        .group_by(IncidentModel.severity)
    )
    incident_severity_distribution: Dict[str, int] = {
        row[0]: row[1] for row in sev_res.all()
    }

    # 5. Detections
    total_detections = await db.scalar(select(func.count(DetectionModel.id))) or 0
    critical_detections = await db.scalar(
        select(func.count(DetectionModel.id)).where(DetectionModel.severity == "critical")
    ) or 0

    cat_res = await db.execute(
        select(DetectionModel.category, func.count(DetectionModel.id))
        .group_by(DetectionModel.category)
    )
    detections_by_category: Dict[str, int] = {
        row[0]: row[1] for row in cat_res.all()
    }

    # 6. Real MITRE ATT&CK Technique Distribution (from persisted incidents)
    incidents_mitre_res = await db.execute(select(IncidentModel.mitre_attack))
    mitre_techniques_map: Dict[str, Dict[str, Any]] = {}
    for raw_mitre_list in incidents_mitre_res.scalars().all():
        if not raw_mitre_list or not isinstance(raw_mitre_list, list):
            continue
        for item in raw_mitre_list:
            if isinstance(item, dict):
                tid = item.get("techniqueId") or item.get("id") or "UNKNOWN"
                name = item.get("techniqueName") or item.get("name") or tid
                tactic = item.get("tactic") or "Observed Behavior"
                if tid not in mitre_techniques_map:
                    mitre_techniques_map[tid] = {
                        "techniqueId": tid,
                        "name": name,
                        "tactic": tactic,
                        "count": 0
                    }
                mitre_techniques_map[tid]["count"] += 1

    mitre_technique_distribution = [
        MitreTechniqueCount(
            techniqueId=data["techniqueId"],
            name=data["name"],
            tactic=data["tactic"],
            count=data["count"]
        )
        for data in mitre_techniques_map.values()
    ]

    # 7. Response Actions & Execution Status
    act_res = await db.execute(
        select(ResponseActionModel.status, func.count(ResponseActionModel.id))
        .group_by(ResponseActionModel.status)
    )
    response_actions_summary: Dict[str, int] = {
        row[0]: row[1] for row in act_res.all()
    }
    total_actions_taken = sum(response_actions_summary.values())

    # 8. System & Ingestion Health
    active_forwarders = await db.scalar(
        select(func.count(LogSourceModel.id)).where(LogSourceModel.status == "active")
    ) or 0

    # Probe DB latency
    t0 = time.perf_counter()
    db_ok = True
    try:
        probe = await db.execute(text("SELECT 1"))
        db_ok = probe.scalar() == 1
    except Exception:
        db_ok = False
    latency_ms = round((time.perf_counter() - t0) * 1000, 2)

    # Autonomous defense status
    st_res = await db.execute(select(SettingsModel).where(SettingsModel.id == 1))
    st = st_res.scalar_one_or_none()
    defense_status = "ARMED" if (st and st.autonomous_response_enabled) else "HALTED"

    return OverviewMetricsResponse(
        totalEvents=total_events,
        eventsOverTime=events_timeline,
        activeIncidents=active_incidents,
        openInvestigations=open_investigations,
        resolvedIncidents=resolved_incidents,
        incidentSeverityDistribution=incident_severity_distribution,
        totalDetections=total_detections,
        criticalDetections=critical_detections,
        detectionsByCategory=detections_by_category,
        mitreTechniqueDistribution=mitre_technique_distribution,
        responseActionsSummary=response_actions_summary,
        totalActionsTaken=total_actions_taken,
        systemHealth=SystemHealthSummary(
            databaseConnected=db_ok,
            databaseLatencyMs=latency_ms,
            activeForwarders=active_forwarders,
            defenseStatus=defense_status
        ),
        lastUpdated=now_utc.isoformat()
    )


@router.get("/events-timeline", response_model=List[EventsTimelinePoint])
async def get_events_timeline(
    window: Optional[str] = Query("24h", pattern="^(1h|24h|7d|30d|all)$"),
    db: AsyncSession = Depends(get_db)
):
    overview = await get_overview_metrics(window=window, db=db)
    return overview.eventsOverTime
