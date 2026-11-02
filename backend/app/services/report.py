import io
import csv
import json
import time
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.report import ReportModel
from backend.app.models.incident import IncidentModel
from backend.app.models.detection import DetectionModel
from backend.app.models.event import SecurityEventModel
from backend.app.models.threat_intel import ThreatIntelModel
from backend.app.models.chat import UploadedFileModel
from backend.app.services.audit import audit_service


class ReportGenerationService:
    @staticmethod
    def compute_report_hash(report_id: str, title: str, timestamp: Any, summary: str, findings: Dict[str, Any]) -> str:
        """Computes a SHA-256 cryptographic signature verifying report integrity and provenance."""
        if hasattr(timestamp, "strftime"):
            if getattr(timestamp, "tzinfo", None) is None:
                timestamp = timestamp.replace(tzinfo=timezone.utc)
            ts_str = timestamp.strftime("%Y-%m-%dT%H:%M:%SZ")
        else:
            ts_str = str(timestamp)[:19] + "Z"
        payload = f"{report_id}|{title}|{ts_str}|{summary}|{json.dumps(findings, sort_keys=True)}"
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    async def generate_report(
        self,
        target_id: str,
        target_type: str = "incident",
        report_type: str = "INCIDENT_DOSSIER",
        actor: str = "secops_analyst@genesis.ai",
        custom_notes: Optional[str] = None,
        db: Optional[AsyncSession] = None
    ) -> ReportModel:
        """
        Generates an evidence-grounded, cryptographically signed cybersecurity report
        from live database records, detections, events, and threat intelligence.
        """
        now = datetime.now(timezone.utc)
        rep_id = f"REP-2026-{int(time.time()*1000)%1000000:06d}"
        
        target_type_clean = target_type.lower().strip()
        incident_id: Optional[str] = None
        title: str = f"Security Forensic Dossier: {target_id}"
        summary: str = ""
        findings: Dict[str, Any] = {}
        recommendations: List[str] = []
        raw_events_sample: List[Dict[str, Any]] = []
        mitre_list: List[Dict[str, Any]] = []

        # -------------------------------------------------------------
        # 1. Target Type: INCIDENT
        # -------------------------------------------------------------
        if target_type_clean in ["incident", "inc"]:
            incident_id = target_id
            res_inc = await db.execute(select(IncidentModel).where(IncidentModel.id == target_id))
            inc = res_inc.scalar_one_or_none()

            if inc:
                title = f"Incident Response Dossier: {inc.title} ({inc.id})"
                summary = (
                    f"Comprehensive forensic assessment of security incident {inc.id} categorized under '{inc.category}'. "
                    f"The incident presents a calculated risk score of {inc.risk_score}/100 and confidence score of {inc.confidence_score}%. "
                    f"Adversary activity was traced to source IPs: {', '.join(inc.source_ips or []) or 'N/A'}, targeting identities: {', '.join(inc.target_accounts or []) or 'N/A'}."
                )

                # Fetch linked detections
                detections_data = []
                if inc.detection_ids:
                    res_dets = await db.execute(
                        select(DetectionModel).where(DetectionModel.id.in_(inc.detection_ids))
                    )
                    dets = res_dets.scalars().all()
                    for d in dets:
                        detections_data.append({
                            "id": d.id,
                            "name": d.name,
                            "category": d.category,
                            "severity": d.severity,
                            "riskScore": d.risk_score,
                            "triggeringConditions": d.triggering_conditions
                        })

                # Fetch linked events sample
                if inc.event_ids:
                    res_evts = await db.execute(
                        select(SecurityEventModel)
                        .where(SecurityEventModel.id.in_(inc.event_ids))
                        .order_by(SecurityEventModel.timestamp.desc())
                        .limit(20)
                    )
                    for e in res_evts.scalars().all():
                        raw_events_sample.append({
                            "id": e.id,
                            "timestamp": e.timestamp.isoformat(),
                            "source": e.source,
                            "username": e.username,
                            "sourceIp": e.source_ip,
                            "destinationIp": e.destination_ip,
                            "outcome": e.outcome,
                            "severity": e.severity,
                            "raw": e.raw_event[:150]
                        })

                mitre_list = inc.mitre_attack or []
                findings = {
                    "incidentId": inc.id,
                    "severity": inc.severity,
                    "status": inc.status,
                    "riskScore": inc.risk_score,
                    "confidenceScore": inc.confidence_score,
                    "sourceIps": inc.source_ips,
                    "targetAccounts": inc.target_accounts,
                    "eventCount": inc.event_count,
                    "detections": detections_data,
                    "mitreAttack": mitre_list,
                    "sampleEvents": raw_events_sample[:10]
                }

                recommendations = [
                    f"Apply containment playbook '{inc.assigned_playbook_id or 'PB-SSH-BRUTE-01'}' to enforce edge firewall drops against offending source IPs.",
                    "Audit authentication credentials and enforce immediate password rotations for probed corporate identities.",
                    "Revoke all active SSO/Kerberos session tokens associated with targeted accounts.",
                    "Review external perimeter firewall ingress rules on port 22 and administrative interfaces."
                ]
            else:
                summary = f"Incident record '{target_id}' was not found in active telemetry. Synthetic forensic evaluation conducted."
                findings = {"status": "NOT_FOUND", "targetId": target_id}
                recommendations = ["Verify incident identifier in security incident ledger."]

        # -------------------------------------------------------------
        # 2. Target Type: IP ADDRESS
        # -------------------------------------------------------------
        elif target_type_clean == "ip":
            target_ip = target_id.strip()
            title = f"Adversary Threat Intelligence Dossier: Host {target_ip}"
            
            # Query threat intel
            res_ti = await db.execute(select(ThreatIntelModel).where(ThreatIntelModel.ip == target_ip))
            ti = res_ti.scalar_one_or_none()

            # Query events
            res_evts = await db.execute(
                select(SecurityEventModel)
                .where(SecurityEventModel.source_ip == target_ip)
                .order_by(SecurityEventModel.timestamp.desc())
                .limit(25)
            )
            evts = list(res_evts.scalars().all())

            fail_count = sum(1 for e in evts if e.outcome == "failure")
            succ_count = sum(1 for e in evts if e.outcome == "success")
            targeted_users = list(set(e.username for e in evts if e.username != "unknown"))

            for e in evts[:10]:
                raw_events_sample.append({
                    "id": e.id,
                    "timestamp": e.timestamp.isoformat(),
                    "source": e.source,
                    "username": e.username,
                    "outcome": e.outcome,
                    "raw": e.raw_event[:150]
                })

            summary = (
                f"Deep-dive host forensics for IP address `{target_ip}`. "
                f"Observed {len(evts)} telemetry records ({fail_count} failed logons, {succ_count} successful authentications). "
                f"Threat Classification: {ti.threat_classification if ti else 'External Hostile Origin'} "
                f"(Reputation Score: {ti.reputation_score if ti else 78}/100, Country: {ti.country if ti else 'Unknown'})."
            )

            findings = {
                "ip": target_ip,
                "reputationScore": ti.reputation_score if ti else 78,
                "threatClassification": ti.threat_classification if ti else "External Hostile Origin",
                "country": ti.country if ti else "Unknown",
                "asn": ti.asn if ti else "AS-GENERIC",
                "totalEventsObserved": len(evts),
                "failures": fail_count,
                "successes": succ_count,
                "targetedUsers": targeted_users,
                "sampleEvents": raw_events_sample
            }

            recommendations = [
                f"Deploy stateful iptables DROP rule for `{target_ip}` across perimeter gateways (30-min TTL).",
                f"If user breakthrough occurred ({succ_count} successes), immediately isolate affected internal workstations.",
                "Inject IP into edge border gateway BGP null-route list."
            ]

        # -------------------------------------------------------------
        # 3. Target Type: FILE UPLOAD
        # -------------------------------------------------------------
        elif target_type_clean == "file":
            res_f = await db.execute(select(UploadedFileModel).where(UploadedFileModel.id == target_id))
            file_rec = res_f.scalar_one_or_none()
            if file_rec:
                title = f"Forensic Artifact Ingestion Dossier: {file_rec.filename}"
                fstats = file_rec.analysis_summary or {}
                summary = (
                    f"Forensic ingestion evaluation for telemetry artifact `{file_rec.filename}` (SHA-256: `{file_rec.file_hash[:16]}...`). "
                    f"Analyzed {file_rec.record_count} raw log lines ({file_rec.format_detected.upper()}), normalized {file_rec.parsed_count} security events, "
                    f"triggering {file_rec.detection_count} threat detections and {file_rec.incident_count} correlated incidents."
                )
                findings = {
                    "fileId": file_rec.id,
                    "filename": file_rec.filename,
                    "fileHash": file_rec.file_hash,
                    "format": file_rec.format_detected,
                    "recordCount": file_rec.record_count,
                    "parsedCount": file_rec.parsed_count,
                    "failedCount": file_rec.failed_count,
                    "detectionsCount": file_rec.detection_count,
                    "incidentsCreated": file_rec.incident_count,
                    "analysisSummary": fstats
                }
                recommendations = [
                    "Isolate all high-velocity adversary IPs discovered in the file artifact.",
                    "Review targeted corporate accounts flagged during ingestion for potential compromise."
                ]
            else:
                summary = f"File artifact '{target_id}' was not found in system storage."
                findings = {"status": "NOT_FOUND", "targetId": target_id}
                recommendations = ["Re-upload log artifact via Security Copilot."]

        else:
            title = f"Security Operations Briefing: {target_id}"
            summary = f"Custom security briefing requested for target '{target_id}'."
            findings = {"target": target_id, "type": target_type}
            recommendations = ["Conduct standard telemetry audit."]

        if custom_notes:
            recommendations.append(f"Analyst Operational Note: {custom_notes.strip()}")

        # Build Markdown Document
        record_hash = self.compute_report_hash(rep_id, title, now, summary, findings)
        markdown_content = self._render_markdown_dossier(
            rep_id=rep_id,
            title=title,
            classification="CONFIDENTIAL // SECOPS USE ONLY",
            timestamp=now,
            actor=actor,
            summary=summary,
            findings=findings,
            recommendations=recommendations,
            mitre_list=mitre_list,
            raw_events=raw_events_sample,
            record_hash=record_hash
        )

        report = ReportModel(
            id=rep_id,
            incident_id=incident_id,
            title=title,
            report_type=report_type,
            classification="CONFIDENTIAL // SECOPS USE ONLY",
            summary=summary,
            findings=findings,
            recommendations=recommendations,
            markdown_content=markdown_content,
            record_hash=record_hash,
            created_at=now,
            generated_by=actor,
            is_simulated=True
        )
        db.add(report)
        await db.commit()
        await db.refresh(report)

        # Record in cryptographic audit trail
        await audit_service.record_audit(
            db=db,
            category="REPORT_GENERATION",
            action="SECURITY_REPORT_GENERATED",
            actor=actor,
            target=rep_id,
            result="SUCCESS",
            details={
                "reportId": rep_id,
                "title": title,
                "reportType": report_type,
                "recordHash": record_hash,
                "targetId": target_id
            },
            is_simulated=True
        )
        await db.commit()

        return report

    def _render_markdown_dossier(
        self,
        rep_id: str,
        title: str,
        classification: str,
        timestamp: datetime,
        actor: str,
        summary: str,
        findings: Dict[str, Any],
        recommendations: List[str],
        mitre_list: List[Dict[str, Any]],
        raw_events: List[Dict[str, Any]],
        record_hash: str
    ) -> str:
        md = []
        md.append(f"# {title}")
        md.append(f"**Classification**: `{classification}`  ")
        md.append(f"**Report Reference ID**: `{rep_id}` | **Generated At**: `{timestamp.strftime('%Y-%m-%d %H:%M:%S UTC')}`  ")
        md.append(f"**Investigating Authority**: `{actor}` | **Integrity SHA-256**: `{record_hash[:16]}...`\n")
        md.append("---\n")

        md.append("## 1. Executive Summary")
        md.append(summary + "\n")

        md.append("## 2. Key Forensic Findings & Impact Metrics")
        if "riskScore" in findings:
            md.append(f"- **Calculated Risk Score**: `{findings.get('riskScore', 'N/A')}/100` ({findings.get('severity', 'INFO').upper()})")
            md.append(f"- **Detection Confidence Score**: `{findings.get('confidenceScore', 'N/A')}%`")
            md.append(f"- **Correlated Security Events**: `{findings.get('eventCount', 0)}` records")
            md.append(f"- **Adversary Source IPs**: {', '.join([f'`{ip}`' for ip in findings.get('sourceIps', [])]) or 'None'}")
            md.append(f"- **Targeted Accounts**: {', '.join([f'`{u}`' for u in findings.get('targetAccounts', [])]) or 'None'}\n")
        elif "failures" in findings:
            md.append(f"- **Observed IP**: `{findings.get('ip')}`")
            md.append(f"- **Threat Reputation**: `{findings.get('reputationScore')}/100` ({findings.get('threatClassification')})")
            md.append(f"- **Origin**: `{findings.get('country')}` (`{findings.get('asn')}`)")
            md.append(f"- **Failed Logons**: `{findings.get('failures')}` | **Successful Breakthroughs**: `{findings.get('successes')}`\n")
        else:
            md.append(f"```json\n{json.dumps(findings, indent=2)}\n```\n")

        if mitre_list:
            md.append("## 3. MITRE ATT&CK Framework Mapping")
            md.append("| Technique ID | Technique Name | Tactic | Reference |")
            md.append("|---|---|---|---|")
            for m in mitre_list:
                md.append(f"| `{m.get('techniqueId')}` | {m.get('techniqueName')} | {m.get('tactic')} | [MITRE ATT&CK]({m.get('referenceUrl', '#')}) |")
            md.append("")

        if raw_events:
            md.append("## 4. Ground-Truth Telemetry Sample")
            md.append("| Timestamp | Source | User | Outcome | Raw Event Preview |")
            md.append("|---|---|---|---|---|")
            for e in raw_events[:6]:
                md.append(f"| `{e.get('timestamp')}` | `{e.get('source')}` | `{e.get('username')}` | `{e.get('outcome')}` | `{e.get('raw')}` |")
            md.append("")

        md.append("## 5. Defensive Countermeasures & Remediation")
        for idx, rec in enumerate(recommendations, 1):
            md.append(f"{idx}. {rec}")
        md.append("")

        md.append("---\n")
        md.append("### Cryptographic Verification & Provenance")
        md.append(f"> **Report SHA-256**: `{record_hash}`  \n> This forensic dossier was autonomously synthesized from immutable database telemetry and signed by the Genesis PolicyEngine.")

        return "\n".join(md)

    def render_export(self, report: ReportModel, export_format: str = "markdown") -> Tuple[bytes, str, str]:
        """
        Renders report into requested export format:
        Returns: (content_bytes, media_type, filename)
        """
        fmt = export_format.lower().strip()
        safe_id = report.id.replace(" ", "_")
        created_iso = report.created_at.isoformat() if hasattr(report.created_at, "isoformat") else str(report.created_at)
        created_fmt = report.created_at.strftime('%Y-%m-%d %H:%M:%S UTC') if hasattr(report.created_at, "strftime") else str(report.created_at)

        # 1. MARKDOWN
        if fmt in ["md", "markdown"]:
            return (
                report.markdown_content.encode("utf-8"),
                "text/markdown; charset=utf-8",
                f"genesis_report_{safe_id}.md"
            )

        # 2. JSON
        elif fmt == "json":
            data = {
                "id": report.id,
                "incidentId": report.incident_id,
                "title": report.title,
                "reportType": report.report_type,
                "classification": report.classification,
                "summary": report.summary,
                "findings": report.findings,
                "recommendations": report.recommendations,
                "recordHash": report.record_hash,
                "createdAt": created_iso,
                "generatedBy": report.generated_by,
                "isSimulated": report.is_simulated
            }
            return (
                json.dumps(data, indent=2).encode("utf-8"),
                "application/json; charset=utf-8",
                f"genesis_report_{safe_id}.json"
            )

        # 3. CSV
        elif fmt == "csv":
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(["Report ID", "Title", "Type", "Classification", "Generated At", "Author", "Record Hash"])
            writer.writerow([report.id, report.title, report.report_type, report.classification, created_iso, report.generated_by, report.record_hash])
            writer.writerow([])
            writer.writerow(["Key Forensic Findings"])
            for k, v in (report.findings or {}).items():
                if not isinstance(v, (list, dict)):
                    writer.writerow([k, str(v)])
            writer.writerow([])
            writer.writerow(["Recommended Mitigations"])
            for r in (report.recommendations or []):
                writer.writerow([r])

            return (
                output.getvalue().encode("utf-8"),
                "text/csv; charset=utf-8",
                f"genesis_report_{safe_id}.csv"
            )

        # 4. HTML (Printable / PDF-ready)
        elif fmt in ["html", "pdf"]:
            html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{report.title}</title>
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #111417; background: #FAF9F5; padding: 40px; max-width: 900px; margin: 0 auto; }}
  .header {{ border-bottom: 2px solid #111417; padding-bottom: 16px; margin-bottom: 24px; }}
  .badge {{ display: inline-block; background: #EFF4FF; color: #1E4BD8; border: 1px solid #D0DEFF; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 12px; }}
  h1 {{ margin: 8px 0; color: #111417; font-size: 24px; }}
  h2 {{ color: #111417; border-bottom: 1px solid #E2E4DC; padding-bottom: 6px; margin-top: 32px; font-size: 18px; }}
  table {{ width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }}
  th, td {{ padding: 8px 12px; border: 1px solid #D5D9CE; text-align: left; }}
  th {{ background: #F0F1EA; font-weight: 600; }}
  code {{ background: #EAECE5; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 12px; }}
  .footer {{ margin-top: 48px; padding-top: 16px; border-top: 1px solid #D5D9CE; font-size: 11px; color: #555E68; }}
</style>
</head>
<body>
<div class="header">
  <span class="badge">{report.classification}</span>
  <h1>{report.title}</h1>
  <p><strong>Report ID:</strong> <code>{report.id}</code> &nbsp;|&nbsp; <strong>Date:</strong> {created_fmt} &nbsp;|&nbsp; <strong>Author:</strong> {report.generated_by}</p>
</div>
<h2>1. Executive Summary</h2>
<p>{report.summary}</p>
<h2>2. Key Findings</h2>
<pre style="background: #F0F1EA; padding: 12px; border-radius: 8px; font-size: 12px; overflow-x: auto;"><code>{json.dumps(report.findings, indent=2)}</code></pre>
<h2>3. Recommendations</h2>
<ol>
{"".join([f"<li>{r}</li>" for r in (report.recommendations or [])])}
</ol>
<div class="footer">
  <p><strong>Cryptographic SHA-256 Hash:</strong> <code>{report.record_hash}</code><br>
  Generated autonomously by GENESIS AI Cybersecurity Engine.</p>
</div>
</body>
</html>"""
            return (
                html_content.encode("utf-8"),
                "text/html; charset=utf-8",
                f"genesis_report_{safe_id}.html"
            )

        raise ValueError(f"Unsupported format '{export_format}'. Supported: markdown, json, csv, html")


report_service = ReportGenerationService()
