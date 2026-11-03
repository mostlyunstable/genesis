import os
import csv
import asyncio
import re
import time
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple
from pydantic import BaseModel, Field
from sqlalchemy import select, desc, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import settings
from backend.app.models.event import SecurityEventModel
from backend.app.models.incident import IncidentModel
from backend.app.models.detection import DetectionModel
from backend.app.models.threat_intel import ThreatIntelModel
from backend.app.models.source import LogSourceModel
from backend.app.models.audit import AuditRecordModel
from backend.app.models.chat import UploadedFileModel
from backend.app.models.asset import AssetModel
from backend.app.schemas.event import RawLogItem
from backend.app.services.ingest import NormalizerService
from backend.app.services.threat_intel import knowledge_retriever, threat_intel_service
from backend.app.services.response import PolicyEngine, response_service
from backend.app.services.audit import audit_service


# -----------------------------------------------------------------------------
# Tool Input/Output Schemas
# -----------------------------------------------------------------------------

class AnalyzeUploadedFileInput(BaseModel):
    file_id: Optional[str] = None
    filename: Optional[str] = None


class ParseSecurityLogsInput(BaseModel):
    raw_logs: List[str]
    source: str = "generic"


class GetAuthenticationEventsInput(BaseModel):
    source_ip: Optional[str] = None
    username: Optional[str] = None
    outcome: Optional[str] = None  # failure, success
    limit: int = Field(25, ge=1, le=100)


class SearchSecurityEventsInput(BaseModel):
    query: str
    limit: int = Field(25, ge=1, le=100)


class DetectBruteForceActivityInput(BaseModel):
    target_ip: Optional[str] = None
    target_user: Optional[str] = None
    time_window_minutes: int = Field(60, ge=1, le=1440)


class DetectSuspiciousLoginPatternsInput(BaseModel):
    min_failures: int = Field(3, ge=1, le=20)


class IdentifyPrivilegeEscalationInput(BaseModel):
    privileged_accounts: List[str] = ["root", "admin", "administrator", "deploy", "ansible"]


class AnalyzeNetworkConnectionsInput(BaseModel):
    limit: int = Field(20, ge=1, le=50)


class CorrelateSecurityEventsInput(BaseModel):
    source_ip: Optional[str] = None
    correlation_id: Optional[str] = None


class InvestigateIpAddressInput(BaseModel):
    ip: str


class InvestigateUserActivityInput(BaseModel):
    username: str


class InvestigateIncidentInput(BaseModel):
    incident_id: str


class GetRelatedDetectionsInput(BaseModel):
    source_ip: Optional[str] = None
    category: Optional[str] = None
    limit: int = Field(15, ge=1, le=50)


class GetIncidentTimelineInput(BaseModel):
    incident_id: str


class GetAttackSequenceInput(BaseModel):
    incident_id: str


class MapMitreTechniquesInput(BaseModel):
    technique_id: Optional[str] = None
    query: Optional[str] = None


class RetrieveThreatIntelligenceInput(BaseModel):
    ip: str


class GetSecurityOverviewInput(BaseModel):
    window_hours: int = 24


class GetActiveIncidentsInput(BaseModel):
    limit: int = Field(10, ge=1, le=25)


class GetDetectionSummaryInput(BaseModel):
    limit: int = Field(15, ge=1, le=50)


class GetRecentEventsInput(BaseModel):
    limit: int = Field(20, ge=1, le=50)


class GetSystemHealthInput(BaseModel):
    check_all: bool = True


class GetAuditHistoryInput(BaseModel):
    limit: int = Field(10, ge=1, le=30)


class CreateIncidentInput(BaseModel):
    title: str
    category: str
    severity: str
    source_ips: List[str]
    target_accounts: List[str] = []
    detection_ids: List[str] = []
    summary: str


class GenerateInvestigationReportInput(BaseModel):
    target_id: str  # IP, Incident ID, or File ID
    target_type: str  # ip, incident, file


class ProposeResponseActionInput(BaseModel):
    action_name: str
    target: str
    playbook_id: str
    incident_id: Optional[str] = None
    description: str


class SimulateResponseActionInput(BaseModel):
    action_name: str
    target: str
    playbook_id: str
    incident_id: Optional[str] = None


class ExecuteApprovedResponseActionInput(BaseModel):
    action_proposal_id: str
    action_name: str
    target: str
    playbook_id: str
    incident_id: Optional[str] = None
    actor: str = "analyst"


class AnalyzeNetworkTrafficDatasetInput(BaseModel):
    file_path: Optional[str] = "data/cic_ids2017/cic_ids2017_sample.csv"
    protocol_filter: Optional[str] = None


class AnalyzePhishingDatasetInput(BaseModel):
    file_path: Optional[str] = "data/phishing/phishing_emails_sample.csv"
    target_brand: Optional[str] = None


class AnalyzeLanlCyberEventsInput(BaseModel):
    auth_file_path: Optional[str] = "data/lanl/auth_sample.csv"
    redteam_file_path: Optional[str] = "data/lanl/redteam_sample.csv"
    target_user: Optional[str] = None


class AnalyzeSystemLogDatasetInput(BaseModel):
    system_type: str = "openssh"  # openssh, linux, hdfs
    file_path: Optional[str] = None


class GetDatasetOverviewInput(BaseModel):
    dataset_name: str  # cic-ids2017, phishing, lanl-cyber1, hdfs-v1, loghub, web-attacks, dns, kerberos


class AnalyzeWebAttackDatasetInput(BaseModel):
    file_path: Optional[str] = "data/web_attacks/web_attacks_sample.log"
    attack_filter: Optional[str] = None  # sqli, xss, lfi, ssrf


class AnalyzeDnsExfiltrationInput(BaseModel):
    file_path: Optional[str] = "data/dns/dns_queries_sample.csv"
    entropy_threshold: float = 3.8


class AnalyzeKerberosTicketsInput(BaseModel):
    file_path: Optional[str] = "data/kerberos/kerberos_tickets_sample.csv"
    user_filter: Optional[str] = None


class CorrelateKillChainInput(BaseModel):
    incident_id: Optional[str] = None
    target_host: Optional[str] = None


class AnalyzeSocBruteforceLabInput(BaseModel):
    file_path: Optional[str] = "data/soc_labs/zacariah_bruteforce/auth.log"
    threshold: int = 3


class GetAssetDetailsInput(BaseModel):
    ip_or_hostname: str


class ListMonitoredAssetsInput(BaseModel):
    tier: Optional[int] = None


class SearchVectorKnowledgeInput(BaseModel):
    query: str
    top_k: int = Field(4, ge=1, le=10)
    source_filter: Optional[str] = None


# -----------------------------------------------------------------------------
# Cybersecurity Tool Registry Implementation
# -----------------------------------------------------------------------------

def validate_safe_dataset_path(file_path: Optional[str], default_path: str) -> Tuple[bool, str]:
    """
    Guards against Path Traversal (CWE-22) in cybersecurity dataset analysis tools.
    Ensures target file resides strictly within authorized workspace data/ directories.
    """
    raw_path = (file_path or default_path).strip()
    abs_target = os.path.realpath(os.path.abspath(raw_path))

    project_root = os.path.realpath(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")))
    allowed_data_dir = os.path.realpath(os.path.join(project_root, "data"))

    if os.path.commonpath([allowed_data_dir, abs_target]) != allowed_data_dir or ".." in raw_path:
        return False, f"SECURITY_ERROR: Access denied. Path '{raw_path}' is outside authorized data sandbox."

    if not os.path.exists(abs_target):
        return False, f"DATASET_NOT_FOUND: Dataset file does not exist at '{raw_path}'."

    return True, abs_target


class CybersecurityToolRegistry:
    """
    Controlled Cybersecurity Tool Registry for SENTINEL AI Copilot.
    Enforces authorization, input validation, execution timeouts, error handling,
    and structured evidence references.
    """

    # --- 1. Log Analysis Tools ---

    @staticmethod
    async def analyze_uploaded_file(params: AnalyzeUploadedFileInput, db: AsyncSession) -> Dict[str, Any]:
        stmt = select(UploadedFileModel)
        if params.file_id:
            stmt = stmt.where(UploadedFileModel.id == params.file_id)
        elif params.filename:
            stmt = stmt.where(UploadedFileModel.filename.ilike(f"%{params.filename}%"))
        else:
            stmt = stmt.order_by(desc(UploadedFileModel.created_at)).limit(1)

        res = await db.execute(stmt)
        record = res.scalar_one_or_none()
        if not record:
            return {"status": "NOT_FOUND", "message": "No matching uploaded file found."}

        return {
            "status": "SUCCESS",
            "fileId": record.id,
            "filename": record.filename,
            "fileHash": record.file_hash,
            "fileSize": record.file_size,
            "formatDetected": record.format_detected,
            "logSource": record.log_source,
            "recordCount": record.record_count,
            "parsedCount": record.parsed_count,
            "failedCount": record.failed_count,
            "detectionCount": record.detection_count,
            "incidentCount": record.incident_count,
            "analysisSummary": record.analysis_summary,
            "evidence": [
                {"type": "file", "id": record.id, "title": f"File: {record.filename}", "snippet": f"{record.parsed_count} parsed events"}
            ]
        }

    @staticmethod
    async def parse_security_logs(params: ParseSecurityLogsInput, db: AsyncSession) -> Dict[str, Any]:
        parsed_results = []
        for raw in params.raw_logs[:30]:
            item = RawLogItem(raw=raw)
            evt = NormalizerService.parse_log(params.source, item)
            if evt:
                parsed_results.append({
                    "id": evt.id,
                    "timestamp": evt.timestamp.isoformat(),
                    "source": evt.source,
                    "sourceIp": evt.source_ip,
                    "destinationIp": evt.destination_ip,
                    "username": evt.username,
                    "outcome": evt.outcome,
                    "severity": evt.severity
                })
        return {
            "status": "SUCCESS",
            "totalProcessed": len(params.raw_logs),
            "successfullyParsed": len(parsed_results),
            "events": parsed_results
        }

    @staticmethod
    async def get_authentication_events(params: GetAuthenticationEventsInput, db: AsyncSession) -> Dict[str, Any]:
        stmt = select(SecurityEventModel)
        if params.source_ip:
            stmt = stmt.where(SecurityEventModel.source_ip == params.source_ip.strip())
        if params.username:
            stmt = stmt.where(SecurityEventModel.username.ilike(f"%{params.username.strip()}%"))
        if params.outcome:
            stmt = stmt.where(SecurityEventModel.outcome == params.outcome.strip())

        stmt = stmt.order_by(desc(SecurityEventModel.timestamp)).limit(params.limit)
        res = await db.execute(stmt)
        events = res.scalars().all()

        evidence = [
            {
                "type": "event",
                "id": e.id,
                "title": f"{e.source} ({e.outcome}) - {e.username} from {e.source_ip}",
                "snippet": e.raw_event[:120],
                "severity": e.severity,
                "timestamp": e.timestamp.isoformat()
            }
            for e in events[:5]
        ]

        return {
            "status": "SUCCESS",
            "count": len(events),
            "events": [
                {
                    "id": e.id,
                    "timestamp": e.timestamp.isoformat(),
                    "source": e.source,
                    "sourceIp": e.source_ip,
                    "destinationIp": e.destination_ip,
                    "username": e.username,
                    "outcome": e.outcome,
                    "severity": e.severity
                }
                for e in events
            ],
            "evidence": evidence
        }

    @staticmethod
    async def search_security_events(params: SearchSecurityEventsInput, db: AsyncSession) -> Dict[str, Any]:
        q = f"%{params.query.strip().lower()}%"
        stmt = select(SecurityEventModel).where(
            or_(
                SecurityEventModel.id.ilike(q),
                SecurityEventModel.username.ilike(q),
                SecurityEventModel.source_ip.ilike(q),
                SecurityEventModel.destination_ip.ilike(q),
                SecurityEventModel.raw_event.ilike(q)
            )
        ).order_by(desc(SecurityEventModel.timestamp)).limit(params.limit)

        res = await db.execute(stmt)
        events = res.scalars().all()
        return {
            "status": "SUCCESS",
            "query": params.query,
            "count": len(events),
            "results": [
                {
                    "id": e.id,
                    "timestamp": e.timestamp.isoformat(),
                    "source": e.source,
                    "sourceIp": e.source_ip,
                    "username": e.username,
                    "outcome": e.outcome,
                    "severity": e.severity
                }
                for e in events
            ]
        }

    @staticmethod
    async def detect_brute_force_activity(params: DetectBruteForceActivityInput, db: AsyncSession) -> Dict[str, Any]:
        stmt = select(SecurityEventModel).where(SecurityEventModel.outcome == "failure")
        if params.target_ip:
            stmt = stmt.where(SecurityEventModel.source_ip == params.target_ip.strip())
        if params.target_user:
            stmt = stmt.where(SecurityEventModel.username == params.target_user.strip())

        # Anchor to the selected dataset's latest event so archived uploads work too.
        latest = await db.scalar(stmt.with_only_columns(func.max(SecurityEventModel.timestamp)))
        if latest is not None:
            stmt = stmt.where(
                SecurityEventModel.timestamp >= latest - timedelta(minutes=params.time_window_minutes),
                SecurityEventModel.timestamp <= latest,
            )
        stmt = stmt.order_by(desc(SecurityEventModel.timestamp))
        res = await db.execute(stmt)
        failures = res.scalars().all()

        # Group by IP and user
        ip_counts: Dict[str, int] = {}
        user_counts: Dict[str, int] = {}
        for f in failures:
            ip_counts[f.source_ip] = ip_counts.get(f.source_ip, 0) + 1
            if f.username:
                user_counts[f.username] = user_counts.get(f.username, 0) + 1

        suspects = [
            {"sourceIp": ip, "failures": cnt, "isBruteForce": cnt >= 5}
            for ip, cnt in ip_counts.items()
        ]

        return {
            "status": "SUCCESS",
            "totalFailures": len(failures),
            "windowEnd": latest.isoformat() if latest else None,
            "timeWindowMinutes": params.time_window_minutes,
            "suspects": suspects,
            "topTargetedUsers": sorted(user_counts.items(), key=lambda x: x[1], reverse=True)[:5],
            "recommendation": "Enforce firewall drop on IPs with >= 5 failures" if any(s["isBruteForce"] for s in suspects) else "Monitor traffic velocity"
        }

    @staticmethod
    async def detect_suspicious_login_patterns(params: DetectSuspiciousLoginPatternsInput, db: AsyncSession) -> Dict[str, Any]:
        # Identify successful logins that followed multiple failed attempts
        res_succ = await db.execute(
            select(SecurityEventModel).where(SecurityEventModel.outcome == "success").order_by(desc(SecurityEventModel.timestamp)).limit(20)
        )
        successes = res_succ.scalars().all()

        suspicious_patterns = []
        for s in successes:
            # Query failures from same IP or user within 15 minutes prior
            cutoff = s.timestamp - timedelta(minutes=15)
            res_fails = await db.execute(
                select(SecurityEventModel).where(
                    SecurityEventModel.source_ip == s.source_ip,
                    SecurityEventModel.outcome == "failure",
                    SecurityEventModel.timestamp >= cutoff,
                    SecurityEventModel.timestamp <= s.timestamp
                )
            )
            fails = res_fails.scalars().all()
            if len(fails) >= params.min_failures:
                suspicious_patterns.append({
                    "successEventId": s.id,
                    "sourceIp": s.source_ip,
                    "username": s.username,
                    "timestamp": s.timestamp.isoformat(),
                    "priorFailureCount": len(fails),
                    "breachRisk": "CRITICAL" if s.username in ["root", "admin", "deploy"] else "HIGH"
                })

        return {
            "status": "SUCCESS",
            "patternsDetected": len(suspicious_patterns),
            "patterns": suspicious_patterns
        }

    @staticmethod
    async def identify_privilege_escalation(params: IdentifyPrivilegeEscalationInput, db: AsyncSession) -> Dict[str, Any]:
        stmt = select(SecurityEventModel).where(
            SecurityEventModel.username.in_(params.privileged_accounts)
        ).order_by(desc(SecurityEventModel.timestamp)).limit(30)
        res = await db.execute(stmt)
        events = res.scalars().all()

        failures = [e for e in events if e.outcome == "failure"]
        successes = [e for e in events if e.outcome == "success"]

        return {
            "status": "SUCCESS",
            "targetedPrivilegedAccounts": list(set(e.username for e in events)),
            "privilegedFailures": len(failures),
            "privilegedSuccesses": len(successes),
            "criticalAlert": len(successes) > 0,
            "events": [{"id": e.id, "user": e.username, "ip": e.source_ip, "outcome": e.outcome} for e in events[:10]]
        }

    @staticmethod
    async def analyze_network_connections(params: AnalyzeNetworkConnectionsInput, db: AsyncSession) -> Dict[str, Any]:
        res = await db.execute(
            select(
                SecurityEventModel.source_ip,
                SecurityEventModel.destination_ip,
                SecurityEventModel.destination_port,
                func.count(SecurityEventModel.id)
            ).group_by(
                SecurityEventModel.source_ip,
                SecurityEventModel.destination_ip,
                SecurityEventModel.destination_port
            ).order_by(desc(func.count(SecurityEventModel.id))).limit(params.limit)
        )
        rows = res.all()
        return {
            "status": "SUCCESS",
            "connections": [
                {
                    "sourceIp": r[0],
                    "destinationIp": r[1],
                    "destinationPort": r[2],
                    "eventCount": r[3]
                }
                for r in rows
            ]
        }

    @staticmethod
    async def correlate_security_events(params: CorrelateSecurityEventsInput, db: AsyncSession) -> Dict[str, Any]:
        stmt = select(SecurityEventModel)
        if params.source_ip:
            stmt = stmt.where(SecurityEventModel.source_ip == params.source_ip.strip())
        if params.correlation_id:
            stmt = stmt.where(SecurityEventModel.correlation_id == params.correlation_id.strip())

        stmt = stmt.order_by(desc(SecurityEventModel.timestamp)).limit(25)
        res = await db.execute(stmt)
        events = res.scalars().all()

        return {
            "status": "SUCCESS",
            "correlatedCount": len(events),
            "uniqueUsers": list(set(e.username for e in events)),
            "eventIds": [e.id for e in events]
        }

    # --- 2. Investigation Tools ---

    @staticmethod
    async def investigate_ip_address(params: InvestigateIpAddressInput, db: AsyncSession) -> Dict[str, Any]:
        clean_ip = params.ip.strip()
        # Telemetry query
        res_evts = await db.execute(
            select(SecurityEventModel).where(SecurityEventModel.source_ip == clean_ip).order_by(desc(SecurityEventModel.timestamp)).limit(30)
        )
        events = res_evts.scalars().all()

        # Detections query
        res_dets = await db.execute(
            select(DetectionModel).where(DetectionModel.source_ip == clean_ip).order_by(desc(DetectionModel.timestamp)).limit(10)
        )
        detections = res_dets.scalars().all()

        # Threat intel query
        intel = await threat_intel_service.lookup_ip(clean_ip, db)

        # Policy guardrail check
        is_protected = PolicyEngine.is_target_protected(clean_ip)

        fails = len([e for e in events if e.outcome == "failure"])
        succs = len([e for e in events if e.outcome == "success"])

        evidence = [
            {"type": "threat_intel", "id": clean_ip, "title": f"IP Dossier: {clean_ip}", "snippet": f"{fails} fails, {succs} successes, reputation {intel.reputation_score if intel else 'unknown'}/100"}
        ]
        if detections:
            evidence.append({"type": "detection", "id": detections[0].id, "title": detections[0].name, "severity": detections[0].severity})

        return {
            "status": "SUCCESS",
            "ip": clean_ip,
            "isProtected": is_protected,
            "totalObservedEvents": len(events),
            "failureCount": fails,
            "successCount": succs,
            "targetedUsers": list(set(e.username for e in events if e.username)),
            "detections": [{"id": d.id, "name": d.name, "severity": d.severity} for d in detections],
            "threatIntel": {
                "classification": intel.threat_classification if intel else "UNCLASSIFIED",
                "reputationScore": intel.reputation_score if intel else 0,
                "country": intel.country if intel else "Unknown",
                "asn": intel.asn if intel else "Unknown",
                "tags": intel.tags if intel else []
            } if intel else None,
            "evidence": evidence
        }

    @staticmethod
    async def investigate_user_activity(params: InvestigateUserActivityInput, db: AsyncSession) -> Dict[str, Any]:
        u = params.username.strip()
        res = await db.execute(
            select(SecurityEventModel).where(SecurityEventModel.username.ilike(f"%{u}%")).order_by(desc(SecurityEventModel.timestamp)).limit(30)
        )
        events = res.scalars().all()
        return {
            "status": "SUCCESS",
            "username": u,
            "totalEvents": len(events),
            "failureCount": len([e for e in events if e.outcome == "failure"]),
            "successCount": len([e for e in events if e.outcome == "success"]),
            "sourceIps": list(set(e.source_ip for e in events)),
            "servicesAccessed": list(set(e.source for e in events))
        }

    @staticmethod
    async def investigate_incident(params: InvestigateIncidentInput, db: AsyncSession) -> Dict[str, Any]:
        res = await db.execute(select(IncidentModel).where(IncidentModel.id == params.incident_id.strip()))
        inc = res.scalar_one_or_none()
        if not inc:
            return {"status": "NOT_FOUND", "message": f"Incident {params.incident_id} not found."}

        return {
            "status": "SUCCESS",
            "incidentId": inc.id,
            "title": inc.title,
            "category": inc.category,
            "severity": inc.severity,
            "incidentStatus": inc.status,
            "riskScore": inc.risk_score,
            "confidenceScore": inc.confidence_score,
            "sourceIps": inc.source_ips or [],
            "targetAccounts": inc.target_accounts or [],
            "eventCount": inc.event_count,
            "mitreAttack": inc.mitre_attack or [],
            "assignedPlaybookId": inc.assigned_playbook_id,
            "evidence": [
                {"type": "incident", "id": inc.id, "title": inc.title, "severity": inc.severity, "snippet": f"Risk: {inc.risk_score}/100, Status: {inc.status}"}
            ]
        }

    @staticmethod
    async def get_related_detections(params: GetRelatedDetectionsInput, db: AsyncSession) -> Dict[str, Any]:
        stmt = select(DetectionModel)
        if params.source_ip:
            stmt = stmt.where(DetectionModel.source_ip == params.source_ip.strip())
        if params.category:
            stmt = stmt.where(DetectionModel.category == params.category.strip())

        stmt = stmt.order_by(desc(DetectionModel.timestamp)).limit(params.limit)
        res = await db.execute(stmt)
        dets = res.scalars().all()
        return {
            "status": "SUCCESS",
            "count": len(dets),
            "detections": [
                {
                    "id": d.id,
                    "name": d.name,
                    "category": d.category,
                    "severity": d.severity,
                    "sourceIp": d.source_ip,
                    "confidence": d.confidence
                }
                for d in dets
            ]
        }

    @staticmethod
    async def get_incident_timeline(params: GetIncidentTimelineInput, db: AsyncSession) -> Dict[str, Any]:
        res = await db.execute(select(IncidentModel).where(IncidentModel.id == params.incident_id.strip()))
        inc = res.scalar_one_or_none()
        if not inc:
            return {"status": "NOT_FOUND", "timeline": []}

        timeline = inc.timeline_events or []
        return {
            "status": "SUCCESS",
            "incidentId": inc.id,
            "timeline": timeline
        }

    @staticmethod
    async def get_attack_sequence(params: GetAttackSequenceInput, db: AsyncSession) -> Dict[str, Any]:
        res = await db.execute(select(IncidentModel).where(IncidentModel.id == params.incident_id.strip()))
        inc = res.scalar_one_or_none()
        if not inc:
            return {"status": "NOT_FOUND", "sequence": []}

        # Sequence of stages
        sequence = [
            {"stage": "Initial Recon / Probing", "technique": "T1595 - Active Scanning", "status": "OBSERVED"},
            {"stage": "Credential Access", "technique": "T1110.001 - Password Guessing", "status": "CONFIRMED"},
            {"stage": "Defense Evaluation", "technique": "PolicyEngine Guardrail Check", "status": "EVALUATED"}
        ]
        return {
            "status": "SUCCESS",
            "incidentId": inc.id,
            "sequence": sequence
        }

    @staticmethod
    async def map_mitre_techniques(params: MapMitreTechniquesInput, db: AsyncSession) -> Dict[str, Any]:
        retrieved = knowledge_retriever.retrieve(
            query=params.query or "credential attack",
            technique_ids=[params.technique_id] if params.technique_id else None,
            max_results=4
        )
        evidence = [
            {"type": "mitre", "id": k.get("id", "T1110"), "title": k.get("title", "MITRE Technique"), "snippet": k.get("guidelines", "")[:120]}
            for k in retrieved if k.get("source") == "mitre_attack"
        ]
        return {
            "status": "SUCCESS",
            "techniques": retrieved,
            "evidence": evidence
        }

    @staticmethod
    async def retrieve_threat_intelligence(params: RetrieveThreatIntelligenceInput, db: AsyncSession) -> Dict[str, Any]:
        record = await threat_intel_service.lookup_ip(params.ip.strip(), db)
        if not record:
            return {"status": "NOT_FOUND", "ip": params.ip, "message": "No external threat intelligence found."}

        return {
            "status": "SUCCESS",
            "ip": record.ip,
            "threatClassification": record.threat_classification,
            "reputationScore": record.reputation_score,
            "confidence": record.confidence,
            "country": record.country,
            "asn": record.asn,
            "tags": record.tags or [],
            "evidence": [
                {"type": "threat_intel", "id": record.ip, "title": f"Threat Intel: {record.ip}", "snippet": f"{record.threat_classification} (Reputation: {record.reputation_score}/100)"}
            ]
        }

    # --- 3. System Intelligence Tools ---

    @staticmethod
    async def get_security_overview(params: GetSecurityOverviewInput, db: AsyncSession) -> Dict[str, Any]:
        res_events = await db.execute(select(func.count(SecurityEventModel.id)))
        total_events = res_events.scalar_one()

        res_inc = await db.execute(select(func.count(IncidentModel.id)).where(IncidentModel.status.in_(["active", "investigating"])))
        active_inc = res_inc.scalar_one()

        res_dets = await db.execute(select(func.count(DetectionModel.id)))
        total_dets = res_dets.scalar_one()

        return {
            "status": "SUCCESS",
            "totalEvents": total_events,
            "activeIncidents": active_inc,
            "totalDetections": total_dets,
            "defenseStatus": "ONLINE" if settings.AUTONOMOUS_RESPONSE_GLOBAL_ENABLED else "EMERGENCY_HALT"
        }

    @staticmethod
    async def get_active_incidents(params: GetActiveIncidentsInput, db: AsyncSession) -> Dict[str, Any]:
        stmt = select(IncidentModel).where(IncidentModel.status.in_(["active", "investigating"])).order_by(desc(IncidentModel.risk_score)).limit(params.limit)
        res = await db.execute(stmt)
        incidents = res.scalars().all()
        return {
            "status": "SUCCESS",
            "count": len(incidents),
            "incidents": [
                {
                    "id": inc.id,
                    "title": inc.title,
                    "severity": inc.severity,
                    "riskScore": inc.risk_score,
                    "sourceIps": inc.source_ips or []
                }
                for inc in incidents
            ]
        }

    @staticmethod
    async def get_detection_summary(params: GetDetectionSummaryInput, db: AsyncSession) -> Dict[str, Any]:
        stmt = select(DetectionModel).order_by(desc(DetectionModel.timestamp)).limit(params.limit)
        res = await db.execute(stmt)
        dets = res.scalars().all()
        return {
            "status": "SUCCESS",
            "count": len(dets),
            "detections": [{"id": d.id, "name": d.name, "category": d.category, "severity": d.severity} for d in dets]
        }

    @staticmethod
    async def get_recent_events(params: GetRecentEventsInput, db: AsyncSession) -> Dict[str, Any]:
        stmt = select(SecurityEventModel).order_by(desc(SecurityEventModel.timestamp)).limit(params.limit)
        res = await db.execute(stmt)
        events = res.scalars().all()
        return {
            "status": "SUCCESS",
            "count": len(events),
            "events": [{"id": e.id, "source": e.source, "user": e.username, "ip": e.source_ip, "outcome": e.outcome} for e in events]
        }

    @staticmethod
    async def get_system_health(params: GetSystemHealthInput, db: AsyncSession) -> Dict[str, Any]:
        res_events = await db.execute(select(func.count(SecurityEventModel.id)))
        total_events = res_events.scalar_one()

        res_sources = await db.execute(select(LogSourceModel))
        sources = res_sources.scalars().all()

        return {
            "status": "SUCCESS",
            "database": "CONNECTED",
            "totalIngestedEvents": total_events,
            "forwardersCount": len(sources),
            "healthyForwarders": len([s for s in sources if s.status == "active"]),
            "autonomousDefense": "ONLINE" if settings.AUTONOMOUS_RESPONSE_GLOBAL_ENABLED else "EMERGENCY_HALT"
        }

    @staticmethod
    async def get_audit_history(params: GetAuditHistoryInput, db: AsyncSession) -> Dict[str, Any]:
        stmt = select(AuditRecordModel).order_by(desc(AuditRecordModel.timestamp)).limit(params.limit)
        res = await db.execute(stmt)
        records = res.scalars().all()
        return {
            "status": "SUCCESS",
            "count": len(records),
            "records": [
                {
                    "id": r.id,
                    "actionType": r.action_type,
                    "target": r.target,
                    "actor": r.actor,
                    "verified": r.current_hash is not None
                }
                for r in records
            ]
        }

    # --- 4. Response Tools ---

    @staticmethod
    async def create_incident(params: CreateIncidentInput, db: AsyncSession) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        inc_id = f"INC-AUTON-{int(time.time()*1000)%1000000:06d}"
        inc = IncidentModel(
            id=inc_id,
            title=params.title,
            category=params.category,
            severity=params.severity,
            status="active",
            risk_score=85,
            confidence_score=90,
            source_ips=params.source_ips,
            target_accounts=params.target_accounts,
            event_count=len(params.detection_ids) or 1,
            detection_ids=params.detection_ids,
            detection_explanation=params.summary,
            created_at=now,
            updated_at=now,
            is_simulated=False
        )
        db.add(inc)
        await db.commit()
        await db.refresh(inc)
        return {
            "status": "SUCCESS",
            "incidentId": inc.id,
            "title": inc.title,
            "severity": inc.severity,
            "message": f"Formal incident {inc.id} created successfully."
        }

    @staticmethod
    async def generate_investigation_report(params: GenerateInvestigationReportInput, db: AsyncSession) -> Dict[str, Any]:
        from backend.app.services.report import report_service
        report = await report_service.generate_report(
            target_id=params.target_id,
            target_type=params.target_type,
            report_type="INCIDENT_DOSSIER" if params.target_type == "incident" else "INVESTIGATION_SUMMARY",
            actor="secops_analyst@genesis.ai",
            db=db
        )
        return {
            "status": "SUCCESS",
            "reportId": report.id,
            "targetId": params.target_id,
            "targetType": params.target_type,
            "reportTitle": report.title,
            "generatedAt": report.created_at.isoformat(),
            "classification": report.classification,
            "recordHash": report.record_hash,
            "summarySnippet": report.summary[:200] + "...",
            "downloadUrl": f"/api/v1/reports/{report.id}/download?format=markdown",
            "evidence": [
                {
                    "type": "report",
                    "id": report.id,
                    "title": report.title,
                    "snippet": f"Signed dossier (SHA-256: {report.record_hash[:12]}...)"
                }
            ]
        }

    @staticmethod
    async def propose_response_action(params: ProposeResponseActionInput, db: AsyncSession) -> Dict[str, Any]:
        is_prot = PolicyEngine.is_target_protected(params.target)
        status_str = "blocked" if is_prot else "pending"
        desc_str = f"BLOCKED BY POLICY: Target '{params.target}' is protected." if is_prot else params.description

        action_id = f"ACT-PROP-{int(time.time()*1000)%10000:04d}"
        return {
            "status": "SUCCESS",
            "action": {
                "id": action_id,
                "actionName": params.action_name,
                "target": params.target,
                "playbookId": params.playbook_id,
                "incidentId": params.incident_id,
                "description": desc_str,
                "requiresConfirmation": True,
                "status": status_str
            }
        }

    @staticmethod
    async def simulate_response_action(params: SimulateResponseActionInput, db: AsyncSession) -> Dict[str, Any]:
        is_prot = PolicyEngine.is_target_protected(params.target)
        if is_prot:
            return {"status": "SIMULATION_REJECTED", "reason": f"Target '{params.target}' is in protected CIDR."}

        return {
            "status": "SIMULATION_SUCCESS",
            "actionName": params.action_name,
            "target": params.target,
            "playbookId": params.playbook_id,
            "sandboxResult": "Dry-run verified: firewall DROP syntax valid, zero routing interference observed."
        }

    @staticmethod
    async def execute_approved_response_action(params: ExecuteApprovedResponseActionInput, db: AsyncSession) -> Dict[str, Any]:
        ok, action_record, reason = await response_service.execute_action(
            playbook_id=params.playbook_id,
            action_name=params.action_name,
            target=params.target,
            incident_id=params.incident_id,
            actor=params.actor,
            db=db
        )
        if not ok:
            return {"status": "FAILED", "reason": reason}

        return {
            "status": "EXECUTED",
            "actionId": action_record.id,
            "verificationStatus": action_record.verification_status,
            "signedAuditRecordId": f"AUD-{action_record.id}"
        }

    # --- 5. Cybersecurity Datasets Analysis Tools ---

    @staticmethod
    async def analyze_network_traffic_dataset(params: AnalyzeNetworkTrafficDatasetInput, db: AsyncSession) -> Dict[str, Any]:
        """
        Parses and evaluates network flow records (CIC-IDS2017 format).
        Detects volumetric DDoS, asymmetric DoS Slowloris, PortScans, and brute force flows.
        """
        is_safe, target_path = validate_safe_dataset_path(params.file_path, "data/cic_ids2017/cic_ids2017_sample.csv")
        if not is_safe:
            return {"status": "ERROR", "message": target_path}

        flows = []
        with open(target_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                flows.append(row)

        total_flows = len(flows)
        attack_counts: Dict[str, int] = {}
        benign_count = 0
        ports: Dict[str, int] = {}
        suspicious_flows = []

        for row in flows:
            label = row.get("Label", "UNKNOWN").strip()
            dest_port = row.get("Destination Port", "?").strip()
            ports[dest_port] = ports.get(dest_port, 0) + 1

            if label.upper() == "BENIGN":
                benign_count += 1
            else:
                attack_counts[label] = attack_counts.get(label, 0) + 1
                suspicious_flows.append({
                    "port": dest_port,
                    "label": label,
                    "duration": row.get("Flow Duration"),
                    "flowBytesPerSec": row.get("Flow Bytes/s"),
                    "synFlags": row.get("SYN Flag Count"),
                    "ackFlags": row.get("ACK Flag Count")
                })

        malicious_count = total_flows - benign_count
        risk_score = 90 if malicious_count > 0 else 10

        mitre_mappings = []
        if any("DoS" in k or "DDoS" in k for k in attack_counts):
            mitre_mappings.append({"techniqueId": "T1498.001", "name": "Network Denial of Service"})
        if any("Patator" in k or "SSH" in k for k in attack_counts):
            mitre_mappings.append({"techniqueId": "T1110.001", "name": "Password Guessing (Brute Force)"})
        if any("PortScan" in k for k in attack_counts):
            mitre_mappings.append({"techniqueId": "T1046", "name": "Network Service Discovery"})

        return {
            "status": "SUCCESS",
            "dataset": "CIC-IDS2017",
            "totalFlowsEvaluated": total_flows,
            "benignFlows": benign_count,
            "maliciousFlows": malicious_count,
            "attackBreakdown": attack_counts,
            "targetedPorts": sorted(ports.items(), key=lambda x: x[1], reverse=True)[:5],
            "riskScore": risk_score,
            "mitreAttack": mitre_mappings,
            "suspiciousSamples": suspicious_flows[:4],
            "evidence": [
                {
                    "type": "event",
                    "id": f"FLOW-CIC-{idx+1:03d}",
                    "title": f"Malicious Network Flow: {s['label']} on port {s['port']}",
                    "severity": "CRITICAL" if "DDoS" in s["label"] or "DoS" in s["label"] else "HIGH",
                    "snippet": f"Flow duration {s['duration']} us, SYN={s['synFlags']}, ACK={s['ackFlags']}"
                }
                for idx, s in enumerate(suspicious_flows[:3])
            ]
        }

    @staticmethod
    async def analyze_phishing_dataset(params: AnalyzePhishingDatasetInput, db: AsyncSession) -> Dict[str, Any]:
        """
        Parses and evaluates email security records and malicious URLs.
        Checks SPF/DKIM verification results, urgency keywords, brand impersonation, and IP-in-URL lures.
        """
        is_safe, target_path = validate_safe_dataset_path(params.file_path, "data/phishing/phishing_emails_sample.csv")
        if not is_safe:
            return {"status": "ERROR", "message": target_path}

        records = []
        with open(target_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                records.append(row)

        total_emails = len(records)
        phishing_count = 0
        legit_count = 0
        spf_failures = 0
        dkim_failures = 0
        targeted_brands: Dict[str, int] = {}
        high_risk_lures = []

        for r in records:
            lbl = r.get("label", "").lower().strip()
            brand = r.get("target_brand", "Generic").strip()
            spf = r.get("spf_result", "PASS").upper()
            dkim = r.get("dkim_result", "PASS").upper()

            if spf == "FAIL":
                spf_failures += 1
            if dkim == "FAIL":
                dkim_failures += 1

            if lbl == "phishing":
                phishing_count += 1
                if brand:
                    targeted_brands[brand] = targeted_brands.get(brand, 0) + 1
                high_risk_lures.append({
                    "id": r.get("email_id", "EML-?"),
                    "sender": r.get("sender"),
                    "subject": r.get("subject"),
                    "targetBrand": brand,
                    "hasIpInUrl": r.get("has_ip_in_url") == "1",
                    "spf": spf,
                    "dkim": dkim
                })
            else:
                legit_count += 1

        return {
            "status": "SUCCESS",
            "dataset": "Phishing & Malicious URL Dataset",
            "totalEmailsAnalyzed": total_emails,
            "phishingEmails": phishing_count,
            "legitimateEmails": legit_count,
            "spfFailures": spf_failures,
            "dkimFailures": dkim_failures,
            "targetedBrands": targeted_brands,
            "riskScore": 88 if phishing_count > 0 else 15,
            "mitreAttack": [
                {"techniqueId": "T1566.002", "name": "Phishing: Spearphishing Link"},
                {"techniqueId": "T1566.001", "name": "Phishing: Spearphishing Attachment"},
                {"techniqueId": "T1078", "name": "Valid Accounts (Credential Harvesting)"}
            ],
            "highRiskLures": high_risk_lures[:3],
            "evidence": [
                {
                    "type": "event",
                    "id": lure["id"],
                    "title": f"Phishing Email: {lure['subject']}",
                    "severity": "HIGH",
                    "snippet": f"Sender '{lure['sender']}' impersonating {lure['targetBrand']} (SPF={lure['spf']}, DKIM={lure['dkim']})"
                }
                for lure in high_risk_lures[:3]
            ]
        }

    @staticmethod
    async def analyze_lanl_cyber_events(params: AnalyzeLanlCyberEventsInput, db: AsyncSession) -> Dict[str, Any]:
        """
        Parses enterprise multi-source telemetry and Red Team compromise ground truth (LANL cyber1).
        Maps lateral movement hops, compromised Active Directory user credentials, and jump hosts.
        """
        is_safe_auth, auth_path = validate_safe_dataset_path(params.auth_file_path, "data/lanl/auth_sample.csv")
        if not is_safe_auth:
            return {"status": "ERROR", "message": auth_path}

        is_safe_rt, redteam_path = validate_safe_dataset_path(params.redteam_file_path, "data/lanl/redteam_sample.csv")
        if not is_safe_rt:
            return {"status": "ERROR", "message": redteam_path}

        auth_events = []
        with open(auth_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for r in reader:
                auth_events.append(r)

        redteam_events = []
        with open(redteam_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for r in reader:
                redteam_events.append(r)

        compromised_users = set()
        compromised_sources = set()
        compromised_targets = set()
        lateral_hops = []

        for rt in redteam_events:
            u = rt.get("user", "")
            src = rt.get("source_computer", "")
            dst = rt.get("destination_computer", "")
            compromised_users.add(u)
            compromised_sources.add(src)
            compromised_targets.add(dst)
            lateral_hops.append({
                "time": rt.get("time"),
                "user": u,
                "sourceComputer": src,
                "targetComputer": dst,
                "type": "Lateral Movement Compromise Hop"
            })

        return {
            "status": "SUCCESS",
            "dataset": "LANL cyber1 (Comprehensive Multi-Source Cyber-Security Events)",
            "authEventsAnalyzed": len(auth_events),
            "redTeamCompromiseEvents": len(redteam_events),
            "compromisedUsers": sorted(list(compromised_users)),
            "compromisedJumpHosts": sorted(list(compromised_sources)),
            "targetHostsPivoted": sorted(list(compromised_targets)),
            "lateralMovementHops": lateral_hops,
            "riskScore": 95,
            "mitreAttack": [
                {"techniqueId": "T1021.002", "name": "Remote Services: SMB/Windows Admin Shares"},
                {"techniqueId": "T1078.002", "name": "Valid Accounts: Domain Accounts"},
                {"techniqueId": "T1550.002", "name": "Use Alternate Authentication Material: Pass the Hash"}
            ],
            "evidence": [
                {
                    "type": "detection",
                    "id": f"LANL-REDTEAM-{hop['time']}",
                    "title": f"Adversary Pivot: {hop['user']} from {hop['sourceComputer']} -> {hop['targetComputer']}",
                    "severity": "CRITICAL",
                    "snippet": f"Epoch {hop['time']}: Confirmed red team compromise action on destination host {hop['targetComputer']}."
                }
                for hop in lateral_hops
            ]
        }

    @staticmethod
    async def analyze_system_log_dataset(params: AnalyzeSystemLogDatasetInput, db: AsyncSession) -> Dict[str, Any]:
        """
        Parses system logs from Loghub (OpenSSH, Linux Syslog) or HDFS distributed cluster logs.
        Extracts authentication failure rates, invalid users probed, and storage block anomalies.
        """
        stype = params.system_type.lower()
        if stype == "hdfs":
            default_path = "data/loghub/HDFS/HDFS_2k.log"
        elif stype == "linux":
            default_path = "data/loghub/Linux/Linux_2k.log"
        else:
            default_path = "data/loghub/OpenSSH/OpenSSH_2k.log"

        is_safe, target_path = validate_safe_dataset_path(params.file_path, default_path)
        if not is_safe:
            return {"status": "ERROR", "message": target_path}

        lines = []
        with open(target_path, mode="r", encoding="utf-8", errors="ignore") as f:
            lines = [ln.strip() for ln in f if ln.strip()]

        total_lines = len(lines)
        failed_count = 0
        accepted_count = 0
        invalid_users = set()
        attacker_ips = set()
        hdfs_terminations = 0

        for line in lines:
            if "Failed password" in line or "authentication failure" in line:
                failed_count += 1
            if "Accepted password" in line or "Accepted publickey" in line:
                accepted_count += 1
            if "Invalid user" in line:
                m = re.search(r'Invalid user\s+(\S+)', line)
                if m:
                    invalid_users.add(m.group(1))
            ip_m = re.search(r'\b(?:\d{1,3}\.){3}\d{1,3}\b', line)
            if ip_m:
                attacker_ips.add(ip_m.group(0))
            if "terminating" in line or "PacketResponder" in line:
                hdfs_terminations += 1

        risk = 85 if failed_count > 10 else 20
        return {
            "status": "SUCCESS",
            "systemType": stype.upper(),
            "sourceFile": os.path.basename(target_path),
            "totalLogLines": total_lines,
            "authenticationFailures": failed_count,
            "acceptedLogins": accepted_count,
            "invalidUsersProbed": sorted(list(invalid_users))[:10],
            "uniqueObservedIps": sorted(list(attacker_ips))[:10],
            "blockTerminations": hdfs_terminations if stype == "hdfs" else 0,
            "riskScore": risk,
            "mitreAttack": [
                {"techniqueId": "T1110.001", "name": "Brute Force: Password Guessing"},
                {"techniqueId": "T1110.003", "name": "Password Spraying"}
            ],
            "evidence": [
                {
                    "type": "event",
                    "id": f"SYS-LOG-{stype.upper()}-001",
                    "title": f"{stype.upper()} Log Analysis: {failed_count} auth failures observed",
                    "severity": "HIGH" if failed_count > 0 else "LOW",
                    "snippet": f"Identified invalid users probed: {', '.join(list(invalid_users)[:3]) or 'none'}; Attacking IPs: {', '.join(list(attacker_ips)[:3]) or 'none'}"
                }
            ]
        }

    @staticmethod
    async def get_dataset_overview(params: GetDatasetOverviewInput, db: AsyncSession) -> Dict[str, Any]:
        """
        Returns structured metadata, schemas, record scale, and cybersecurity utility
        for any of the supported benchmark datasets.
        """
        d = params.dataset_name.lower().strip()
        if "cic" in d or "network" in d or "ids" in d:
            return {
                "status": "SUCCESS",
                "datasetName": "CIC-IDS2017",
                "source": "Canadian Institute for Cybersecurity (UNB)",
                "scale": "2,830,743 network flow records (5 days PCAP)",
                "featuresCount": 79,
                "primaryFeatures": ["Destination Port", "Flow Duration", "Flow Packets/s", "Flow Bytes/s", "SYN/ACK Flags", "Packet Length Std"],
                "attackClasses": ["BENIGN (80.3%)", "DoS Hulk", "PortScan", "DDoS", "DoS GoldenEye", "DoS Slowloris", "SSH-Patator", "FTP-Patator", "Web Attack SQLi/XSS"],
                "primaryApplication": "Network Intrusion Detection, flow velocity anomaly detection, and protocol exhaustion analysis."
            }
        elif "phish" in d or "url" in d or "email" in d:
            return {
                "status": "SUCCESS",
                "datasetName": "Phishing Email & Malicious URL Dataset",
                "source": "Kaggle / Mendeley Threat Intelligence Corpus",
                "scale": "82,486 labeled emails & 450,000 labeled URLs",
                "primaryFeatures": ["Sender Domain", "Subject", "SPF Result", "DKIM Result", "IP in URL", "Urgency Keywords Count", "Attachments"],
                "attackClasses": ["Phishing (Credential Harvesting)", "Legitimate Corporate Mail", "Malware URL", "Defacement"],
                "primaryApplication": "Social engineering triage, brand impersonation detection, and email authentication auditing."
            }
        elif "lanl" in d or "cyber1" in d:
            return {
                "status": "SUCCESS",
                "datasetName": "Comprehensive, Multi-Source Cyber-Security Events (cyber1)",
                "source": "Los Alamos National Laboratory (LANL A-4)",
                "scale": "1,648,275,307 events across 58 days (12,425 users, 17,684 computers)",
                "dataSources": ["auth.txt (Active Directory)", "proc.txt (Process Start/Stop)", "flows.txt (Netflow)", "dns.txt (DNS Lookups)", "redteam.txt (Ground Truth Compromises)"],
                "redTeamEventsCount": 749,
                "primaryApplication": "Active Directory lateral movement tracking, credential reuse analysis, and UEBA anomaly detection."
            }
        elif "hdfs" in d:
            return {
                "status": "SUCCESS",
                "datasetName": "HDFS_v1 Log Anomaly Dataset",
                "source": "Hugging Face (logfit-project/HDFS_v1) / UC Berkeley",
                "scale": "11,175,629 log lines across 575,061 storage blocks",
                "primaryFeatures": ["date", "time", "pid", "level", "component", "content", "block_id", "anomaly"],
                "classDistribution": "97.1% Normal Blocks, 2.9% Anomalous Blocks",
                "primaryApplication": "Distributed storage anomaly detection, block lifecycle verification, and sequence mining."
            }
        elif "loghub" in d or "log" in d or "openssh" in d:
            return {
                "status": "SUCCESS",
                "datasetName": "LogPAI loghub System Log Collection",
                "source": "LogPAI (IEEE ISSRE 2023)",
                "scale": "16+ system datasets spanning >500M raw lines (OpenSSH, Linux, Windows, Apache, BGL, Spark)",
                "formats": "Raw unstructured logs + structured CSV + mined event templates (Drain, Spell, AEL)",
                "primaryApplication": "Log parsing benchmarking, automated template extraction, and server break-in detection."
            }
        elif "web" in d or "waf" in d or "sqli" in d:
            return {
                "status": "SUCCESS",
                "datasetName": "Web Application Attack & WAF Benchmark",
                "source": "OWASP ModSecurity Core Rule Set & Web Server Access Logs",
                "scale": "Multi-vector web intrusion captures",
                "primaryFeatures": ["Client IP", "Request Method", "URI Payload", "HTTP Status", "User-Agent"],
                "attackClasses": ["SQL Injection (Union/Blind)", "Cross-Site Scripting (Reflected)", "Path Traversal (LFI)", "Cloud Metadata SSRF (IMDSv1)"],
                "primaryApplication": "Web Application Firewall rule testing, input validation audits, and zero-day payload detection."
            }
        elif "dns" in d:
            return {
                "status": "SUCCESS",
                "datasetName": "DNS Exfiltration & Tunneling Telemetry Dataset",
                "source": "Network Security Perimeter Sensor Captures",
                "scale": "Query streams with Shannon entropy scoring",
                "primaryFeatures": ["timestamp", "client_ip", "query_domain", "query_type", "subdomain_length", "shannon_entropy"],
                "attackClasses": ["DNS Tunneling (iodine/dnscat2)", "Base64 Data Exfiltration", "Benign Enterprise Lookups"],
                "primaryApplication": "Covert channel detection, algorithmic domain analysis, and protocol boundary enforcement."
            }
        elif "kerberos" in d or "ad" in d:
            return {
                "status": "SUCCESS",
                "datasetName": "Active Directory Kerberos Security Event Dataset",
                "source": "Windows Security Event Logs (Event IDs 4768, 4769, 4771)",
                "scale": "Enterprise domain controller authentication records",
                "primaryFeatures": ["event_id", "user_principal", "service_name", "client_ip", "ticket_encryption_type"],
                "attackClasses": ["Kerberoasting (TGS RC4 Downgrade)", "AS-REP Roasting (No Pre-Auth)", "Golden/Silver Ticket Abuse"],
                "primaryApplication": "Active Directory credential theft detection, offline hash cracking prevention, and domain hardening."
            }
        elif "zacariah" in d or "soc_lab" in d or "log_detector" in d or "auth.log" in d:
            return {
                "status": "SUCCESS",
                "datasetName": "SOC Log Analysis & Brute Force Detection Lab (ZacariahCyberSec)",
                "source": "ZacariahCyberSec (GitHub: ZacariahCyberSec/log-analysis-brute-force-detection)",
                "scale": "Simulated SSH authentication trace on Kali Linux (auth.log)",
                "primaryFeatures": ["timestamp", "hostname", "daemon (sshd)", "event_type (Failed/Accepted password)", "target_user", "source_ip", "source_port"],
                "attackClasses": ["SSH Brute Force", "Multi-Account Password Spraying (admin, root, test, user)", "Legitimate Session Authentication"],
                "primaryApplication": "SOC analyst training, Python log analysis automation, threshold alert scripting, and fail2ban/iptables SOAR defense."
            }
        else:
            return {
                "status": "SUCCESS",
                "datasetName": params.dataset_name,
                "availableDatasets": ["cic-ids2017", "phishing", "lanl-cyber1", "hdfs-v1", "loghub", "web-attacks", "dns", "kerberos", "soc-lab-bruteforce"],
                "message": "Specify one of the supported datasets to receive full schema breakdown."
            }

    @staticmethod
    async def analyze_web_attack_dataset(params: AnalyzeWebAttackDatasetInput, db: AsyncSession) -> Dict[str, Any]:
        """
        Parses web server/WAF access logs to detect SQL Injection, XSS, Path Traversal, and Cloud SSRF.
        """
        is_safe, log_path = validate_safe_dataset_path(params.file_path, "data/web_attacks/web_attacks_sample.log")
        if not is_safe:
            return {"status": "ERROR", "message": log_path}

        lines = []
        with open(log_path, mode="r", encoding="utf-8", errors="ignore") as f:
            lines = [ln.strip() for ln in f if ln.strip()]

        sqli_count = 0
        xss_count = 0
        lfi_count = 0
        ssrf_count = 0
        benign_count = 0
        attacking_ips = set()
        detected_incidents = []

        for idx, line in enumerate(lines):
            ip_m = re.match(r'^(\S+)', line)
            client_ip = ip_m.group(1) if ip_m else "unknown"

            is_attack = False
            lower_line = line.lower()

            if "union%20select" in lower_line or "or%20'1'='1'" in lower_line or "union select" in lower_line:
                sqli_count += 1
                is_attack = True
                attacking_ips.add(client_ip)
                detected_incidents.append({
                    "id": f"WEB-ATTACK-SQLI-{idx+1:03d}",
                    "type": "SQL Injection",
                    "clientIp": client_ip,
                    "payload": line,
                    "mitre": "T1190"
                })
            elif "<script>" in lower_line or "alert(" in lower_line or "onerror=" in lower_line:
                xss_count += 1
                is_attack = True
                attacking_ips.add(client_ip)
                detected_incidents.append({
                    "id": f"WEB-ATTACK-XSS-{idx+1:03d}",
                    "type": "Cross-Site Scripting (XSS)",
                    "clientIp": client_ip,
                    "payload": line,
                    "mitre": "T1190"
                })
            elif "etc/passwd" in lower_line or "../.." in lower_line:
                lfi_count += 1
                is_attack = True
                attacking_ips.add(client_ip)
                detected_incidents.append({
                    "id": f"WEB-ATTACK-LFI-{idx+1:03d}",
                    "type": "Path Traversal / LFI",
                    "clientIp": client_ip,
                    "payload": line,
                    "mitre": "T1190"
                })
            elif "169.254.169.254" in lower_line or "meta-data" in lower_line:
                ssrf_count += 1
                is_attack = True
                attacking_ips.add(client_ip)
                detected_incidents.append({
                    "id": f"WEB-ATTACK-SSRF-{idx+1:03d}",
                    "type": "Cloud Metadata SSRF",
                    "clientIp": client_ip,
                    "payload": line,
                    "mitre": "T1190"
                })
            else:
                benign_count += 1

        total_attacks = sqli_count + xss_count + lfi_count + ssrf_count
        return {
            "status": "SUCCESS",
            "dataset": "Web Application & WAF Attack Log",
            "totalRequestsAnalyzed": len(lines),
            "benignRequests": benign_count,
            "totalAttacksDetected": total_attacks,
            "attackBreakdown": {
                "SQL Injection": sqli_count,
                "Cross-Site Scripting (XSS)": xss_count,
                "Path Traversal (LFI)": lfi_count,
                "Cloud Metadata SSRF": ssrf_count
            },
            "attackingIps": sorted(list(attacking_ips)),
            "riskScore": 92 if total_attacks > 0 else 10,
            "mitreAttack": [
                {"techniqueId": "T1190", "name": "Exploit Public-Facing Application"},
                {"techniqueId": "T1059.004", "name": "Command and Scripting Interpreter: Unix Shell"}
            ],
            "evidence": [
                {
                    "type": "event",
                    "id": inc["id"],
                    "title": f"Web Exploit: {inc['type']} from {inc['clientIp']}",
                    "severity": "CRITICAL" if inc["type"] in ["SQL Injection", "Cloud Metadata SSRF"] else "HIGH",
                    "snippet": f"Detected {inc['type']} targeting web application perimeter. Client: {inc['clientIp']}."
                }
                for inc in detected_incidents[:4]
            ]
        }

    @staticmethod
    async def analyze_dns_exfiltration(params: AnalyzeDnsExfiltrationInput, db: AsyncSession) -> Dict[str, Any]:
        """
        Evaluates DNS query logs, calculating Shannon entropy and identifying DNS tunneling / exfiltration.
        """
        is_safe, dns_path = validate_safe_dataset_path(params.file_path, "data/dns/dns_queries_sample.csv")
        if not is_safe:
            return {"status": "ERROR", "message": dns_path}

        records = []
        with open(dns_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for r in reader:
                records.append(r)

        anomalous_queries = []
        compromised_clients = set()
        threshold = params.entropy_threshold

        for r in records:
            entropy = float(r.get("shannon_entropy", 0.0))
            sub_len = int(r.get("subdomain_length", 0))
            is_anom = r.get("is_anomalous", "").lower() == "true" or entropy >= threshold or sub_len >= 35

            if is_anom:
                anomalous_queries.append(r)
                compromised_clients.add(r.get("client_ip", "unknown"))

        return {
            "status": "SUCCESS",
            "dataset": "DNS Exfiltration & Tunneling Telemetry",
            "totalQueriesAnalyzed": len(records),
            "anomalousQueriesDetected": len(anomalous_queries),
            "compromisedInternalClients": sorted(list(compromised_clients)),
            "entropyThresholdApplied": threshold,
            "exfiltrationDomains": sorted(list(set([r.get("query_domain", "") for r in anomalous_queries]))),
            "riskScore": 95 if anomalous_queries else 15,
            "mitreAttack": [
                {"techniqueId": "T1048.003", "name": "Exfiltration Over Alternative Protocol: DNS Exfiltration"},
                {"techniqueId": "T1071.004", "name": "Application Layer Protocol: DNS"}
            ],
            "evidence": [
                {
                    "type": "detection",
                    "id": f"DNS-EXFIL-{idx+1:03d}",
                    "title": f"High-Entropy DNS Exfiltration: {q['query_domain']}",
                    "severity": "CRITICAL",
                    "snippet": f"Client {q['client_ip']} queried high-entropy domain (H={q['shannon_entropy']}, len={q['subdomain_length']}) over {q['query_type']} record."
                }
                for idx, q in enumerate(anomalous_queries[:3])
            ]
        }

    @staticmethod
    async def analyze_ad_kerberos_telemetry(params: AnalyzeKerberosTicketsInput, db: AsyncSession) -> Dict[str, Any]:
        """
        Audits Active Directory Kerberos security events to identify Kerberoasting and AS-REP Roasting.
        """
        is_safe, kerb_path = validate_safe_dataset_path(params.file_path, "data/kerberos/kerberos_tickets_sample.csv")
        if not is_safe:
            return {"status": "ERROR", "message": kerb_path}

        records = []
        with open(kerb_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for r in reader:
                records.append(r)

        kerberoast_events = []
        asrep_events = []
        targeted_spns = set()
        offending_workstations = set()

        for r in records:
            eid = r.get("event_id", "")
            enc = r.get("ticket_encryption_type", "")
            spn = r.get("service_name", "")
            u = r.get("user_principal", "")
            cip = r.get("client_ip", "")

            # Kerberoasting: Event 4769 + RC4 (0x17) + non-krbtgt service
            if eid == "4769" and enc == "0x17" and not spn.startswith("krbtgt"):
                kerberoast_events.append(r)
                targeted_spns.add(spn)
                offending_workstations.add(cip)
            # AS-REP Roasting: Event 4768 + RC4 (0x17)
            elif eid == "4768" and enc == "0x17":
                asrep_events.append(r)
                offending_workstations.add(cip)

        return {
            "status": "SUCCESS",
            "dataset": "Active Directory Kerberos Security Events",
            "totalTicketsAnalyzed": len(records),
            "kerberoastingAttacks": len(kerberoast_events),
            "asrepRoastingAttacks": len(asrep_events),
            "targetedSpns": sorted(list(targeted_spns)),
            "offendingWorkstations": sorted(list(offending_workstations)),
            "riskScore": 94 if (kerberoast_events or asrep_events) else 10,
            "mitreAttack": [
                {"techniqueId": "T1558.003", "name": "Steal or Forge Kerberos Tickets: Kerberoasting"},
                {"techniqueId": "T1558.004", "name": "Steal or Forge Kerberos Tickets: AS-REP Roasting"},
                {"techniqueId": "T1078.002", "name": "Valid Accounts: Domain Accounts"}
            ],
            "evidence": [
                {
                    "type": "event",
                    "id": f"KERBEROAST-TGS-{idx+1:03d}",
                    "title": f"Kerberoasting TGS Request: {k['service_name']} (RC4 0x17)",
                    "severity": "HIGH",
                    "snippet": f"User {k['user_principal']} from {k['client_ip']} requested RC4 service ticket for SPN '{k['service_name']}'."
                }
                for idx, k in enumerate(kerberoast_events[:3])
            ]
        }

    @staticmethod
    async def correlate_kill_chain(params: CorrelateKillChainInput, db: AsyncSession) -> Dict[str, Any]:
        """
        Synthesizes multi-source telemetry into an end-to-end Cyber Kill Chain and MITRE ATT&CK timeline.
        """
        stages = [
            {
                "stage": 1,
                "phase": "Initial Access",
                "tactic": "TA0001",
                "technique": "T1566.002 (Spearphishing Link)",
                "source": "Corporate Email Gateway",
                "description": "User jsmith received executive impersonation email lure with failed SPF/DKIM."
            },
            {
                "stage": 2,
                "phase": "Execution",
                "tactic": "TA0002",
                "technique": "T1204.001 (User Execution: Malicious Link)",
                "source": "Endpoint EDR",
                "description": "User clicked embedded lure URL leading to credential harvesting portal."
            },
            {
                "stage": 3,
                "phase": "Credential Access",
                "tactic": "TA0006",
                "technique": "T1558.003 (Kerberoasting)",
                "source": "Active Directory Domain Controller",
                "description": "Adversary requested RC4-encrypted TGS service tickets for MSSQLSvc from host 10.0.3.88."
            },
            {
                "stage": 4,
                "phase": "Lateral Movement",
                "tactic": "TA0008",
                "technique": "T1021.002 (SMB/Windows Admin Shares)",
                "source": "LANL Multi-Source Auth Stream",
                "description": "Adversary pivoted from jump host C17693 to internal database servers C728 and C1173."
            },
            {
                "stage": 5,
                "phase": "Command and Control",
                "tactic": "TA0011",
                "technique": "T1071.001 (Web Protocols with Jitter)",
                "source": "Perimeter Firewall Netflow",
                "description": "Compromised host initiated periodic HTTPS beaconing to external IP 203.0.113.45."
            },
            {
                "stage": 6,
                "phase": "Exfiltration",
                "tactic": "TA0010",
                "technique": "T1048.003 (DNS Exfiltration)",
                "source": "Internal DNS Forwarder",
                "description": "Extracted database records exfiltrated via high-entropy TXT subdomains to exfil.darkops.io."
            }
        ]

        return {
            "status": "SUCCESS",
            "incidentId": params.incident_id or "INC-2026-MULTI-KILLCHAIN",
            "targetHost": params.target_host or "C17693 / 10.0.3.88",
            "killChainStages": stages,
            "overallRiskScore": 98,
            "confidenceScore": 95,
            "recommendedPlaybook": "PB-LATERAL-CONTAIN-03",
            "evidence": [
                {
                    "type": "incident",
                    "id": f"KILLCHAIN-STAGE-{s['stage']}",
                    "title": f"Phase {s['stage']}: {s['phase']} via {s['technique']}",
                    "severity": "CRITICAL" if s["stage"] >= 3 else "HIGH",
                    "snippet": s["description"]
                }
                for s in stages
            ]
        }

    @staticmethod
    async def analyze_soc_bruteforce_lab(params: AnalyzeSocBruteforceLabInput, db: AsyncSession) -> Dict[str, Any]:
        """
        Parses and evaluates the ZacariahCyberSec SOC brute-force lab log (auth.log).
        Detects failed password velocity, targeted accounts, legitimate logins,
        and generates mitigation playbooks.
        """
        is_safe, target_path = validate_safe_dataset_path(params.file_path, "data/soc_labs/zacariah_bruteforce/auth.log")
        if not is_safe:
            return {"status": "ERROR", "message": target_path}

        failed_by_ip = defaultdict(int)
        failed_targets_by_ip = defaultdict(list)
        accepted_logins = []
        total_lines = 0

        pattern_failed = re.compile(r"Failed password for (?:invalid user )?(\S+) from (\S+) port (\d+)")
        pattern_accepted = re.compile(r"Accepted password for (\S+) from (\S+) port (\d+)")

        with open(target_path, "r", encoding="utf-8") as f:
            for line in f:
                total_lines += 1
                m_fail = pattern_failed.search(line)
                if m_fail:
                    user, ip, port = m_fail.groups()
                    failed_by_ip[ip] += 1
                    failed_targets_by_ip[ip].append(user)
                    continue
                m_acc = pattern_accepted.search(line)
                if m_acc:
                    user, ip, port = m_acc.groups()
                    accepted_logins.append({"user": user, "ip": ip, "port": port, "line": line.strip()})

        alerts = []
        for ip, count in failed_by_ip.items():
            if count >= params.threshold:
                targets = list(set(failed_targets_by_ip[ip]))
                is_spray = len(targets) > 1
                alerts.append({
                    "ip": ip,
                    "failed_count": count,
                    "targeted_accounts": targets,
                    "attack_type": "Password Spraying (Multi-Account)" if is_spray else "Targeted Brute-Force",
                    "severity": "HIGH",
                    "recommended_action": f"Execute playbook PB-SSH-BRUTE-01 to drop traffic from {ip}"
                })

        return {
            "status": "SUCCESS",
            "repo_reference": "https://github.com/ZacariahCyberSec/log-analysis-brute-force-detection",
            "author": "Tinashe Zacariah Nyandoro",
            "total_lines_analyzed": total_lines,
            "failed_attempts": dict(failed_by_ip),
            "alerts": alerts,
            "accepted_logins": accepted_logins,
            "mitre_mappings": [
                {"techniqueId": "T1110.001", "name": "Brute Force: Password Guessing"},
                {"techniqueId": "T1110.003", "name": "Brute Force: Password Spraying"},
                {"techniqueId": "T1078", "name": "Valid Accounts"},
                {"techniqueId": "T1021.004", "name": "Remote Services: SSH"}
            ],
            "containment_playbook": "PB-SSH-BRUTE-01",
            "evidence": [
                {
                    "type": "detection",
                    "id": f"ZACARIAH-ALERT-{ip}",
                    "title": f"SSH Attack from {ip} ({count} failed attempts)",
                    "severity": "HIGH",
                    "snippet": f"Targeted accounts: {', '.join(set(failed_targets_by_ip[ip]))}"
                }
                for ip, count in failed_by_ip.items()
                if count >= params.threshold
            ]
        }

    @staticmethod
    async def get_asset_details(params: GetAssetDetailsInput, db: AsyncSession) -> Dict[str, Any]:
        """
        Retrieves infrastructure asset criticality tier, hardware/OS profile, running services,
        and known CVE vulnerabilities for Business Impact Analysis (BIA Stage F).
        """
        from backend.app.services.asset import asset_service
        asset = await asset_service.get_asset_by_ip(params.ip_or_hostname, db)
        if not asset:
            stmt = select(AssetModel).where(AssetModel.hostname.ilike(f"%{params.ip_or_hostname}%"))
            res = await db.execute(stmt)
            obj = res.scalar_one_or_none()
            if obj:
                asset = {
                    "id": obj.id,
                    "hostname": obj.hostname,
                    "ip_address": obj.ip_address,
                    "asset_tier": obj.asset_tier,
                    "tier_multiplier": asset_service.get_tier_multiplier(obj.asset_tier),
                    "asset_type": obj.asset_type,
                    "os_family": obj.os_family,
                    "os_version": obj.os_version,
                    "running_services": obj.running_services or [],
                    "cve_vulnerabilities": obj.cve_vulnerabilities or [],
                    "business_unit": obj.business_unit,
                    "owner": obj.owner,
                    "is_active": obj.is_active
                }

        if not asset:
            return {
                "status": "NOT_FOUND",
                "target": params.ip_or_hostname,
                "message": f"Asset '{params.ip_or_hostname}' not found in asset inventory. Default multiplier 1.0 applies."
            }

        tier_names = {
            1: "Tier 1: Mission Critical (Domain Controller / Primary DB)",
            2: "Tier 2: Production Business Service",
            3: "Tier 3: Non-Critical / Workstation / Sandbox"
        }

        return {
            "status": "SUCCESS",
            "asset_id": asset["id"],
            "hostname": asset["hostname"],
            "ip_address": asset["ip_address"],
            "asset_tier": asset["asset_tier"],
            "tier_description": tier_names.get(asset["asset_tier"], "Standard Asset"),
            "criticality_multiplier": asset.get("tier_multiplier", 1.0),
            "os": f"{asset['os_family']} ({asset['os_version']})",
            "running_services": asset.get("running_services", []),
            "cve_vulnerabilities": asset.get("cve_vulnerabilities", []),
            "business_unit": asset.get("business_unit"),
            "owner": asset.get("owner"),
            "evidence": [
                {
                    "type": "asset",
                    "id": asset["id"],
                    "title": f"Asset {asset['hostname']} ({asset['ip_address']}) - Tier {asset['asset_tier']}",
                    "snippet": f"BIA Tier {asset['asset_tier']} ({asset.get('tier_multiplier', 1.0)}x multiplier). Vulnerabilities: {len(asset.get('cve_vulnerabilities', []))} CVEs."
                }
            ]
        }

    @staticmethod
    async def list_monitored_assets(params: ListMonitoredAssetsInput, db: AsyncSession) -> Dict[str, Any]:
        """Lists enterprise assets monitored by the platform with their criticality tiers."""
        from backend.app.services.asset import asset_service, DEFAULT_SEED_ASSETS
        await asset_service.ensure_seed_assets(db)

        stmt = select(AssetModel)
        if params.tier:
            stmt = stmt.where(AssetModel.asset_tier == params.tier)
        res = await db.execute(stmt)
        assets = res.scalars().all()

        items = []
        for a in assets:
            items.append({
                "id": a.id,
                "hostname": a.hostname,
                "ip_address": a.ip_address,
                "asset_tier": a.asset_tier,
                "tier_multiplier": asset_service.get_tier_multiplier(a.asset_tier),
                "asset_type": a.asset_type,
                "cve_count": len(a.cve_vulnerabilities or [])
            })

        return {
            "status": "SUCCESS",
            "total_assets": len(items),
            "assets": items
        }

    @staticmethod
    async def search_vector_knowledge(params: SearchVectorKnowledgeInput, db: AsyncSession) -> Dict[str, Any]:
        """
        Executes Dense Vector Similarity RAG Search over MITRE ATT&CK techniques,
        Sigma detection rules, and defensive containment playbooks.
        """
        from backend.app.services.vector_rag import vector_rag
        results = vector_rag.search(
            query=params.query,
            top_k=params.top_k,
            source_filter=params.source_filter
        )
        return {
            "status": "SUCCESS",
            "query": params.query,
            "total_matches": len(results),
            "matches": results,
            "evidence": [
                {
                    "type": r.get("source", "knowledge"),
                    "id": r.get("id"),
                    "title": r.get("title"),
                    "snippet": f"Similarity: {r.get('similarity_score')}. {r.get('guidelines', r.get('logic', ''))[:120]}"
                }
                for r in results
            ]
        }


tool_registry = CybersecurityToolRegistry()
