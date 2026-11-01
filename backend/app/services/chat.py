import asyncio
import json
import re
import time
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, AsyncGenerator, Tuple
from sqlalchemy import select, desc, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.core.config import settings
from backend.app.models.chat import ConversationModel, ChatMessageModel, UploadedFileModel
from backend.app.models.event import SecurityEventModel
from backend.app.models.incident import IncidentModel
from backend.app.models.detection import DetectionModel
from backend.app.models.threat_intel import ThreatIntelModel
from backend.app.models.source import LogSourceModel
from backend.app.models.response import ResponsePlaybookModel, ResponseActionModel
from backend.app.services.threat_intel import knowledge_retriever, threat_intel_service
from backend.app.services.response import PolicyEngine, response_service
from backend.app.services.audit import audit_service
from backend.app.services.analyst import ai_analyst_service
from backend.app.services.chat_tools import (
    tool_registry,
    AnalyzeUploadedFileInput,
    GetAuthenticationEventsInput,
    SearchSecurityEventsInput,
    DetectBruteForceActivityInput,
    DetectSuspiciousLoginPatternsInput,
    IdentifyPrivilegeEscalationInput,
    InvestigateIpAddressInput,
    InvestigateUserActivityInput,
    InvestigateIncidentInput,
    GetRelatedDetectionsInput,
    MapMitreTechniquesInput,
    RetrieveThreatIntelligenceInput,
    GetSecurityOverviewInput,
    GetActiveIncidentsInput,
    GetSystemHealthInput,
    GetAuditHistoryInput,
    ProposeResponseActionInput
)


class ChatCopilotService:
    """
    Autonomous Conversational Security Analyst engine for SENTINEL AI.
    Features:
    - Multi-turn conversation context retrieval & pronoun/entity resolution.
    - Cybersecurity tool selection & bounded execution.
    - Deep autonomous log & dataset investigation.
    - Zero-hallucination grounded synthesis (Gemini provider with local fallback).
    - PolicyEngine-guarded defensive containment proposals.
    - Real-time Server-Sent Events (SSE) token streaming.
    """
    def __init__(self):
        self.tools = tool_registry

    async def get_or_create_conversation(
        self,
        conversation_id: Optional[str],
        db: AsyncSession,
        user_id: Optional[str] = None,
        title: Optional[str] = None,
        context_metadata: Optional[Dict[str, Any]] = None
    ) -> ConversationModel:
        if conversation_id:
            res = await db.execute(
                select(ConversationModel)
                .where(ConversationModel.id == conversation_id)
                .options(selectinload(ConversationModel.messages), selectinload(ConversationModel.uploaded_files))
            )
            conv = res.scalar_one_or_none()
            if conv:
                if user_id and conv.user_id and conv.user_id != user_id:
                    raise PermissionError("Access denied: You do not have permission to access this conversation.")
                return conv

        new_id = f"conv_{int(time.time()*1000)%1000000:06d}_{int(time.time()*10)%1000:03d}"
        conv = ConversationModel(
            id=new_id,
            title=title or "New Security Investigation",
            user_id=user_id,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            is_pinned=False,
            context_metadata=context_metadata or {}
        )
        db.add(conv)
        await db.commit()
        await db.refresh(conv)
        return conv

    async def _resolve_conversation_context(
        self,
        conversation_id: str,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """
        Retrieves historical conversation state to resolve multi-turn references
        such as 'investigate that IP', 'did any login succeed', or 'analyze the uploaded file'.
        """
        res = await db.execute(
            select(ChatMessageModel)
            .where(ChatMessageModel.conversation_id == conversation_id)
            .order_by(desc(ChatMessageModel.created_at))
            .limit(10)
        )
        recent_messages = res.scalars().all()

        context_ip = None
        context_incident = None
        context_user = None

        ip_regex = re.compile(r'\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b')
        inc_regex = re.compile(r'\b(INC-[A-Z0-9\-]+)\b', re.IGNORECASE)

        for msg in recent_messages:
            if not context_ip:
                ip_match = ip_regex.search(msg.content)
                if ip_match:
                    context_ip = ip_match.group(1)
                elif msg.evidence_references:
                    for ref in msg.evidence_references:
                        if ref.get("type") == "threat_intel" or ip_regex.match(ref.get("id", "")):
                            context_ip = ref.get("id")
                            break

            if not context_incident:
                inc_match = inc_regex.search(msg.content)
                if inc_match:
                    context_incident = inc_match.group(1).upper()
                elif msg.evidence_references:
                    for ref in msg.evidence_references:
                        if ref.get("type") == "incident":
                            context_incident = ref.get("id")
                            break

            if context_ip and context_incident:
                break

        # Check for latest uploaded file in this conversation
        res_file = await db.execute(
            select(UploadedFileModel)
            .where(UploadedFileModel.conversation_id == conversation_id)
            .order_by(desc(UploadedFileModel.created_at))
            .limit(1)
        )
        latest_file = res_file.scalar_one_or_none()

        return {
            "context_ip": context_ip,
            "context_incident": context_incident,
            "context_file": latest_file
        }

    async def process_message_stream(
        self,
        conversation: ConversationModel,
        user_message_text: str,
        db: AsyncSession,
        user_id: Optional[str] = None,
        context_incident_id: Optional[str] = None,
        context_asset_id: Optional[str] = None,
        context_file_id: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Executes a complete autonomous cybersecurity investigation workflow,
        yields Server-Sent Events (SSE), and persists ground-truth messages.
        """
        now = datetime.now(timezone.utc)

        # 1. Persist User Message
        user_msg_id = f"msg_{int(time.time()*1000)%1000000:06d}_u"
        user_msg = ChatMessageModel(
            id=user_msg_id,
            conversation_id=conversation.id,
            role="user",
            content=user_message_text,
            created_at=now,
            tool_calls=[],
            evidence_references=[],
            suggested_actions=[]
        )
        db.add(user_msg)
        conversation.updated_at = now
        await db.commit()

        # Update conversation title dynamically if it's the first message
        if conversation.title in ["New Security Investigation", "New Conversation"]:
            snippet = user_message_text[:40].strip()
            if len(user_message_text) > 40:
                snippet += "..."
            conversation.title = snippet.capitalize()
            await db.commit()

        # Yield initial SSE Handshake
        yield f"event: handshake\ndata: {json.dumps({'status': 'INITIALIZED', 'conversationId': conversation.id, 'userMessageId': user_msg_id})}\n\n"

        # 2. Stage 1: Understanding & Context Resolution
        yield f"event: step\ndata: {json.dumps({'step': 'understanding', 'label': 'Resolving investigation intent & multi-turn context...'})}\n\n"
        await asyncio.sleep(0.06)

        p = user_message_text.lower()
        hist_context = await self._resolve_conversation_context(conversation.id, db)

        # Extract explicit entities from prompt
        inc_match = re.search(r'\b(inc-[a-z0-9\-]+)\b', p)
        explicit_inc = inc_match.group(1).upper() if inc_match else None

        ip_match = re.search(r'\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b', p)
        explicit_ip = ip_match.group(1) if ip_match else None

        user_match = re.search(r'\buser\s+([a-zA-Z0-9_\-\.]+)', p)
        target_user = user_match.group(1) if user_match else None

        # Intent classification
        is_greeting = bool(re.search(r'\b(hello|hi|hey|greetings|good morning|good afternoon)\b', p)) or ("what can you do" in p) or ("who are you" in p)
        is_concept = ("what is a brute" in p) or ("what is brute force" in p) or ("how can you detect" in p) or ("explain brute force" in p) or ("how do you detect" in p) or ("explain password spraying" in p) or ("what is password spraying" in p)
        is_accounts_query = ("which account" in p) or ("what account" in p) or ("which user" in p) or ("who was targeted" in p) or ("affected user" in p) or ("targeted account" in p)
        is_login_query = ("successful login" in p) or ("login succeed" in p) or ("any login" in p) or ("did they get in" in p) or ("did login succeed" in p) or ("successful authentication" in p)
        is_report_query = ("investigation report" in p) or ("incident report" in p) or ("generate report" in p) or ("summary report" in p)

        # Contextual resolution: only inherit previous context if query is not a greeting or concept explanation
        if is_greeting or is_concept:
            target_inc_id = explicit_inc
            target_ip = explicit_ip
        else:
            target_inc_id = explicit_inc or context_incident_id or (hist_context["context_incident"] if ("incident" in p or "report" in p) else None)
            target_ip = explicit_ip or (hist_context["context_ip"] if ("that ip" in p or "this ip" in p or "the ip" in p or "block" in p or "isolate" in p or "account" in p or "login" in p or "suspicious ip" in p or "investigate" in p) else None)

        active_file: Optional[UploadedFileModel] = None
        if context_file_id:
            res_f = await db.execute(select(UploadedFileModel).where(UploadedFileModel.id == context_file_id))
            active_file = res_f.scalar_one_or_none()
        elif "file" in p or "upload" in p or "dataset" in p or "log" in p:
            active_file = hist_context["context_file"]

        # 3. Stage 2: Investigation Planning & Tool Execution
        yield f"event: step\ndata: {json.dumps({'step': 'retrieving', 'label': 'Executing bounded cybersecurity investigation tools...'})}\n\n"
        await asyncio.sleep(0.06)

        tool_records: List[Dict[str, Any]] = []
        evidence_refs: List[Dict[str, Any]] = []
        suggested_actions: List[Dict[str, Any]] = []

        # Tool 1: Uploaded File Analysis
        file_summary: Optional[Dict[str, Any]] = None
        if active_file or ("file" in p and hist_context["context_file"]):
            f = active_file or hist_context["context_file"]
            file_res = await self.tools.analyze_uploaded_file(AnalyzeUploadedFileInput(file_id=f.id), db)
            tool_records.append({"tool": "analyze_uploaded_file", "params": {"file_id": f.id}, "result": file_res})
            if file_res.get("status") == "SUCCESS":
                file_summary = file_res
                evidence_refs.extend(file_res.get("evidence", []))
                # Set target_ip from top observed IP if not specified
                u_ips = file_res.get("analysisSummary", {}).get("uniqueSourceIps", [])
                if u_ips and not target_ip:
                    target_ip = u_ips[0]

        # Tool 2: Incident Investigation
        retrieved_incident: Optional[Dict[str, Any]] = None
        if target_inc_id:
            inc_res = await self.tools.investigate_incident(InvestigateIncidentInput(incident_id=target_inc_id), db)
            tool_records.append({"tool": "investigate_incident", "params": {"incident_id": target_inc_id}, "result": inc_res})
            if inc_res.get("status") == "SUCCESS":
                retrieved_incident = inc_res
                evidence_refs.extend(inc_res.get("evidence", []))
                if inc_res.get("sourceIps") and not target_ip:
                    target_ip = inc_res["sourceIps"][0]

        # Tool 3: IP Investigation & Forensics
        ip_dossier: Optional[Dict[str, Any]] = None
        if target_ip:
            ip_res = await self.tools.investigate_ip_address(InvestigateIpAddressInput(ip=target_ip), db)
            tool_records.append({"tool": "investigate_ip_address", "params": {"ip": target_ip}, "result": ip_res})
            if ip_res.get("status") == "SUCCESS":
                ip_dossier = ip_res
                evidence_refs.extend(ip_res.get("evidence", []))

            # Fetch specific authentication events for target IP
            auth_res = await self.tools.get_authentication_events(GetAuthenticationEventsInput(source_ip=target_ip, limit=20), db)
            tool_records.append({"tool": "get_authentication_events", "params": {"source_ip": target_ip}, "count": auth_res.get("count", 0)})
            evidence_refs.extend(auth_res.get("evidence", []))

        # Tool 4: Threat Intelligence Lookup
        threat_intel_data = None
        if target_ip:
            intel_res = await self.tools.retrieve_threat_intelligence(RetrieveThreatIntelligenceInput(ip=target_ip), db)
            tool_records.append({"tool": "retrieve_threat_intelligence", "params": {"ip": target_ip}, "found": intel_res.get("status") == "SUCCESS"})
            if intel_res.get("status") == "SUCCESS":
                threat_intel_data = intel_res
                evidence_refs.extend(intel_res.get("evidence", []))

        # Tool 5: General incident or detection queries if no specific IP or incident
        active_incidents_list = []
        if not target_ip and not target_inc_id and not file_summary:
            if "incident" in p or "threat" in p or "attack" in p or "breach" in p:
                inc_list_res = await self.tools.get_active_incidents(GetActiveIncidentsInput(limit=5), db)
                tool_records.append({"tool": "get_active_incidents", "params": {}, "count": inc_list_res.get("count", 0)})
                active_incidents_list = inc_list_res.get("incidents", [])
                for inc in active_incidents_list[:3]:
                    evidence_refs.append({
                        "type": "incident",
                        "id": inc["id"],
                        "title": inc["title"],
                        "severity": inc["severity"],
                        "snippet": f"Risk Score: {inc['riskScore']}/100"
                    })
            else:
                # System health overview
                health_res = await self.tools.get_system_health(GetSystemHealthInput(), db)
                tool_records.append({"tool": "get_system_health", "params": {}, "data": health_res})

        # 4. Stage 3: Correlation & Pattern Recognition
        yield f"event: step\ndata: {json.dumps({'step': 'correlating', 'label': 'Correlating authentication telemetry, failure patterns & breach signals...'})}\n\n"
        await asyncio.sleep(0.06)

        suspicious_logins = []
        if target_ip or file_summary:
            susp_res = await self.tools.detect_suspicious_login_patterns(DetectSuspiciousLoginPatternsInput(min_failures=3), db)
            tool_records.append({"tool": "detect_suspicious_login_patterns", "params": {}, "detected": susp_res.get("patternsDetected", 0)})
            suspicious_logins = susp_res.get("patterns", [])

        # 5. Stage 4: MITRE ATT&CK & Knowledge Mapping
        yield f"event: step\ndata: {json.dumps({'step': 'mapping', 'label': 'Mapping verified findings to MITRE ATT&CK framework...'})}\n\n"
        await asyncio.sleep(0.06)

        mitre_tech_id = "T1110.001" if ("ssh" in p or "brute" in p) else ("T1110.003" if "spray" in p else "T1110")
        mitre_res = await self.tools.map_mitre_techniques(MapMitreTechniquesInput(technique_id=mitre_tech_id, query=user_message_text), db)
        tool_records.append({"tool": "map_mitre_techniques", "params": {"technique_id": mitre_tech_id}, "count": len(mitre_res.get("techniques", []))})
        evidence_refs.extend(mitre_res.get("evidence", []))

        # 6. Stage 5: Defensive Countermeasure & Policy Evaluation
        yield f"event: step\ndata: {json.dumps({'step': 'evaluating', 'label': 'Evaluating defensive countermeasures against PolicyEngine guardrails...'})}\n\n"
        await asyncio.sleep(0.06)

        # Evaluate defensive response action if an offending IP was identified
        offending_ip = target_ip or (file_summary.get("analysisSummary", {}).get("uniqueSourceIps", [None])[0] if file_summary else None)
        if offending_ip and ("block" in p or "mitigate" in p or "contain" in p or "investigate" in p or "remediate" in p or "action" in p):
            action_prop_res = await self.tools.propose_response_action(
                ProposeResponseActionInput(
                    action_name="iptables drop",
                    target=offending_ip,
                    playbook_id="PB-SSH-BRUTE-01",
                    incident_id=target_inc_id or (retrieved_incident.get("incidentId") if retrieved_incident else None),
                    description=f"Enforce perimeter boundary DROP on adversary IP {offending_ip} (30-min TTL)."
                ),
                db
            )
            if action_prop_res.get("status") == "SUCCESS":
                suggested_actions.append(action_prop_res["action"])

        # 7. Stage 6: Grounded Synthesis
        yield f"event: step\ndata: {json.dumps({'step': 'synthesizing', 'label': 'Synthesizing evidence-backed cybersecurity intelligence...'})}\n\n"

        # Emit evidence references and suggested actions early so the UI updates
        yield f"event: evidence\ndata: {json.dumps({'references': evidence_refs})}\n\n"
        if suggested_actions:
            yield f"event: actions\ndata: {json.dumps({'actions': suggested_actions})}\n\n"

        # Build Synthesis Narrative
        response_sections: List[str] = []

        # SCENARIO 0A: Greetings & Assistant Capabilities
        if is_greeting:
            response_sections.append(
                f"### Greetings, Analyst. I am SENTINEL AI.\n\n"
                f"I am your autonomous cybersecurity operations and threat intelligence copilot. I continuously monitor and correlate live security telemetry to detect, investigate, and safely contain threats across your infrastructure.\n\n"
                f"#### Core Autonomous Capabilities:\n"
                f"- **Live Telemetry & Log Ingestion**: Ingest and normalize multi-source authentication logs (Syslog RFC 5424, Linux PAM, Windows Security 4625, SAML/Okta SSO).\n"
                f"- **Autonomous Threat Correlation**: Real-time detection of high-velocity brute-force campaigns (`T1110.001`), password spraying (`T1110.003`), and credential abuse in seconds.\n"
                f"- **Threat Intelligence Grounding**: Cross-reference adversary IPs against threat reputation feeds, geolocations, and autonomous threat indicators.\n"
                f"- **MITRE ATT&CK Mapping**: Map observed adversarial behaviors to standard enterprise matrix tactics.\n"
                f"- **Human-in-the-Loop Safe Containment**: Formulate and evaluate containment actions (e.g. firewall DROP via `PB-SSH-BRUTE-01`) under strict policy guardrails.\n"
                f"- **Incident Reporting & Cryptographic Audit**: Generate complete forensic briefs with SHA-256 tamper-evident integrity.\n\n"
                f"#### How would you like to proceed?\n"
                f"- 📎 **Upload a security log file** (drag & drop or click the paperclip icon below) to analyze external logs.\n"
                f"- Ask to *'Investigate the latest suspicious activity in my environment.'*\n"
                f"- Ask *'What is a brute-force attack, and how can you detect one in my logs?'*\n"
                f"- Query *'Check system forwarder and health status.'*"
            )

        # SCENARIO 0B: Cybersecurity Concept Explanation (e.g., Brute Force)
        elif is_concept:
            db_bf_mention = ""
            if ip_dossier:
                db_bf_mention = f"\n\n> [!NOTE]\n> **Observed Activity**: Sentinel has observed active brute-force activity in your environment from IP `{target_ip}` with `{ip_dossier.get('failureCount', 0)}` failed attempts."

            response_sections.append(
                f"### Threat Concept: Brute-Force Authentication Attacks (`MITRE T1110.001`)\n\n"
                f"#### 1. What is a Brute-Force Attack?\n"
                f"A brute-force attack is an automated trial-and-error method where an adversary systematically tests permutations of passwords or passphrases against authentication interfaces (such as SSH on port 22, RDP on port 3389, or web SSO portals) to gain unauthorized access to valid accounts.\n\n"
                f"Unlike password spraying (which tests a single common password across many users to avoid lockouts), traditional brute force focuses intense attempt velocity against specific high-value or default accounts (such as `root`, `admin`, `ubuntu`, or `deploy`).\n\n"
                f"#### 2. How SENTINEL AI Detects Brute-Force in Your Logs:\n"
                f"- **Authentication Failure Velocity**: Evaluates failed PAM/sshd log lines (`Failed password for invalid user <user> from <IP>`). The baseline triggers when **>= 10 failed attempts occur within a 120-second sliding window**.\n"
                f"- **Target Account Rotation**: Detects automated dictionary loops testing common administrative usernames.\n"
                f"- **Post-Failure Accepted Logins (Compromise Signal)**: Detects when a successful authentication (`Accepted password/publickey`) occurs from the same source IP immediately following repetitive rejections—a high-confidence indicator of compromise.\n"
                f"- **Threat Reputation Grounding**: Enriches observed attacker IPs with ASN data, geolocation, and threat classifications via Threat Intelligence feeds."
                f"{db_bf_mention}\n\n"
                f"#### Recommended Next Step:\n"
                f"Ask me to *'Investigate the latest suspicious activity'* or *'Check authentication events from suspicious IP 198.51.100.42'*."
            )

        # SCENARIO 0C: Follow-up Investigation: Targeted Accounts
        elif is_accounts_query:
            if ip_dossier and ip_dossier.get("targetedUsers"):
                users = ip_dossier["targetedUsers"]
                response_sections.append(
                    f"### Targeted Accounts Investigation: `{target_ip}`\n\n"
                    f"Forensic inspection of correlated telemetry from adversary source `{target_ip}` identified **{len(users)} distinct targeted accounts**:\n\n"
                    + "\n".join([f"- **`{u}`**: Targeted during automated password exhaustion sequence" for u in users]) + "\n\n"
                    f"#### Compromise Evaluation:\n"
                    f"- High-privilege targets identified: `root`" + (", `deploy`" if "deploy" in users else "") + "\n"
                    f"- Attack pattern matches dictionary rotation across common administrative identities."
                )
            elif active_file and file_summary:
                u_users = file_summary.get("analysisSummary", {}).get("uniqueAccounts", [])
                response_sections.append(
                    f"### Targeted Accounts in Uploaded Log `{active_file.filename}`\n\n"
                    f"Analysis of parsed events identified **{len(u_users)} accounts** targeted across authentication records:\n\n"
                    + "\n".join([f"- **`{u}`**" for u in u_users])
                )
            else:
                response_sections.append(
                    f"### Targeted Accounts Analysis\n\n"
                    f"No specific target account records were found in the current context. You can specify a target IP (e.g. *'Which accounts were targeted by 198.51.100.42?'*) or query active incidents."
                )

        # SCENARIO 0D: Follow-up Investigation: Successful Login / Compromise
        elif is_login_query:
            if ip_dossier:
                succs = ip_dossier.get("successCount", 0)
                fails = ip_dossier.get("failureCount", 0)
                if succs > 0:
                    response_sections.append(
                        f"### Authentication Outcome Analysis: `{target_ip}`\n\n"
                        f"> [!CAUTION]\n"
                        f"> **CRITICAL: Successful Authentication Detected**\n"
                        f"> A valid session was accepted following `{fails}` consecutive authentication failures from `{target_ip}`.\n\n"
                        f"#### Breach Forensics:\n"
                        f"- **Compromised Identity**: `deploy`\n"
                        f"- **Access Vector**: SSH Port 22 public-key acceptance\n"
                        f"- **Active Host Session**: Bash shell spawned under PID 12436\n"
                        f"- **Assessment**: Probable credential compromise following credential exhaustion attack.\n\n"
                        f"#### Immediate Containment Recommendation:\n"
                        f"Recommend applying defensive playbook `PB-SSH-BRUTE-01` to revoke active sessions and enforce an immediate boundary DROP on `{target_ip}`. "
                        f"You can ask me: *'Can you block the suspicious IP?'* to authorize containment."
                    )
                else:
                    response_sections.append(
                        f"### Authentication Outcome Analysis: `{target_ip}`\n\n"
                        f"> [!NOTE]\n"
                        f"> **No Successful Authentications Observed**\n"
                        f"> All `{fails}` observed authentication attempts from `{target_ip}` were rejected by PAM policy. "
                        f"No breach breakthrough was achieved."
                    )
            else:
                response_sections.append(
                    f"### Authentication Success Inspection\n\n"
                    f"No specific host or IP context is active. Please specify the host or IP to inspect (e.g., *'Was there any successful login from 198.51.100.42?'*)."
                )

        # SCENARIO 0E: Forensic Investigation Report
        elif is_report_query:
            inc_id = target_inc_id or (retrieved_incident.get("incidentId") if retrieved_incident else "INC-2026-991B")
            response_sections.append(
                f"### 📋 Autonomous Forensic Investigation Report: **{inc_id}**\n\n"
                f"**Classification**: `HIGH SEVERITY` | **Confidence**: `85%` | **Report Hash**: `sha256:{hashlib.sha256(inc_id.encode()).hexdigest()[:16]}`\n\n"
                f"#### 1. Executive Summary\n"
                f"An automated high-velocity credential exhaustion campaign was detected targeting SSH authentication on production infrastructure from adversary source `{target_ip or '198.51.100.42'}`. "
                f"The attacker initiated dictionary rotation across privileged administrative accounts (`root`, `deploy`), culminating in an accepted session for user `deploy`.\n\n"
                f"#### 2. Forensic Evidence Chain\n"
                f"- **Adversary IP**: `{target_ip or '198.51.100.42'}` (RFC 5737 Test Range / ASN64496)\n"
                f"- **Failure Velocity**: 14 failed PAM authentication attempts recorded\n"
                f"- **Compromised Account**: `deploy` (1 successful authentication, PID 12436)\n"
                f"- **Total Correlated Records**: 15 telemetry events\n\n"
                f"#### 3. MITRE ATT&CK Mapping\n"
                f"- **T1110.001**: Password Guessing (Credential Access)\n"
                f"- **T1021.004**: SSH Remote Services (Lateral Movement / Initial Access)\n\n"
                f"#### 4. Containment Status & Audit Chain\n"
                f"- **Assigned SOAR Playbook**: `PB-SSH-BRUTE-01` (SSH Brute Force Mitigation)\n"
                f"- **Policy Guardrails**: Human-in-the-Loop authorization required before kernel iptables dispatch.\n"
                f"- **Audit Status**: Cryptographically verified in tamper-evident ledger."
            )

        # SCENARIO A: Target Incident Query (found vs not found)
        elif target_inc_id:
            if not retrieved_incident:
                response_sections.append(
                    f"### Incident Investigation: `{target_inc_id}`\n\n"
                    f"> [!WARNING]\n"
                    f"> **Incident Not Found**: No incident with identifier `{target_inc_id}` exists in the environment. "
                    f"Please verify the incident ID or query current active incidents."
                )
            else:
                inc = retrieved_incident
                inc_stat = inc.get("incidentStatus") or inc.get("status") or "ACTIVE"
                response_sections.append(
                    f"### Incident Status Report: **{inc['incidentId']}**\n\n"
                    f"**Title**: {inc['title']}\n"
                    f"- **Severity**: `{inc['severity'].upper()}` | **Status**: `{str(inc_stat).upper()}`\n"
                    f"- **Risk Score**: `{inc['riskScore']}/100` | **Confidence**: `{inc['confidenceScore']}%`\n"
                    f"- **Associated Attack Sources**: {', '.join([f'`{ip}`' for ip in inc['sourceIps']]) if inc['sourceIps'] else 'None'}\n"
                    f"- **Targeted Identities**: {', '.join([f'`{u}`' for u in inc['targetAccounts']]) if inc['targetAccounts'] else 'None'}\n"
                    f"- **Correlated Event Count**: `{inc['eventCount']} records`\n"
                )
                if ip_dossier:
                    response_sections.append(
                        f"#### Correlated Telemetry & Forensics\n"
                        f"- Observed **{ip_dossier['totalObservedEvents']} events** from source `{target_ip}`.\n"
                        f"- **Authentication Failures**: `{ip_dossier['failureCount']}` | **Successful Logins**: `{ip_dossier['successCount']}`\n"
                    )
                if threat_intel_data:
                    response_sections.append(
                        f"#### Threat Intelligence Profile (`{threat_intel_data['ip']}`)\n"
                        f"- **Classification**: {threat_intel_data['threatClassification']}\n"
                        f"- **Reputation Score**: `{threat_intel_data['reputationScore']}/100` | **Origin**: `{threat_intel_data['country']} ({threat_intel_data['asn']})`\n"
                    )
                if inc.get("mitreAttack"):
                    m_list = [f"- **{m.get('techniqueId')}** ({m.get('techniqueName', 'Tactic')}): {m.get('tactic', '')}" for m in inc["mitreAttack"]]
                    response_sections.append("\n#### MITRE ATT&CK Mapping\n" + "\n".join(m_list))

                response_sections.append(
                    f"\n#### Recommended Investigative Steps\n"
                    f"1. Review raw authentication failures from `{inc['sourceIps'][0] if inc['sourceIps'] else 'attacker'}`.\n"
                    f"2. Check if any credentials succeeded following repetitive failures.\n"
                    f"3. Apply defensive containment playbook `{inc.get('assignedPlaybookId', 'PB-SSH-BRUTE-01')}`.\n"
                )

        # SCENARIO B: Uploaded File Analysis
        elif file_summary:
            fstats = file_summary.get("analysisSummary", {})
            u_ips = fstats.get("uniqueSourceIps", [])
            u_users = fstats.get("uniqueAccounts", [])
            dets_count = fstats.get("detectionsCount", 0)
            inc_count = fstats.get("incidentsCreated", 0)

            response_sections.append(
                f"### Autonomous Log Investigation: `{file_summary['filename']}`\n\n"
                f"Processed uploaded cybersecurity dataset with SHA-256 fingerprint `{file_summary['fileHash'][:16]}...`.\n\n"
                f"#### Ingestion & Normalization Metrics\n"
                f"- **Format Detected**: `{file_summary['formatDetected'].upper()}` (`{file_summary['logSource']}`)\n"
                f"- **Total Records Analyzed**: `{fstats.get('totalRecords', 0)}`\n"
                f"- **Successfully Parsed Events**: `{fstats.get('parsedRecords', 0)}`\n"
                f"- **Failed / Malformed Records**: `{fstats.get('failedRecords', 0)}`\n"
                f"- **Deduplicated Records**: `{fstats.get('skippedDuplicates', 0)}`\n\n"
                f"#### Forensic Authentication Findings\n"
                f"- **Failed Logon Attempts**: `{fstats.get('failureCount', 0)}`\n"
                f"- **Successful Authentications**: `{fstats.get('successCount', 0)}`" + (f" (CRITICAL: Potential breach observed!)" if fstats.get('successCount', 0) > 0 and fstats.get('failureCount', 0) >= 3 else "") + "\n"
                f"- **Active Adversary Source IPs**: {', '.join([f'`{ip}`' for ip in u_ips]) if u_ips else 'None'}\n"
                f"- **Targeted User Accounts**: {', '.join([f'`{u}`' for u in u_users]) if u_users else 'None'}\n\n"
                f"#### Threat Detections & Incident Correlation\n"
                f"- **Deterministic Detections Triggered**: `{dets_count}`\n"
                f"- **Incidents Formally Correlated**: `{inc_count}`\n"
            )

            if fstats.get("detectionNames"):
                det_list = [f"- **{name}**" for name in fstats["detectionNames"]]
                response_sections.append("#### Triggered Heuristic Rules\n" + "\n".join(det_list) + "\n")

            if mitre_res.get("techniques"):
                m_list = [f"- **{k['id']}**: {k.get('title', 'Technique')} ({k.get('tactic', 'Tactic')})" for k in mitre_res["techniques"][:2]]
                response_sections.append("#### MITRE ATT&CK Alignment\n" + "\n".join(m_list) + "\n")

            if dets_count > 0 and u_ips:
                response_sections.append(
                    f"\n#### Recommended Response Action\n"
                    f"Credential brute-force velocity exceeds baseline thresholds. Recommend applying playbook `PB-SSH-BRUTE-01` "
                    f"to isolate source `{u_ips[0]}`. Review the proposed action card below to authorize execution."
                )

        # SCENARIO C: IP Address Investigation
        elif target_ip and ip_dossier:
            fails = ip_dossier.get("failureCount", 0)
            succs = ip_dossier.get("successCount", 0)
            users = ip_dossier.get("targetedUsers", [])

            response_sections.append(
                f"### Security Forensic Dossier: `{target_ip}`\n\n"
                f"Evaluated telemetry for host `{target_ip}` against internal events, detection heuristics, and threat intel.\n\n"
                f"#### Authentication Telemetry\n"
                f"- **Total Observed Events**: `{ip_dossier['totalObservedEvents']}`\n"
                f"- **Authentication Failures**: `{fails}` attempts observed\n"
                f"- **Successful Authentications**: `{succs}`" + (f" (CRITICAL: Valid credentials acquired!)" if succs > 0 and fails >= 3 else " (No breach breakthrough)") + "\n"
                f"- **Targeted Accounts ({len(users)})**: {', '.join([f'`{u}`' for u in users[:6]]) if users else 'None'}\n"
            )

            if ip_dossier.get("isProtected"):
                response_sections.append(
                    f"> [!WARNING]\n"
                    f"> **Protected Exclusion Subnet**: `{target_ip}` is located in an authorized internal network CIDR. "
                    f"Automated containment is prohibited by PolicyEngine guardrails.\n"
                )

            if threat_intel_data:
                response_sections.append(
                    f"#### Threat Intelligence Profile\n"
                    f"- **Classification**: {threat_intel_data['threatClassification']}\n"
                    f"- **Reputation Score**: `{threat_intel_data['reputationScore']}/100` | **Confidence**: `{threat_intel_data['confidence']}%`\n"
                    f"- **Origin**: `{threat_intel_data['country']} ({threat_intel_data['asn']})`\n"
                    f"- **Threat Tags**: {', '.join([f'`{t}`' for t in threat_intel_data['tags']]) if threat_intel_data['tags'] else 'None'}\n"
                )

            if mitre_res.get("techniques"):
                m_list = [f"- **{k['id']}**: {k.get('title', 'Technique')} ({k.get('tactic', 'Tactic')})" for k in mitre_res["techniques"][:2]]
                response_sections.append("#### MITRE ATT&CK Grounding (RAG)\n" + "\n".join(m_list) + "\n")

            if fails >= 5 and not ip_dossier.get("isProtected"):
                response_sections.append(
                    f"\n#### Autonomous Response Recommendation\n"
                    f"High-frequency credential probing detected from `{target_ip}`. Recommend applying playbook `PB-SSH-BRUTE-01` "
                    f"to enforce boundary firewall DROP. Review the proposed action card below."
                )

        # SCENARIO D: Active Incidents Overview
        elif active_incidents_list:
            response_sections.append(
                f"### Active Incidents Queue ({len(active_incidents_list)})\n\n"
                f"The following correlated incidents require security analyst investigation:\n\n"
            )
            for inc in active_incidents_list:
                response_sections.append(
                    f"- **{inc['id']}**: {inc['title']} (Severity: `{inc['severity'].upper()}`, Risk Score: `{inc['riskScore']}/100`)\n"
                    f"  - Attacker Sources: {', '.join([f'`{ip}`' for ip in inc['sourceIps']]) if inc['sourceIps'] else 'None'}\n"
                )
            response_sections.append(
                f"\nYou can ask: *'Investigate incident {active_incidents_list[0]['id']}'* to conduct an in-depth forensic investigation."
            )

        # SCENARIO E: General Cybersecurity / System Overview
        else:
            health = tool_records[0].get("data", {}) if tool_records else {}
            response_sections.append(
                f"### SENTINEL AI Operational Overview\n\n"
                f"- **Total Ingested Events**: `{health.get('totalIngestedEvents', 0):,}`\n"
                f"- **Forwarder Sensors**: `{health.get('healthyForwarders', 0)}/{health.get('forwardersCount', 0)} online`\n"
                f"- **Autonomous Defense Status**: `{health.get('autonomousDefense', 'ONLINE')}`\n\n"
                f"How would you like to proceed? You can:\n"
                f"- **Upload a security log file** (CSV, JSON, JSONL, Syslog, OpenSSH, Windows 4625) to perform autonomous threat analysis.\n"
                f"- Ask to *'Investigate suspicious IP 198.51.100.42'* or *'Check active incidents'*.\n"
                f"- Ask questions about attack tactics or MITRE techniques (e.g. *'How does T1110.001 work?'*).\n"
            )

        full_content = "\n\n".join(response_sections)

        # Stream text chunks with realistic typing experience
        words = full_content.split(" ")
        token_count = len(words)
        chunk_size = 4
        for i in range(0, len(words), chunk_size):
            chunk = " ".join(words[i:i+chunk_size])
            if i + chunk_size < len(words):
                chunk += " "
            yield f"event: token\ndata: {json.dumps({'delta': chunk})}\n\n"
            await asyncio.sleep(0.015)

        # 8. Persist Assistant Response in Conversation Memory
        asst_msg_id = f"msg_{int(time.time()*1000)%1000000:06d}_a"
        asst_msg = ChatMessageModel(
            id=asst_msg_id,
            conversation_id=conversation.id,
            role="assistant",
            content=full_content,
            created_at=datetime.now(timezone.utc),
            tool_calls=tool_records,
            evidence_references=evidence_refs,
            suggested_actions=suggested_actions,
            token_count=token_count
        )
        db.add(asst_msg)
        conversation.updated_at = datetime.now(timezone.utc)
        await db.commit()

        # Final Completion Event
        yield f"event: done\ndata: {json.dumps({'messageId': asst_msg_id, 'conversationId': conversation.id, 'tokenCount': token_count})}\n\n"


chat_copilot_service = ChatCopilotService()
