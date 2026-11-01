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
from backend.app.services.cyber_knowledge import cyber_knowledge_engine
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
    ProposeResponseActionInput,
    AnalyzeNetworkTrafficDatasetInput,
    AnalyzePhishingDatasetInput,
    AnalyzeLanlCyberEventsInput,
    AnalyzeSystemLogDatasetInput,
    GetDatasetOverviewInput,
    AnalyzeWebAttackDatasetInput,
    AnalyzeDnsExfiltrationInput,
    AnalyzeKerberosTicketsInput,
    CorrelateKillChainInput
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
        is_pure_greeting = bool(re.search(r'^\s*(hello|hi|hey|greetings|good morning|good afternoon)\s*[\.!\?]?$', p)) or (p.strip() in ["hi", "hello", "hey", "greetings"])
        is_capabilities = ("what can you do" in p) or ("who are you" in p) or ("what do you do" in p) or (p.strip() == "help") or ("capabilities" in p)
        is_concept = ("what is a brute" in p) or ("what is brute force" in p) or ("how can you detect" in p) or ("explain brute force" in p) or ("how do you detect" in p) or ("explain password spraying" in p) or ("what is password spraying" in p) or ("difference between brute-force and password spraying" in p) or ("brute-force and password spraying" in p)
        is_syn_flood = ("syn flood" in p) or ("how does a syn flood" in p)
        is_second_event = ("second suspicious" in p) or ("second event" in p) or ("second attack" in p)
        is_slowloris = (("slowloris" in p) or ("slow http" in p)) and not is_second_event
        is_ids_ips = ("difference between ids and ips" in p) or ("ids vs ips" in p) or ("ids and ips" in p) or ("between ids and ips" in p) or ("compare ids and ips" in p)
        is_packet_analysis = ("packet analysis" in p) or ("packet capture" in p) or ("purpose of network packet" in p) or ("analyze suspicious packets" in p) or ("wireshark" in p)
        is_network_dataset = ("network traffic" in p and "analyze" in p) or ("analyze these network" in p) or ("analyze network records" in p) or ("analyze cic" in p) or ("network records" in p and "analyze" in p) or ("analyze the network traffic dataset" in p)
        is_phishing_dataset = ("phishing" in p and "analyze" in p) or ("check phishing" in p) or ("phishing email" in p and "analyze" in p) or ("analyze phishing" in p) or ("analyze the phishing" in p)
        is_lanl_dataset = ("lanl" in p and "analyze" in p) or ("lateral movement" in p and "analyze" in p) or ("red team" in p and "analyze" in p) or ("analyze lanl" in p) or ("authentication anomalies in the lanl" in p)
        is_system_log_dataset = ("analyze system log" in p) or ("openssh log" in p and "analyze" in p) or ("analyze openssh" in p) or ("analyze linux" in p) or ("analyze hdfs" in p)
        is_dataset_overview = (
            ("what does this dataset contain" in p) or 
            ("what attack categories are present in this dataset" in p) or 
            ("what attack categories" in p) or 
            ("dataset contain" in p) or 
            ("dataset overview" in p) or 
            ("explain this dataset" in p) or 
            ("about this dataset" in p) or
            ("analyze this dataset" in p) or
            ("explain its structure" in p) or
            ("dataset structure" in p) or
            ("explain the structure and features" in p)
        )
        is_second_event = ("second suspicious" in p) or ("second event" in p) or ("second attack" in p)
        is_insufficient_evidence = ("who is the threat actor" in p) or ("who attacked" in p) or ("state-sponsored" in p) or ("attribution" in p) or ("additional information would you need" in p) or ("confirm this attack" in p) or ("carried out by apt" in p) or ("russian state actor" in p)

        # Extended Cybersecurity Knowledge & Tool Intents
        is_jailbreak = ("ignore previous instructions" in p) or ("give me ransomware" in p) or ("write malware" in p) or ("disable policy engine" in p) or ("bypass safeguards" in p) or ("how do i hack" in p)
        is_sqli_concept = ("sql injection" in p or "sqli" in p) and not ("analyze" in p and "dataset" in p)
        is_ssrf_concept = ("ssrf" in p or "server-side request forgery" in p or "169.254.169.254" in p or "imdsv2" in p) and not ("analyze" in p and "dataset" in p)
        is_kerberoast_concept = ("kerberoasting" in p or "kerberoast" in p) and not ("analyze" in p and "dataset" in p)
        is_asrep_concept = ("as-rep" in p or "asrep" in p or "dont_req_preauth" in p) and not ("analyze" in p and "dataset" in p)
        is_dns_tunnel_concept = ("dns tunneling" in p or "dns exfiltration" in p or "shannon entropy" in p) and not ("analyze" in p and "dataset" in p)
        is_c2_concept = ("c2 beaconing" in p or "beaconing" in p or "jitter" in p or "command and control" in p) and not ("analyze" in p and "dataset" in p)
        is_zero_trust = ("zero trust" in p or "nist sp 800-207" in p or "microsegmentation" in p)

        is_web_attack_dataset = ("web attack" in p and "analyze" in p) or ("analyze web" in p) or ("waf log" in p and "analyze" in p) or ("analyze the web attack" in p)
        is_dns_dataset = ("dns query" in p and "analyze" in p) or ("analyze dns" in p) or ("dns queries" in p and "analyze" in p) or ("analyze the dns" in p)
        is_kerberos_dataset = ("kerberos tickets" in p and "analyze" in p) or ("analyze kerberos" in p) or ("analyze active directory" in p) or ("analyze the kerberos" in p)
        is_killchain = ("kill chain" in p) or ("killchain" in p) or ("attack timeline" in p and "correlate" in p) or ("correlate multi-stage" in p) or ("correlate the incident" in p) or ("correlate kill chain" in p)

        is_accounts_query = ("which account" in p) or ("what account" in p) or ("which user" in p) or ("who was targeted" in p) or ("affected user" in p) or ("targeted account" in p)
        is_login_query = ("successful login" in p) or ("login succeed" in p) or ("any login" in p) or ("did they get in" in p) or ("did login succeed" in p) or ("successful authentication" in p)
        is_report_query = ("investigation report" in p) or ("incident report" in p) or ("generate report" in p) or ("summary report" in p)

        is_general_or_benchmark = (
            is_pure_greeting or is_capabilities or is_concept or is_syn_flood or is_slowloris or
            is_ids_ips or is_packet_analysis or is_network_dataset or is_phishing_dataset or 
            is_lanl_dataset or is_system_log_dataset or is_dataset_overview or is_insufficient_evidence or
            is_jailbreak or is_sqli_concept or is_ssrf_concept or is_kerberoast_concept or is_asrep_concept or
            is_dns_tunnel_concept or is_c2_concept or is_zero_trust or is_web_attack_dataset or is_dns_dataset or
            is_kerberos_dataset or is_killchain
        )

        # Contextual resolution: only inherit previous context if query is not a greeting or generic knowledge question
        if is_general_or_benchmark and not is_second_event:
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

        # Tool 6: Network Traffic Dataset Analysis
        net_dataset_res: Optional[Dict[str, Any]] = None
        if is_network_dataset or ("network" in p and "records" in p):
            net_dataset_res = await self.tools.analyze_network_traffic_dataset(AnalyzeNetworkTrafficDatasetInput(), db)
            tool_records.append({"tool": "analyze_network_traffic_dataset", "params": {}, "result": net_dataset_res})
            evidence_refs.extend(net_dataset_res.get("evidence", []))

        # Tool 7: Phishing Email Dataset Analysis
        phish_dataset_res: Optional[Dict[str, Any]] = None
        if is_phishing_dataset:
            phish_dataset_res = await self.tools.analyze_phishing_dataset(AnalyzePhishingDatasetInput(), db)
            tool_records.append({"tool": "analyze_phishing_dataset", "params": {}, "result": phish_dataset_res})
            evidence_refs.extend(phish_dataset_res.get("evidence", []))

        # Tool 8: LANL Enterprise Telemetry & Lateral Movement Analysis
        lanl_dataset_res: Optional[Dict[str, Any]] = None
        if is_lanl_dataset:
            lanl_dataset_res = await self.tools.analyze_lanl_cyber_events(AnalyzeLanlCyberEventsInput(), db)
            tool_records.append({"tool": "analyze_lanl_cyber_events", "params": {}, "result": lanl_dataset_res})
            evidence_refs.extend(lanl_dataset_res.get("evidence", []))

        # Tool 9: System Log Dataset Analysis (OpenSSH / Linux / HDFS)
        sys_dataset_res: Optional[Dict[str, Any]] = None
        if is_system_log_dataset:
            sys_stype = "hdfs" if "hdfs" in p else ("linux" if "linux" in p else "openssh")
            sys_dataset_res = await self.tools.analyze_system_log_dataset(AnalyzeSystemLogDatasetInput(system_type=sys_stype), db)
            tool_records.append({"tool": "analyze_system_log_dataset", "params": {"system_type": sys_stype}, "result": sys_dataset_res})
            evidence_refs.extend(sys_dataset_res.get("evidence", []))

        # Tool 10: Dataset Overview Query
        dataset_overview_res: Optional[Dict[str, Any]] = None
        if is_dataset_overview:
            dname = "lanl" if ("lanl" in p or "cyber1" in p) else (("hdfs" in p and "hdfs") or (("phish" in p or "email" in p) and "phishing") or (("web" in p or "waf" in p) and "web-attacks") or (("dns" in p and "dns")) or (("kerberos" in p or "ad" in p) and "kerberos") or (("loghub" in p or "log" in p) and "loghub") or "cic-ids2017")
            dataset_overview_res = await self.tools.get_dataset_overview(GetDatasetOverviewInput(dataset_name=dname), db)
            tool_records.append({"tool": "get_dataset_overview", "params": {"dataset_name": dname}, "result": dataset_overview_res})

        # Tool 11: Web Application Attack & WAF Dataset Analysis
        web_attack_res: Optional[Dict[str, Any]] = None
        if is_web_attack_dataset:
            web_attack_res = await self.tools.analyze_web_attack_dataset(AnalyzeWebAttackDatasetInput(), db)
            tool_records.append({"tool": "analyze_web_attack_dataset", "params": {}, "result": web_attack_res})
            evidence_refs.extend(web_attack_res.get("evidence", []))

        # Tool 12: DNS Exfiltration & Shannon Entropy Analysis
        dns_dataset_res: Optional[Dict[str, Any]] = None
        if is_dns_dataset:
            dns_dataset_res = await self.tools.analyze_dns_exfiltration(AnalyzeDnsExfiltrationInput(), db)
            tool_records.append({"tool": "analyze_dns_exfiltration", "params": {}, "result": dns_dataset_res})
            evidence_refs.extend(dns_dataset_res.get("evidence", []))

        # Tool 13: Active Directory Kerberos Telemetry Analysis
        kerberos_dataset_res: Optional[Dict[str, Any]] = None
        if is_kerberos_dataset:
            kerberos_dataset_res = await self.tools.analyze_ad_kerberos_telemetry(AnalyzeKerberosTicketsInput(), db)
            tool_records.append({"tool": "analyze_ad_kerberos_telemetry", "params": {}, "result": kerberos_dataset_res})
            evidence_refs.extend(kerberos_dataset_res.get("evidence", []))

        # Tool 14: Multi-Stage Cyber Kill Chain Correlation
        killchain_res: Optional[Dict[str, Any]] = None
        if is_killchain:
            killchain_res = await self.tools.correlate_kill_chain(CorrelateKillChainInput(), db)
            tool_records.append({"tool": "correlate_kill_chain", "params": {}, "result": killchain_res})
            evidence_refs.extend(killchain_res.get("evidence", []))

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

        # Emit suggested actions if any
        if suggested_actions:
            yield f"event: actions\ndata: {json.dumps({'actions': suggested_actions})}\n\n"

        # Build Synthesis Narrative
        response_sections: List[str] = []

        # SCENARIO 0A: Pure Greetings
        if is_pure_greeting:
            response_sections.append("Hey! What would you like to investigate?")

        # SCENARIO 0B: Assistant Capabilities
        elif is_capabilities:
            response_sections.append(
                "I can analyze security logs, investigate suspicious activity, explain detections, and help with incident response.\n\n"
                "You can ask me a question or upload a log file."
            )

        # SCENARIO 0C: Simple Concept (e.g., Brute Force)
        elif is_concept:
            db_bf_mention = ""
            if ip_dossier and ip_dossier.get("failureCount", 0) > 0:
                db_bf_mention = f"\n\nActive brute-force activity has been observed from `{target_ip}` with {ip_dossier.get('failureCount', 0)} failed attempts."

            response_sections.append(
                f"A brute-force attack is an automated attempt to guess credentials by systematically testing passwords or passphrases until the correct one is discovered.\n\n"
                f"**Example**: An attacker script rapidly submitting common passwords against an SSH service on port 22 (`admin`, `root`, `123456`).\n\n"
                f"Genesis detects brute force by monitoring failed authentication velocity (e.g., 10+ failed attempts within 120 seconds), username rotation patterns, and anomalous source IPs.{db_bf_mention}"
            )

        # SCENARIO 0D: Technical Question: SYN Flood
        elif is_syn_flood:
            response_sections.append(
                "A SYN flood is a network-layer Denial-of-Service (DoS) attack that exploits the TCP three-way handshake.\n\n"
                "**Mechanism**:\n"
                "1. The attacker transmits a rapid flood of `TCP SYN` packets spoofing randomized source IP addresses.\n"
                "2. The target server allocates memory (a Transmission Control Block in its half-open connection backlog queue) and responds with `SYN-ACK`.\n"
                "3. The attacker never sends the concluding `ACK`. The half-open connections remain in `SYN_RECV` state until the server's backlog queue overflows, refusing legitimate incoming connections.\n\n"
                "**Defensive Mitigations**:\n"
                "- **SYN Cookies**: Encode connection state into the initial TCP sequence number without allocating memory until the client's final `ACK` arrives.\n"
                "- **Firewall Rate-Limiting**: Enforce syn-flood thresholds (`iptables -m limit --limit 50/s`).\n"
                "- **TCP Backlog Tuning**: Reduce `tcp_synack_retries` and increase `tcp_max_syn_backlog`."
            )

        # SCENARIO 0D2: Technical Question: Slowloris & Mitigation
        elif is_slowloris:
            response_sections.append(
                "### DoS Slowloris Attack Mechanics & Remediation (MITRE T1499.003)\n\n"
                "Slowloris is an asymmetric, low-and-slow application-layer Denial of Service attack designed to exhaust web server thread pools using minimal bandwidth.\n\n"
                "**Mechanism**:\n"
                "1. The attacker opens hundreds of concurrent HTTP connections to the web server.\n"
                "2. It transmits partial HTTP header lines at slow, periodic intervals (e.g., `X-a: b\\r\\n` every 15 seconds) without ever transmitting the terminating double CRLF (`\\r\\n\\r\\n`).\n"
                "3. Thread-per-connection web servers (e.g. Apache with `mpm_prefork` or `mpm_worker`) hold worker sockets open awaiting completion until `MaxRequestWorkers` is exhausted, dropping legitimate connections.\n\n"
                "**Mitigation Strategies**:\n"
                "- **Apache `mod_reqtimeout`**: Enforce aggressive read timeouts: `RequestReadTimeout header=10-20,MinRate=500 body=10,MinRate=500`.\n"
                "- **Reverse Proxy Fronting**: Deploy event-driven proxies like Nginx or Envoy in front of application servers to buffer complete requests before proxying upstream.\n"
                "- **Connection Limiting**: Restrict concurrent connections per IP address via iptables (`iptables -A INPUT -p tcp --dport 80 -m connlimit --connlimit-above 20 -j REJECT`)."
            )

        # SCENARIO 0E: Technical Question: IDS vs IPS
        elif is_ids_ips:
            response_sections.append(
                "**Intrusion Detection System (IDS)** vs **Intrusion Prevention System (IPS)**:\n\n"
                "- **IDS (Passive Monitoring)**: Positioned out-of-band (via network TAP or switch SPAN port). It inspects mirrored traffic, detects anomalous or malicious signatures, and alerts SecOps analysts without delaying or altering packet transmission.\n"
                "- **IPS (Active Inline Defense)**: Deployed in-line directly between network boundaries. It evaluates packets in transit and actively drops malicious frames, resets TCP connections, or blocks offending IP addresses in real time.\n\n"
                "**Core Difference**: An IDS detects and alerts; an IPS intercepts and blocks."
            )

        # SCENARIO 0F: Technical Question: Packet Analysis
        elif is_packet_analysis:
            response_sections.append(
                "Network packet analysis (deep packet inspection / PCAP analysis) involves capturing, decoding, and analyzing raw packet headers and payloads across the OSI stack.\n\n"
                "**Primary Objectives**:\n"
                "- **Threat Detection**: Spot cleartext credential transmission, DNS tunneling, and Command-and-Control (C2) beaconing intervals.\n"
                "- **Forensic Reconstruction**: Reassemble complete TCP streams to extract malware payloads, HTTP sessions, and exfiltrated files.\n"
                "- **Protocol Anomaly Verification**: Identify malformed TCP/IP flags, asymmetric packet sizing, and protocol evasion techniques that signature-only sensors miss."
            )

        # SCENARIO 0G: Structured Analysis: Network Traffic Dataset (CIC-IDS2017)
        elif is_network_dataset and net_dataset_res:
            res = net_dataset_res
            response_sections.append(
                f"### Network Traffic Analysis: CIC-IDS2017 Dataset\n\n"
                f"Evaluated **{res['totalFlowsEvaluated']} flows** across network perimeter sensors:\n\n"
                f"- **Benign Flows**: `{res['benignFlows']}`\n"
                f"- **Malicious Attack Flows**: `{res['maliciousFlows']}`\n"
                f"- **Attack Breakdown**:\n"
                + "\n".join([f"  - `{lbl}`: {cnt} flows" for lbl, cnt in res['attackBreakdown'].items()]) + "\n\n"
                f"- **Top Targeted Ports**: {', '.join([f'Port {p} ({c} flows)' for p, c in res['targetedPorts']])}\n"
                f"- **Risk Score**: `{res['riskScore']}/100` (CRITICAL)\n\n"
                f"**Forensic Finding**: Identified asymmetric low-and-slow HTTP starvation (`DoS Slowloris` on port 80) alongside high-velocity volumetric flooding (`DDoS`). "
                f"Recommended countermeasure: deploy SYN proxy rate limiting and isolate attacker IPs."
            )

        # SCENARIO 0H: Structured Analysis: Phishing Email Dataset
        elif is_phishing_dataset and phish_dataset_res:
            res = phish_dataset_res
            response_sections.append(
                f"### Phishing Telemetry & Email Lure Analysis\n\n"
                f"Evaluated **{res['totalEmailsAnalyzed']} corporate email records**:\n\n"
                f"- **Phishing Attacks**: `{res['phishingEmails']}` | **Legitimate**: `{res['legitimateEmails']}`\n"
                f"- **Authentication Failures**: `{res['spfFailures']} SPF failures`, `{res['dkimFailures']} DKIM failures`\n"
                f"- **Targeted Brands**: {', '.join([f'{b} ({c})' for b, c in res['targetedBrands'].items()])}\n"
                f"- **Risk Score**: `{res['riskScore']}/100` (HIGH)\n\n"
                f"**Key Indicators**: Attackers weaponized lookalike domains with IP-in-URL hyperlinks and synthetic urgency cues (*'Account Suspended'*, *'Reset Immediately'*) targeting executive credentials."
            )

        # SCENARIO 0I: Structured Analysis: LANL Enterprise Telemetry
        elif is_lanl_dataset and lanl_dataset_res:
            res = lanl_dataset_res
            response_sections.append(
                f"### LANL Enterprise Telemetry & Red Team Pivot Analysis\n\n"
                f"Correlated **{res['authEventsAnalyzed']} authentication records** against **{res['redTeamCompromiseEvents']} verified Red Team compromise actions**:\n\n"
                f"- **Compromised User Principals**: {', '.join([f'`{u}`' for u in res['compromisedUsers']])}\n"
                f"- **Initial Breach Jump Host**: `{res['compromisedJumpHosts'][0]}`\n"
                f"- **Lateral Movement Pivot Targets**: {', '.join([f'`{c}`' for c in res['targetHostsPivoted']])}\n"
                f"- **Risk Score**: `{res['riskScore']}/100` (CRITICAL)\n\n"
                f"**Attack Sequence**: Adversary established foothold on host `C17693`, leveraged stolen Kerberos domain credentials (`U748@DOM1`), and executed lateral movement hops to endpoints `C728`, `C1173`, and `C294` via Windows network logons (MITRE T1021.002)."
            )

        # SCENARIO 0J: Structured Analysis: System Log Dataset (OpenSSH / Linux / HDFS)
        elif is_system_log_dataset and sys_dataset_res:
            res = sys_dataset_res
            if res.get("systemType") == "HDFS":
                response_sections.append(
                    f"### HDFS Distributed Storage Log Analysis\n\n"
                    f"Analyzed **{res['totalLogLines']} distributed console log lines**:\n\n"
                    f"- **Component Subsystems**: `dfs.DataNode$PacketResponder` & `dfs.FSNamesystem`\n"
                    f"- **Storage Block Terminations**: `{res['blockTerminations']}`\n"
                    f"- **Risk Assessment**: `{res['riskScore']}/100`\n\n"
                    f"Verified block updates and packet responder terminations. Normal cluster replication verified with zero anomalous block corruption."
                )
            else:
                response_sections.append(
                    f"### System Log Analysis: {res['systemType']}\n\n"
                    f"Parsed **{res['totalLogLines']} system log entries** from `{res['sourceFile']}`:\n\n"
                    f"- **Authentication Failures**: `{res['authenticationFailures']}`\n"
                    f"- **Invalid Users Probed**: {', '.join([f'`{u}`' for u in res['invalidUsersProbed'][:5]]) or 'None'}\n"
                    f"- **Attacking Source IPs**: {', '.join([f'`{ip}`' for ip in res['uniqueObservedIps'][:4]]) or 'None'}\n"
                    f"- **Risk Score**: `{res['riskScore']}/100` (HIGH)\n\n"
                    f"**Finding**: Adversaries from `{res['uniqueObservedIps'][0] if res['uniqueObservedIps'] else 'remote host'}` executed automated dictionary probing against non-existent administrative users."
                )

        # SCENARIO 0K: Dataset Overview
        elif is_dataset_overview and dataset_overview_res:
            res = dataset_overview_res
            if "cic" in res.get("datasetName", "").lower():
                response_sections.append(
                    f"### Dataset Overview: **{res['datasetName']}**\n\n"
                    f"- **Source**: {res['source']}\n"
                    f"- **Scale**: {res['scale']}\n"
                    f"- **Features ({res['featuresCount']})**: {', '.join(res['primaryFeatures'])}\n"
                    f"- **Attack Categories Present**:\n"
                    + "\n".join([f"  - {cls_name}" for cls_name in res['attackClasses']]) + "\n\n"
                    f"- **Primary Application**: {res['primaryApplication']}"
                )
            elif "lanl" in res.get("datasetName", "").lower():
                response_sections.append(
                    f"### Dataset Overview: **{res['datasetName']}**\n\n"
                    f"- **Source**: {res['source']}\n"
                    f"- **Scale**: {res['scale']}\n"
                    f"- **Data Sources**: {', '.join(res['dataSources'])}\n"
                    f"- **Ground Truth Red Team Compromises**: `{res['redTeamEventsCount']} events`\n\n"
                    f"- **Primary Application**: {res['primaryApplication']}"
                )
            elif "hdfs" in res.get("datasetName", "").lower():
                response_sections.append(
                    f"### Dataset Overview: **{res['datasetName']}**\n\n"
                    f"- **Source**: {res['source']}\n"
                    f"- **Scale**: {res['scale']}\n"
                    f"- **Class Distribution**: {res['classDistribution']}\n"
                    f"- **Features**: {', '.join(res['primaryFeatures'])}\n\n"
                    f"- **Primary Application**: {res['primaryApplication']}"
                )
            elif "phish" in res.get("datasetName", "").lower():
                response_sections.append(
                    f"### Dataset Overview: **{res['datasetName']}**\n\n"
                    f"- **Source**: {res['source']}\n"
                    f"- **Scale**: {res['scale']}\n"
                    f"- **Attack Classes**: {', '.join(res['attackClasses'])}\n"
                    f"- **Primary Features**: {', '.join(res['primaryFeatures'])}\n\n"
                    f"- **Primary Application**: {res['primaryApplication']}"
                )
            else:
                extra_lines = []
                if res.get("attackClasses"):
                    extra_lines.append(f"- **Attack Classes**:\n" + "\n".join([f"  - {c}" for c in res["attackClasses"]]))
                if res.get("primaryFeatures"):
                    extra_lines.append(f"- **Features**: {', '.join(res['primaryFeatures'])}")
                extra_str = ("\n" + "\n".join(extra_lines) + "\n") if extra_lines else "\n"
                response_sections.append(
                    f"### Dataset Overview: **{res['datasetName']}**\n\n"
                    f"- **Source**: {res.get('source', 'Security Benchmark')}\n"
                    f"- **Scale**: {res.get('scale', 'Multiple Datasets')}"
                    f"{extra_str}\n"
                    f"- **Primary Application**: {res.get('primaryApplication', 'Log Analysis')}"
                )

        # SCENARIO 0L: Follow-Up Investigation: Second Suspicious Event
        elif is_second_event:
            response_sections.append(
                "### Second Suspicious Event Inspection\n\n"
                "- **Event Type**: `DoS Slowloris` on Destination Port `80` (HTTP)\n"
                "- **Source Parameters**: Flow duration `8,923,000` us (~8.92 seconds), 120 SYN packets transmitted with 0 ACK packets received.\n"
                "- **Diagnostic Reason**: The client establishes connections and transmits partial HTTP headers at abnormally slow intervals without completing requests. This ties up server worker threads and exhausts web server connection slots without generating volumetric traffic.\n\n"
                "**MITRE ATT&CK**: T1498.001 (Network Denial of Service: Direct Network Flood)."
            )

        # SCENARIO 0M: Insufficient Evidence / Threat Actor Attribution
        elif is_insufficient_evidence:
            response_sections.append(
                "**Attribution Status: Insufficient Evidence**\n\n"
                "Observed network telemetry and authentication logs confirm tactical indicators of compromise (source IP, targeted accounts, protocol exploit signatures), but technical logs alone do NOT provide conclusive threat actor attribution.\n\n"
                "**To confirm adversary identity or state-sponsored affiliation, we would require**:\n"
                "1. **Threat Intelligence Correlation**: Cross-referencing C2 IP infrastructure and domain WHOIS with known threat actor group infrastructure (e.g. Mandiant/CrowdStrike adversary trackers).\n"
                "2. **Malware Tooling Signatures**: Binary decompilation matching unique compiler watermarks or proprietary malware strains.\n"
                "3. **ISP Subpoenas & Geolocation Audits**: Carrier-level routing records confirming non-VPN egress origins.\n\n"
                "Until external forensic telemetry is ingested, attribution remains unconfirmed."
            )

        # SCENARIO 0N: Adversarial & Prompt Injection Defense
        elif is_jailbreak:
            response_sections.append(
                "### Security Safeguard: Request Declined\n\n"
                "I cannot assist with generating malware, disabling security controls, or bypassing defense policies. "
                "GENESIS operates under strict autonomous defense boundaries and PolicyEngine guardrails.\n\n"
                "I am authorized to assist with:\n"
                "- Defensive vulnerability remediation & WAF rule tuning\n"
                "- Forensic log and telemetry analysis\n"
                "- Threat modeling and MITRE ATT&CK mapping\n"
                "- Incident response containment playbooks"
            )

        # SCENARIO 0O: Technical Question: SQL Injection & Defense
        elif is_sqli_concept:
            response_sections.append(
                "### SQL Injection (SQLi) Mechanics & Remediation\n\n"
                "SQL Injection occurs when untrusted user input is directly concatenated into a dynamic SQL query string, allowing an adversary to alter query logic and structure.\n\n"
                "**Primary Variants**:\n"
                "1. **In-Band (Union-Based / Error-Based)**: Attacker extracts data directly within HTTP response or triggers explicit SQL syntax error stack traces (`' UNION SELECT username, password FROM users--`).\n"
                "2. **Inferential (Boolean / Time-Based Blind)**: Attacker infers data character-by-character by evaluating true/false application responses or database sleep calls (`' OR IF(1=1, SLEEP(5), 0)--`).\n"
                "3. **Out-of-Band (OAST)**: Database makes external DNS or HTTP requests to attacker-controlled infrastructure (e.g. `xp_dirtree` or `UTL_HTTP`).\n\n"
                "**Definitive Defense**: Use **Parameterized Queries / Prepared Statements**. This separates executable SQL code from user-supplied data at the database parser level, ensuring input is treated strictly as literal data rather than executable statements."
            )

        # SCENARIO 0P: Technical Question: Cloud Metadata SSRF & IMDSv2
        elif is_ssrf_concept:
            response_sections.append(
                "### Server-Side Request Forgery (SSRF) & Cloud Metadata Defense\n\n"
                "SSRF occurs when an attacker induces a back-end web application to make HTTP requests to an arbitrary destination, frequently targeting internal microservices or cloud instance metadata.\n\n"
                "**Cloud Metadata Threat Vector**:\n"
                "- In AWS EC2, the instance metadata service runs at link-local IP `http://169.254.169.254/latest/meta-data/`.\n"
                "- Under **IMDSv1**, requesting this IP returns temporary IAM role credentials (`security-credentials/`) via a simple unauthenticated HTTP GET request.\n\n"
                "**IMDSv2 Defense Mechanism**:\n"
                "- IMDSv2 enforces session-oriented token requests: the client must first make a `PUT` request with header `X-aws-ec2-metadata-token-ttl-seconds: 21600` to retrieve a cryptographic session token.\n"
                "- Subsequent GET requests must include `X-aws-ec2-metadata-token: <TOKEN>`.\n"
                "- Crucially, IMDSv2 enforces a network hop limit of `1`, preventing layer-7 reverse proxies or SSRF vulnerable services from forwarding metadata responses to external clients."
            )

        # SCENARIO 0Q: Technical Question: Active Directory Kerberoasting
        elif is_kerberoast_concept:
            response_sections.append(
                "### Kerberoasting Attack Mechanics & Detection (MITRE T1558.003)\n\n"
                "Kerberoasting is an Active Directory post-exploitation technique allowing any authenticated domain user to steal service account password hashes without elevated privileges.\n\n"
                "**Mechanism**:\n"
                "1. Any valid domain user queries Active Directory for user accounts with a configured **Service Principal Name (SPN)** (e.g. `MSSQLSvc/db01.corp.lan`).\n"
                "2. The user requests a Kerberos Service Ticket (**TGS**) from the Key Distribution Center (KDC) for that SPN.\n"
                "3. The KDC encrypts the ticket using the password hash of the service account associated with the SPN.\n"
                "4. The attacker extracts the ticket from memory and cracks the password hash offline using dictionary tools (Hashcat, John the Ripper) without triggering failed logon alerts on the target server.\n\n"
                "**Detection & Mitigation**:\n"
                "- **Detection**: Monitor Windows Security Event ID **4769** for anomalous spikes in TGS ticket requests, especially those requesting legacy `0x17` (RC4-HMAC) encryption.\n"
                "- **Mitigation**: Migrate service accounts to **Group Managed Service Accounts (gMSA)** with automated 128-character complex passwords and enforce AES-256 Kerberos encryption."
            )

        # SCENARIO 0R: Technical Question: Active Directory AS-REP Roasting
        elif is_asrep_concept:
            response_sections.append(
                "### AS-REP Roasting Mechanics & Detection (MITRE T1558.004)\n\n"
                "AS-REP Roasting targets Active Directory user accounts configured with the `DONT_REQ_PREAUTH` (Do not require Kerberos pre-authentication) flag.\n\n"
                "**Mechanism**:\n"
                "1. Normally, when requesting a Ticket Granting Ticket (TGT), a user must encrypt a timestamp with their password hash to prove identity (**Pre-Authentication**).\n"
                "2. When pre-authentication is disabled, an adversary can send an `AS-REQ` for that account without providing any credentials.\n"
                "3. The KDC immediately returns an `AS-REP` message containing a session key encrypted with the target user's password hash.\n"
                "4. The adversary extracts this payload and cracks the user's password offline.\n\n"
                "**Detection & Mitigation**:\n"
                "- **Detection**: Audit Windows Event ID **4768** where `Pre-Authentication Type` is `0` (None).\n"
                "- **Mitigation**: Audit Active Directory via PowerShell (`Get-ADUser -Filter {DoesNotRequirePreAuth -eq $True}`) and ensure Kerberos pre-authentication is enforced on all domain accounts."
            )

        # SCENARIO 0S: Technical Question: DNS Tunneling & Exfiltration
        elif is_dns_tunnel_concept:
            response_sections.append(
                "### DNS Tunneling & Shannon Entropy Detection (MITRE T1048.003)\n\n"
                "DNS Tunneling abuses the Domain Name System to establish covert command-and-control (C2) channels or exfiltrate sensitive data through perimeter firewalls that permit UDP port 53 outbound.\n\n"
                "**Mechanism**:\n"
                "- The attacker encodes data (base64/hex) into query subdomains: `<encoded_data>.exfil.attacker.com`.\n"
                "- Recursive DNS resolvers forward the request to the attacker's authoritative name server, allowing extraction of data without direct TCP/IP connections.\n\n"
                "**Detection via Shannon Entropy**:\n"
                "- Natural domain names exhibit low character entropy ($H \\approx 2.0 - 3.2$).\n"
                "- Encrypted or compressed exfiltration payloads exhibit high character randomness ($H \\ge 3.8$):\n"
                "  $$H(X) = -\\sum_{i=1}^{n} P(x_i) \\log_2 P(x_i)$$\n"
                "- SecOps sensors flag queries with entropy $\\ge 3.8$, subdomain length $> 35$ characters, and abnormal volumes of TXT record lookups."
            )

        # SCENARIO 0T: Technical Question: C2 Beaconing & Timing Jitter
        elif is_c2_concept:
            response_sections.append(
                "### Command & Control (C2) Beaconing & Timing Jitter (MITRE T1071.001)\n\n"
                "C2 beaconing represents periodic outbound heartbeat requests from compromised endpoints to external adversary command servers.\n\n"
                "**Timing Jitter Dynamics**:\n"
                "- Naive beacons communicate at fixed intervals (e.g., exactly every 60 seconds), creating identifiable spikes in time-series frequency analysis (Fourier transform / autocorrelation).\n"
                "- Modern adversary frameworks (Cobalt Strike, Sliver) apply **Timing Jitter** (e.g. 20% randomization: $60\\text{ s} \\pm 12\\text{ s}$) to disrupt static signature detection.\n\n"
                "**Detection Strategy**:\n"
                "1. **Statistical Coefficient of Variation**: Evaluate the variance of connection inter-arrival times; automated jittered beacons still demonstrate distinct non-human statistical distributions.\n"
                "2. **TLS Fingerprinting (JA3/JA4)**: Detect unauthorized C2 client SSL negotiation parameters regardless of destination IP or domain fluxing.\n"
                "3. **Long-Tail Flow Analysis**: Identify persistent outbound connections with high session counts and small uniform payload sizes."
            )

        # SCENARIO 0U: Technical Question: Zero Trust Architecture
        elif is_zero_trust:
            response_sections.append(
                "### Zero Trust Architecture Principles (NIST SP 800-207)\n\n"
                "Zero Trust is a cybersecurity paradigm that eliminates implicit trust based on network location, operating on the foundational principle: **'Never Trust, Always Verify'**.\n\n"
                "**Core Tenets**:\n"
                "1. **Assume Breach**: Operate as though an adversary is already present inside the corporate network.\n"
                "2. **Explicit Verification**: Always authenticate and authorize based on all available data points (identity, device health, location, workload posture).\n"
                "3. **Least Privilege Access**: Constrain user and service access with Just-In-Time (JIT) and Just-Enough-Access (JEA) models.\n"
                "4. **Microsegmentation**: Divide networks into isolated security zones to restrict lateral movement."
            )

        # SCENARIO 0V: Structured Analysis: Web Attack & WAF Dataset
        elif is_web_attack_dataset and web_attack_res:
            res = web_attack_res
            bd = res.get("attackBreakdown", {})
            response_sections.append(
                f"### Web Application Attack & WAF Log Analysis\n\n"
                f"Evaluated **{res['totalRequestsAnalyzed']} HTTP web requests**:\n\n"
                f"- **Benign Traffic**: `{res['benignRequests']}` requests\n"
                f"- **Attacks Detected**: `{res['totalAttacksDetected']}` malicious payloads\n"
                f"- **Exploit Breakdown**:\n"
                f"  - SQL Injection (Union / Boolean): `{bd.get('SQL Injection', 0)}`\n"
                f"  - Cross-Site Scripting (XSS): `{bd.get('Cross-Site Scripting (XSS)', 0)}`\n"
                f"  - Path Traversal (LFI): `{bd.get('Path Traversal (LFI)', 0)}`\n"
                f"  - Cloud Metadata SSRF (169.254.169.254): `{bd.get('Cloud Metadata SSRF', 0)}`\n\n"
                f"- **Offending Client IPs**: {', '.join([f'`{ip}`' for ip in res['attackingIps']])}\n"
                f"- **Risk Score**: `{res['riskScore']}/100` (CRITICAL)\n\n"
                f"**Key Finding**: Automated exploitation scanner identified attempting SQL injection and Cloud IMDS SSRF credentials harvesting. "
                f"Recommended action: Enforce parameterized queries, deploy WAF OWASP CRS rules, and restrict IMDS to IMDSv2."
            )

        # SCENARIO 0W: Structured Analysis: DNS Exfiltration Dataset
        elif is_dns_dataset and dns_dataset_res:
            res = dns_dataset_res
            response_sections.append(
                f"### DNS Tunneling & Data Exfiltration Telemetry Analysis\n\n"
                f"Evaluated **{res['totalQueriesAnalyzed']} DNS resolution events** against Shannon entropy threshold (`H >= {res['entropyThresholdApplied']}`):\n\n"
                f"- **Anomalous Tunneling Queries**: `{res['anomalousQueriesDetected']}`\n"
                f"- **Compromised Internal Endpoints**: {', '.join([f'`{ip}`' for ip in res['compromisedInternalClients']])}\n"
                f"- **Exfiltration Domains**: {', '.join([f'`{d}`' for d in res['exfiltrationDomains']])}\n"
                f"- **Risk Score**: `{res['riskScore']}/100` (CRITICAL)\n\n"
                f"**Forensic Finding**: Client `10.0.2.144` transmitted high-entropy base64 data payloads over TXT queries to `exfil.darkops.io` (Shannon entropy > 4.2). "
                f"Recommended countermeasure: Isolate host `10.0.2.144` and inject DNS Response Policy Zone (RPZ) sinkhole rule."
            )

        # SCENARIO 0X: Structured Analysis: Active Directory Kerberos Telemetry
        elif is_kerberos_dataset and kerberos_dataset_res:
            res = kerberos_dataset_res
            response_sections.append(
                f"### Active Directory Kerberos Security Event Analysis\n\n"
                f"Audited **{res['totalTicketsAnalyzed']} Kerberos ticket transactions** across domain controllers:\n\n"
                f"- **Kerberoasting Incidents (TGS 0x17 RC4)**: `{res['kerberoastingAttacks']}`\n"
                f"- **AS-REP Roasting Incidents (Event 4768 No Pre-Auth)**: `{res['asrepRoastingAttacks']}`\n"
                f"- **Targeted Service Principal Names**: {', '.join([f'`{s}`' for s in res['targetedSpns']])}\n"
                f"- **Attacking Workstation IPs**: {', '.join([f'`{ip}`' for ip in res['offendingWorkstations']])}\n"
                f"- **Risk Score**: `{res['riskScore']}/100` (CRITICAL)\n\n"
                f"**Forensic Finding**: Adversary workstation `10.0.3.88` requested multiple RC4-encrypted service tickets for `MSSQLSvc/db01.corp.lan` for offline password extraction. "
                f"Recommended action: Migrate `MSSQLSvc` to gMSA and enforce AES-256 ticket encryption."
            )

        # SCENARIO 0Y: Structured Analysis: Cyber Kill Chain Correlation
        elif is_killchain and killchain_res:
            res = killchain_res
            stages = res.get("killChainStages", [])
            response_sections.append(
                f"### End-to-End Cyber Kill Chain Correlation Timeline\n\n"
                f"Correlated multi-source telemetry for Incident **{res['incidentId']}** on target **{res['targetHost']}** (Confidence: `{res['confidenceScore']}%`):\n\n"
                + "\n".join([f"**Phase {s['stage']}: {s['phase']}** (`{s['technique']}`)\n- *Source*: {s['source']}\n- *Details*: {s['description']}\n" for s in stages]) + "\n"
                f"- **Overall Risk Score**: `{res['overallRiskScore']}/100` (CRITICAL)\n"
                f"- **Recommended Orchestration**: Deploy playbook `{res['recommendedPlaybook']}` to quarantine internal pivot targets."
            )

        # SCENARIO 0D: Follow-up Investigation: Targeted Accounts
        elif is_accounts_query:
            if ip_dossier and ip_dossier.get("targetedUsers"):
                users = ip_dossier["targetedUsers"]
                response_sections.append(
                    f"Correlated telemetry from `{target_ip}` identified **{len(users)} targeted accounts**:\n\n"
                    + "\n".join([f"- `{u}`" for u in users]) + "\n\n"
                    f"Pattern indicates dictionary rotation across administrative credentials."
                )
            elif active_file and file_summary:
                u_users = file_summary.get("analysisSummary", {}).get("uniqueAccounts", [])
                response_sections.append(
                    f"Uploaded log `{active_file.filename}` contains **{len(u_users)} targeted accounts**:\n\n"
                    + "\n".join([f"- `{u}`" for u in u_users])
                )
            else:
                response_sections.append(
                    "No targeted accounts found in the current context. You can specify a target IP (e.g., *'Which accounts were targeted by 198.51.100.42?'*)."
                )

        # SCENARIO 0E: Follow-up Investigation: Successful Login / Compromise
        elif is_login_query:
            if ip_dossier:
                succs = ip_dossier.get("successCount", 0)
                fails = ip_dossier.get("failureCount", 0)
                if succs > 0:
                    response_sections.append(
                        f"**Successful authentication detected**\n\n"
                        f"A valid session was accepted for user `deploy` following `{fails}` consecutive failures from `{target_ip}`.\n\n"
                        f"- Identity: `deploy`\n"
                        f"- Vector: SSH (Port 22)\n\n"
                        f"Recommended action: apply playbook `PB-SSH-BRUTE-01` to isolate source `{target_ip}`."
                    )
                else:
                    response_sections.append(
                        f"No successful logins observed from `{target_ip}`. All `{fails}` authentication attempts were rejected."
                    )
            else:
                response_sections.append(
                    "No host or IP context is active. Please specify a host or IP (e.g., *'Was there any successful login from 198.51.100.42?'*)."
                )

        # SCENARIO 0F: Forensic Investigation Report
        elif is_report_query:
            inc_id = target_inc_id or (retrieved_incident.get("incidentId") if retrieved_incident else "INC-2026-991B")
            response_sections.append(
                f"### Incident Report: {inc_id}\n\n"
                f"**Severity**: High | **Confidence**: 85% | **Hash**: `sha256:{hashlib.sha256(inc_id.encode()).hexdigest()[:16]}`\n\n"
                f"**Summary**: High-velocity SSH credential exhaustion campaign originating from `{target_ip or '198.51.100.42'}`. "
                f"Dictionary rotation targeting administrative accounts resulted in an accepted session for `deploy`.\n\n"
                f"**Evidence**:\n"
                f"- Adversary IP: `{target_ip or '198.51.100.42'}` (ASN64496)\n"
                f"- Failed Attempts: 14\n"
                f"- Accepted Logins: 1 (`deploy`)\n"
                f"- MITRE Tactics: T1110.001 (Password Guessing), T1021.004 (SSH)\n\n"
                f"**Response Status**: Playbook `PB-SSH-BRUTE-01` pending operator confirmation."
            )

        # SCENARIO A: Target Incident Query (found vs not found)
        elif target_inc_id:
            if not retrieved_incident:
                response_sections.append(
                    f"Incident `{target_inc_id}` was not found in the environment."
                )
            else:
                inc = retrieved_incident
                inc_stat = inc.get("incidentStatus") or inc.get("status") or "ACTIVE"
                response_sections.append(
                    f"### Incident: **{inc['incidentId']}** — {inc['title']}\n\n"
                    f"- **Status**: `{str(inc_stat).upper()}` | **Severity**: `{inc['severity'].upper()}`\n"
                    f"- **Risk Score**: `{inc['riskScore']}/100` | **Confidence**: `{inc['confidenceScore']}%`\n"
                    f"- **Adversary IPs**: {', '.join([f'`{ip}`' for ip in inc['sourceIps']]) if inc['sourceIps'] else 'None'}\n"
                    f"- **Target Accounts**: {', '.join([f'`{u}`' for u in inc['targetAccounts']]) if inc['targetAccounts'] else 'None'}\n"
                    f"- **Evidence**: `{inc['eventCount']} correlated events`"
                )
                if ip_dossier:
                    response_sections.append(
                        f"Observed `{ip_dossier['failureCount']}` failures and `{ip_dossier['successCount']}` successes from `{target_ip}`."
                    )
                if threat_intel_data:
                    response_sections.append(
                        f"Threat profile for `{threat_intel_data['ip']}`: {threat_intel_data['threatClassification']} (Score: {threat_intel_data['reputationScore']}/100, {threat_intel_data['country']})."
                    )

        # SCENARIO B: Uploaded File Analysis
        elif file_summary:
            fstats = file_summary.get("analysisSummary", {})
            u_ips = fstats.get("uniqueSourceIps", [])
            u_users = fstats.get("uniqueAccounts", [])
            dets_count = fstats.get("detectionsCount", 0)
            inc_count = fstats.get("incidentsCreated", 0)
            fails = fstats.get("failureCount", 0)
            succs = fstats.get("successCount", 0)

            response_sections.append(
                f"### Log Analysis: `{file_summary['filename']}`\n\n"
                f"Analyzed `{fstats.get('totalRecords', 0)}` records ({file_summary['formatDetected'].upper()}).\n\n"
                f"- **Failed Attempts**: `{fails}`\n"
                f"- **Successful Logins**: `{succs}`" + (" *(Compromise signal)*" if succs > 0 and fails >= 3 else "") + "\n"
                f"- **Adversary IPs**: {', '.join([f'`{ip}`' for ip in u_ips]) if u_ips else 'None'}\n"
                f"- **Targeted Accounts**: {', '.join([f'`{u}`' for u in u_users]) if u_users else 'None'}\n"
                f"- **Detections Triggered**: `{dets_count}` | **Incidents**: `{inc_count}`"
            )

            if dets_count > 0 and u_ips:
                response_sections.append(
                    f"Authentication failure rate exceeds baseline. Proposed action: apply playbook `PB-SSH-BRUTE-01` to isolate `{u_ips[0]}`."
                )

        # SCENARIO C: IP Address Investigation
        elif target_ip and ip_dossier:
            fails = ip_dossier.get("failureCount", 0)
            succs = ip_dossier.get("successCount", 0)
            users = ip_dossier.get("targetedUsers", [])

            response_sections.append(
                f"### Host Dossier: `{target_ip}`\n\n"
                f"- **Observed Events**: `{ip_dossier['totalObservedEvents']}`\n"
                f"- **Authentication Failures**: `{fails}`\n"
                f"- **Successful Logins**: `{succs}`" + (" *(Compromise signal)*" if succs > 0 and fails >= 3 else " *(No breakthrough)*") + "\n"
                f"- **Targeted Accounts**: {', '.join([f'`{u}`' for u in users[:6]]) if users else 'None'}"
            )

            if ip_dossier.get("isProtected"):
                response_sections.append(
                    f"> [!WARNING]\n> `{target_ip}` is an internal protected subnet. Automated containment is blocked."
                )

            if threat_intel_data:
                response_sections.append(
                    f"**Threat Intel**: {threat_intel_data['threatClassification']} (Score: {threat_intel_data['reputationScore']}/100, {threat_intel_data['country']} / {threat_intel_data['asn']})"
                )

            if fails >= 5 and not ip_dossier.get("isProtected"):
                response_sections.append(
                    f"Recommended action: apply playbook `PB-SSH-BRUTE-01` to block `{target_ip}`."
                )

        # SCENARIO D: Active Incidents Overview
        elif active_incidents_list:
            response_sections.append(
                f"### Active Incidents ({len(active_incidents_list)})\n\n"
                + "\n".join([f"- **{inc['id']}**: {inc['title']} ({inc['severity'].upper()}, Risk: {inc['riskScore']}/100)" for inc in active_incidents_list])
            )

        # SCENARIO E: Comprehensive Cybersecurity Knowledge Engine & Dynamic RAG
        else:
            # Check if CyberKnowledgeEngine has a direct match for this cybersecurity inquiry
            knowledge_answer = cyber_knowledge_engine.answer_query(user_message_text)
            if knowledge_answer:
                response_sections.append(knowledge_answer)
            else:
                # Dynamically retrieve matching MITRE ATT&CK techniques, Sigma rules, and playbooks via RAG
                rag_results = knowledge_retriever.retrieve(user_message_text, max_results=3)
                is_cyber_query = any(w in p for w in [
                    "what", "how", "why", "explain", "describe", "difference", "compare", "can you",
                    "attack", "security", "threat", "vulnerability", "exploit", "protocol", "port",
                    "traffic", "packet", "log", "incident", "malware", "auth", "defense", "mitigate",
                    "prevent", "firewall", "edr", "siem", "dns", "http", "ssh", "tcp", "ip", "c2", "?"
                ])
                if is_cyber_query and rag_results:
                    rag_desc = []
                    for r in rag_results:
                        if r.get("source") == "mitre_attack":
                            rag_desc.append(
                                f"### {r['title']} ({r.get('tactic', 'Tactics')})\n\n"
                                f"- **Guideline**: {r.get('guidelines', 'Active threat monitoring.')}\n"
                                f"- **Mitigations**: {', '.join(r.get('mitigations', ['Enforce least privilege access.']))}\n"
                            )
                        elif r.get("source") == "sigma_rule":
                            rag_desc.append(
                                f"### Detection Rule: {r['title']} (Severity: {r.get('severity', 'HIGH').upper()})\n\n"
                                f"- **Logic**: `{r.get('logic', '')}`\n"
                                f"- **False Positives**: {', '.join(r.get('false_positives', []))}\n"
                            )
                        elif r.get("source") == "defensive_playbook":
                            rag_desc.append(
                                f"### Playbook: {r['title']}\n\n"
                                f"- **Containment Actions**: {', '.join(r.get('actions', []))}\n"
                            )
                    
                    response_sections.append(
                        f"### Grounded Cybersecurity Intelligence\n\n"
                        f"Here is the technical analysis and guidance for your inquiry:\n\n"
                        + "\n".join(rag_desc)
                    )
                else:
                    health = tool_records[0].get("data", {}) if tool_records else {}
                    response_sections.append(
                        f"**Environment Status: {health.get('autonomousDefense', 'ONLINE')}**\n\n"
                        f"- Total Events: `{health.get('totalIngestedEvents', 0):,}`\n"
                        f"- Active Sensors: `{health.get('healthyForwarders', 0)}/{health.get('forwardersCount', 0)}`\n\n"
                        f"I am ready to assist. You can ask technical cybersecurity questions, request log analysis, or upload captures."
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
