import os
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.session import get_db
from backend.app.api.v1.auth import get_current_user
from backend.app.models.incident import IncidentModel
from backend.app.models.report import ReportModel
from backend.app.schemas.event import RawLogItem
from backend.app.services.ingest import NormalizerService
from backend.app.services.detection import detection_engine
from backend.app.services.correlation import correlation_engine
from backend.app.services.log_watcher import log_watcher
from backend.app.services.auto_investigator import auto_investigator

router = APIRouter(prefix="/automation", tags=["Autonomous SOC & Automation"])


class SimulateBruteForceRequest(BaseModel):
    attacker_ip: str = "198.51.100.177"
    target_ip: str = "10.240.10.15"  # Production DB (Tier 1)
    target_accounts: list[str] = Field(default=["root", "admin", "postgres", "deploy", "guest"], min_length=1)
    failure_count: int = Field(default=12, ge=1, le=100)
    service_banner: str = "OpenSSH 8.9p1 Ubuntu 3ubuntu0.6"


@router.get("/status")
async def get_automation_status(
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user)
):
    """Retrieves autonomous engine status, watcher directories, and recent automated actions."""
    incoming_files = []
    if os.path.exists(log_watcher.incoming_dir):
        incoming_files = [f for f in os.listdir(log_watcher.incoming_dir) if not f.startswith(".")]

    processed_count = 0
    if os.path.exists(log_watcher.processed_dir):
        processed_count = len([f for f in os.listdir(log_watcher.processed_dir) if not f.startswith(".")])

    stmt_rep = select(ReportModel).order_by(ReportModel.created_at.desc()).limit(5)
    res_rep = await db.execute(stmt_rep)
    recent_reports = res_rep.scalars().all()

    return {
        "status": "ONLINE",
        "watcher": {
            "incoming_dir": log_watcher.incoming_dir,
            "processed_dir": log_watcher.processed_dir,
            "pending_files_count": len(incoming_files),
            "pending_files": incoming_files[:10],
            "total_archived_files": processed_count
        },
        "auto_investigation": {
            "engine": "AutonomousSecurityAgent (ReAct 5-Stage)",
            "safety_guardrails": "RFC 5737 Exclusion & 20 Actions/Hour Circuit Breaker",
            "report_integrity": "Cryptographic SHA-256",
            "recent_generated_reports": len(recent_reports)
        }
    }


@router.post("/watcher/scan")
async def trigger_watcher_scan(
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user)
):
    """Scans the data/incoming directory for new logs, parses and correlates them."""
    result = await log_watcher.scan_and_ingest(db)
    return result


@router.post("/investigate/{incident_id}")
async def trigger_autonomous_investigation(
    incident_id: str,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user)
):
    """Triggers an immediate autonomous ReAct investigation, signed report, and chat briefing."""
    stmt = select(IncidentModel).where(IncidentModel.id == incident_id)
    res = await db.execute(stmt)
    incident = res.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found.")

    res_inv = await auto_investigator.auto_investigate_incident(incident, db)
    return res_inv


@router.post("/simulate-brute-force")
async def simulate_autonomous_brute_force_pipeline(
    payload: SimulateBruteForceRequest,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user)
):
    """
    Executes an end-to-end continuous autonomous test:
    1. Ingests simulated brute force logs targeting a Tier 1 asset with OpenSSH banner.
    2. Detects vulnerability (CVE-2024-6387) and triggers RULE-SSH-BRUTE-001.
    3. Correlates incident with Tier 1 BIA multiplier.
    4. Automatically launches the Autonomous ReAct Agent.
    5. Produces cryptographically signed report and delivers briefing to Copilot chat.
    """
    now = datetime.now(timezone.utc)
    detections = []
    last_detection = None

    # Ingest series of brute force log lines
    for i in range(payload.failure_count):
        account = payload.target_accounts[i % len(payload.target_accounts)]
        raw_line = (
            f"sshd[{10400 + i}]: Failed password for invalid user {account} "
            f"from {payload.attacker_ip} port {54320 + i} ssh2: {payload.service_banner}"
        )
        item = RawLogItem(
            raw=raw_line,
            timestamp=now - timedelta(seconds=(payload.failure_count - i) * 2),
            metadata={"destinationIp": payload.target_ip, "destinationPort": 22}
        )
        parsed = NormalizerService.parse_log(source="linux_ssh", item=item)
        if parsed:
            db.add(parsed)
            dets = await detection_engine.process_event(parsed, db)
            if dets:
                detections.extend(dets)
                last_detection = dets[-1]

    await db.commit()

    if not last_detection:
        return {
            "status": "PARTIAL",
            "message": "Logs ingested but detection threshold not met yet.",
            "events_ingested": payload.failure_count
        }

    # Fetch correlated incident via detection link or source IP
    incident = None
    if last_detection.associated_incident_id:
        res_inc = await db.execute(select(IncidentModel).where(IncidentModel.id == last_detection.associated_incident_id))
        incident = res_inc.scalar_one_or_none()

    if not incident:
        res_all = await db.execute(select(IncidentModel).order_by(IncidentModel.created_at.desc()))
        for inc_candidate in res_all.scalars().all():
            if payload.attacker_ip in (inc_candidate.source_ips or []):
                incident = inc_candidate
                break

    investigation_result = None
    if incident:
        # Trigger autonomous investigator
        investigation_result = await auto_investigator.auto_investigate_incident(incident, db)

    return {
        "status": "COMPLETED",
        "events_ingested": payload.failure_count,
        "detection_id": last_detection.id,
        "detection_rule": last_detection.rule_name,
        "incident_id": incident.id if incident else None,
        "risk_score": incident.risk_score if incident else None,
        "affected_asset": incident.ai_summary.get("affectedAsset") if incident and isinstance(incident.ai_summary, dict) else None,
        "autonomous_investigation": investigation_result
    }
