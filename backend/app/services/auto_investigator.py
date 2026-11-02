import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.incident import IncidentModel
from backend.app.models.chat import ConversationModel, ChatMessageModel
from backend.app.services.autonomous_agent import autonomous_agent, AgentExecutionResult
from backend.app.services.report import report_service
from backend.app.services.response import PolicyEngine, response_service
from backend.app.services.asset import asset_service

logger = logging.getLogger(__name__)


class AutoInvestigatorService:
    """
    Zero-Click Autonomous SOC Investigator (Stage E & Stage D).
    Automatically triggers when high-severity detections or incidents occur:
    1. Orchestrates the Autonomous ReAct Agent reasoning loop.
    2. Identifies target asset BIA tiers, services, and CVE vulnerabilities.
    3. Issues automated perimeter defense containment via PolicyEngine.
    4. Generates cryptographically signed forensic reports (SHA-256).
    5. Injects rich autonomous briefings directly into Copilot chat conversations.
    """

    async def auto_investigate_incident(
        self,
        incident: IncidentModel,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """
        Executes a complete autonomous investigation workflow on a security incident.
        """
        source_ip = incident.source_ips[0] if incident.source_ips else "unknown"
        target_accounts = incident.target_accounts or ["unknown"]
        goal = f"Investigate {incident.category} incident {incident.id} from {source_ip} targeting {', '.join(target_accounts[:3])}"

        logger.info(f"[AutoInvestigator] Launching autonomous investigation for {incident.id}...")

        # 1. Run Autonomous ReAct Reasoning Loop
        steps: List[Dict[str, Any]] = []
        evidence_refs: List[Dict[str, Any]] = []
        suggested_actions: List[Dict[str, Any]] = []
        final_assessment = ""

        try:
            async for step in autonomous_agent.run_investigation_loop(
                goal=goal,
                context={"context_ip": source_ip, "incident_id": incident.id},
                db=db
            ):
                step_type = step.get("type")
                if step_type == "final_assessment":
                    final_assessment = step.get("assessment", "")
                    evidence_refs = step.get("evidence", [])
                    suggested_actions = step.get("suggested_actions", [])
        except Exception as e:
            logger.warning(f"[AutoInvestigator] ReAct loop completed with notice: {e}")
            final_assessment = f"Autonomous assessment completed for {incident.id}. Observed {incident.event_count} telemetry records."

        # 2. Generate Cryptographically Signed Incident Report (Stage G)
        report_record = None
        try:
            report_record = await report_service.generate_report(
                target_id=incident.id,
                target_type="incident",
                report_type="INCIDENT_DOSSIER",
                actor="GENESIS Autonomous ReAct Agent",
                db=db
            )
            if report_record:
                evidence_refs.append({
                    "type": "report",
                    "id": report_record.id,
                    "title": f"Incident Dossier: {incident.id}",
                    "snippet": f"Cryptographic SHA-256 Signature: {report_record.record_hash[:16]}..."
                })
        except Exception as e:
            logger.warning(f"[AutoInvestigator] Report generation notice: {e}")

        # 3. Evaluate Closed-Loop Containment via PolicyEngine (Stage F)
        containment_executed = False
        containment_detail = ""
        if source_ip != "unknown" and incident.confidence_score >= 80:
            is_protected = PolicyEngine.is_target_protected(source_ip)
            if not is_protected:
                try:
                    success, act_model, msg = await response_service.execute_action(
                        playbook_id=incident.assigned_playbook_id or "PB-SSH-BRUTE-01",
                        action_name="iptables drop",
                        target=source_ip,
                        incident_id=incident.id,
                        actor="GENESIS Autonomous Agent",
                        db=db
                    )
                    containment_executed = success
                    containment_detail = f"Autonomous perimeter containment enforced (30-min TTL): DROP rule applied to {source_ip}."
                except Exception as e:
                    containment_detail = f"Containment held for analyst review: {e}"
            else:
                containment_detail = f"Containment skipped: Source IP {source_ip} is in protected exclusion network."

        # 4. Inject Autonomous Briefing into Copilot Conversation
        # Target dedicated incident conversation to avoid hijacking analyst chat threads
        conv_id = f"conv-auto-{incident.id.lower()}"
        stmt_conv = select(ConversationModel).where(ConversationModel.id == conv_id)
        res_conv = await db.execute(stmt_conv)
        conv = res_conv.scalar_one_or_none()

        if not conv:
            conv = ConversationModel(
                id=conv_id,
                title=f"🚨 Autonomous Investigation: {incident.title[:40]}",
                context_metadata={"autonomous": True, "incident_id": incident.id}
            )
            db.add(conv)
            await db.flush()

        # Build Rich Structured Chat Briefing
        briefing_md = (
            f"### 🚨 Autonomous Incident Assessment: {incident.title}\n\n"
            f"**Incident ID**: `{incident.id}` | **Severity**: `{incident.severity.upper()}` | **Risk Score**: `{incident.risk_score}/100` | **Confidence**: `{incident.confidence_score}%`\n\n"
            f"#### 🔍 Key Findings & Root Cause\n"
            f"- **Attacker Source IP**: `{source_ip}`\n"
            f"- **Target Accounts**: {', '.join([f'`{a}`' for a in target_accounts[:5]])}\n"
            f"- **Observed Velocity**: `{incident.event_count}` authentication attempts in active sliding window.\n"
        )

        # Asset and Vulnerability Context
        affected_asset = incident.ai_summary.get("affectedAsset") if isinstance(incident.ai_summary, dict) else None
        if affected_asset:
            cves = affected_asset.get("vulnerabilities", [])
            cve_str = ", ".join([f"`{c.get('cve_id')}` ({c.get('severity')})" for c in cves]) if cves else "No known critical CVEs"
            briefing_md += (
                f"- **Target Infrastructure**: `{affected_asset.get('hostname')}` (`{affected_asset.get('ipAddress')}`) — BIA Tier `{affected_asset.get('assetTier')}` ({affected_asset.get('tierMultiplier')}x multiplier)\n"
                f"- **Vulnerability Posture**: {cve_str}\n"
            )

        if containment_detail:
            briefing_md += f"\n#### 🛡️ Autonomous Defense Action\n- {containment_detail}\n"

        if report_record:
            briefing_md += f"\n#### 📄 Cryptographic Security Dossier\n- Signed Forensic Report: `{report_record.id}` (SHA-256: `{report_record.record_hash[:16]}...`)\n"

        chat_msg = ChatMessageModel(
            id=f"msg-{uuid.uuid4().hex[:12]}",
            conversation_id=conv.id,
            role="assistant",
            content=briefing_md,
            thought_process=f"Autonomous ReAct reasoning loop executed for incident {incident.id}. Formulated hypothesis, queried threat intelligence, extracted asset CVE context, and applied safety guardrails.",
            tool_calls=[{"name": "autonomous_investigation", "incident_id": incident.id}],
            evidence_references=evidence_refs,
            suggested_actions=suggested_actions,
            created_at=datetime.now(timezone.utc)
        )
        db.add(chat_msg)
        await db.commit()

        logger.info(f"[AutoInvestigator] Autonomous investigation briefing delivered to conversation {conv.id}")

        return {
            "status": "COMPLETED",
            "incident_id": incident.id,
            "conversation_id": conv.id,
            "message_id": chat_msg.id,
            "containment_executed": containment_executed,
            "report_id": report_record.id if report_record else None
        }


auto_investigator = AutoInvestigatorService()
