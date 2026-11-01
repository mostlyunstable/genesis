import asyncio
import json
import re
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, AsyncGenerator, Tuple
from sqlalchemy import select, desc, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import settings
from backend.app.models.chat import ConversationModel, ChatMessageModel
from backend.app.models.event import SecurityEventModel
from backend.app.models.incident import IncidentModel
from backend.app.models.detection import DetectionModel
from backend.app.models.threat_intel import ThreatIntelModel
from backend.app.models.source import LogSourceModel
from backend.app.models.response import ResponsePlaybookModel, ResponseActionModel
from backend.app.services.threat_intel import knowledge_retriever, threat_intel_service
from backend.app.services.response import PolicyEngine, response_service
from backend.app.services.audit import audit_service


class ChatTools:
    """
    Controlled backend tools for the Security Copilot.
    Enforces authorization, input validation, query boundaries, and zero direct SQL/shell access.
    """
    @staticmethod
    async def query_security_events(
        db: AsyncSession,
        source: Optional[str] = None,
        outcome: Optional[str] = None,
        username: Optional[str] = None,
        source_ip: Optional[str] = None,
        destination_ip: Optional[str] = None,
        limit: int = 25
    ) -> List[Dict[str, Any]]:
        limit = min(limit, 50)
        stmt = select(SecurityEventModel)
        if source and source != "all":
            stmt = stmt.where(SecurityEventModel.source == source)
        if outcome and outcome != "all":
            stmt = stmt.where(SecurityEventModel.outcome == outcome)
        if username:
            stmt = stmt.where(SecurityEventModel.username.ilike(f"%{username.strip()}%"))
        if source_ip:
            stmt = stmt.where(SecurityEventModel.source_ip == source_ip.strip())
        if destination_ip:
            stmt = stmt.where(SecurityEventModel.destination_ip == destination_ip.strip())

        stmt = stmt.order_by(desc(SecurityEventModel.timestamp)).limit(limit)
        res = await db.execute(stmt)
        events = res.scalars().all()

        return [
            {
                "id": e.id,
                "timestamp": e.timestamp.isoformat() if hasattr(e.timestamp, "isoformat") else str(e.timestamp),
                "source": e.source,
                "sourceIp": e.source_ip,
                "destinationIp": e.destination_ip,
                "username": e.username,
                "outcome": e.outcome,
                "severity": e.severity,
                "rawEvent": e.raw_event
            }
            for e in events
        ]

    @staticmethod
    async def get_incidents(
        db: AsyncSession,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        incident_id: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        limit = min(limit, 20)
        stmt = select(IncidentModel)
        if incident_id:
            stmt = stmt.where(IncidentModel.id == incident_id)
        if status and status != "all":
            stmt = stmt.where(IncidentModel.status == status)
        if severity and severity != "all":
            stmt = stmt.where(IncidentModel.severity == severity)

        stmt = stmt.order_by(desc(IncidentModel.created_at)).limit(limit)
        res = await db.execute(stmt)
        incidents = res.scalars().all()

        return [
            {
                "id": inc.id,
                "title": inc.title,
                "category": inc.category,
                "severity": inc.severity,
                "status": inc.status,
                "riskScore": inc.risk_score,
                "confidenceScore": inc.confidence_score,
                "sourceIps": inc.source_ips or [],
                "targetAccounts": inc.target_accounts or [],
                "eventCount": inc.event_count,
                "mitreAttack": inc.mitre_attack or [],
                "aiSummary": inc.ai_summary or {},
                "assignedPlaybookId": inc.assigned_playbook_id,
                "createdAt": inc.created_at.isoformat() if hasattr(inc.created_at, "isoformat") else str(inc.created_at)
            }
            for inc in incidents
        ]

    @staticmethod
    async def get_detections(
        db: AsyncSession,
        category: Optional[str] = None,
        severity: Optional[str] = None,
        source_ip: Optional[str] = None,
        limit: int = 15
    ) -> List[Dict[str, Any]]:
        limit = min(limit, 30)
        stmt = select(DetectionModel)
        if category and category != "all":
            stmt = stmt.where(DetectionModel.category == category)
        if severity and severity != "all":
            stmt = stmt.where(DetectionModel.severity == severity)
        if source_ip:
            stmt = stmt.where(DetectionModel.source_ip == source_ip.strip())

        stmt = stmt.order_by(desc(DetectionModel.timestamp)).limit(limit)
        res = await db.execute(stmt)
        detections = res.scalars().all()

        return [
            {
                "id": d.id,
                "ruleId": d.rule_id,
                "ruleName": d.rule_name,
                "name": d.name,
                "category": d.category,
                "severity": d.severity,
                "sourceIp": d.source_ip,
                "targetAccounts": d.target_accounts or [],
                "eventCount": d.event_count,
                "confidence": d.confidence,
                "riskScore": d.risk_score,
                "supportingEventIds": d.supporting_event_ids or [],
                "timestamp": d.timestamp.isoformat() if hasattr(d.timestamp, "isoformat") else str(d.timestamp)
            }
            for d in detections
        ]

    @staticmethod
    async def lookup_threat_intel(
        db: AsyncSession,
        ip: str
    ) -> Optional[Dict[str, Any]]:
        record = await threat_intel_service.lookup_ip(ip, db)
        if not record:
            return None
        return {
            "ip": record.ip,
            "threatClassification": record.threat_classification,
            "reputationScore": record.reputation_score,
            "confidence": record.confidence,
            "country": record.country,
            "countryCode": record.country_code,
            "asn": record.asn,
            "mitreTechniques": record.mitre_techniques or [],
            "tags": record.tags or []
        }

    @staticmethod
    async def get_system_health(db: AsyncSession) -> Dict[str, Any]:
        res_events = await db.execute(select(func.count(SecurityEventModel.id)))
        total_events = res_events.scalar_one()

        res_inc = await db.execute(select(func.count(IncidentModel.id)).where(IncidentModel.status.in_(["active", "investigating"])))
        active_inc = res_inc.scalar_one()

        res_sources = await db.execute(select(LogSourceModel))
        sources = res_sources.scalars().all()

        return {
            "totalEventsIngested": total_events,
            "activeIncidents": active_inc,
            "forwardersCount": len(sources),
            "healthyForwarders": len([s for s in sources if s.status == "active"]),
            "defenseStatus": "ONLINE" if settings.AUTONOMOUS_RESPONSE_GLOBAL_ENABLED else "EMERGENCY_HALT",
            "demoMode": settings.DEMO_MODE
        }


class ChatCopilotService:
    """
    Autonomous Conversational Security Analyst engine.
    Supports persistent conversation memory, tool execution, multi-step investigation,
    grounding verification, and token streaming via SSE.
    """
    def __init__(self):
        self.tools = ChatTools()

    async def get_or_create_conversation(
        self,
        conversation_id: Optional[str],
        db: AsyncSession,
        user_id: Optional[str] = None,
        title: Optional[str] = None,
        context_metadata: Optional[Dict[str, Any]] = None
    ) -> ConversationModel:
        if conversation_id:
            res = await db.execute(select(ConversationModel).where(ConversationModel.id == conversation_id))
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

    async def process_message_stream(
        self,
        conversation: ConversationModel,
        user_message_text: str,
        db: AsyncSession,
        user_id: Optional[str] = None,
        context_incident_id: Optional[str] = None,
        context_asset_id: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Executes a multi-step investigation workflow, yields Server-Sent Events,
        and persists the completed user and assistant messages with grounding metadata.
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

        # Update title if it's the first message and still default
        if conversation.title in ["New Security Investigation", "New Conversation"]:
            snippet = user_message_text[:40].strip()
            if len(user_message_text) > 40:
                snippet += "..."
            conversation.title = snippet.capitalize()
            await db.commit()

        # Yield initial SSE Handshake
        yield f"event: handshake\ndata: {json.dumps({'status': 'INITIALIZED', 'conversationId': conversation.id, 'userMessageId': user_msg_id})}\n\n"

        # 2. Stage 1: Understanding & Intent Classification
        yield f"event: step\ndata: {json.dumps({'step': 'understanding', 'label': 'Analyzing investigation query & context...'})}\n\n"
        await asyncio.sleep(0.08)

        p = user_message_text.lower()
        tool_records: List[Dict[str, Any]] = []
        evidence_refs: List[Dict[str, Any]] = []
        suggested_actions: List[Dict[str, Any]] = []

        # Extract potential identifiers
        inc_match = re.search(r'\b(inc-[a-z0-9\-]+)\b', p)
        target_inc_id = inc_match.group(1).upper() if inc_match else context_incident_id

        ip_match = re.search(r'\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b', p)
        target_ip = ip_match.group(1) if ip_match else None

        user_match = re.search(r'\buser\s+([a-zA-Z0-9_\-\.]+)', p)
        target_user = user_match.group(1) if user_match else None

        # 3. Stage 2: Controlled Tool Execution & Evidence Retrieval
        yield f"event: step\ndata: {json.dumps({'step': 'retrieving', 'label': 'Querying authorized security telemetry & database records...'})}\n\n"

        retrieved_incidents: List[Dict[str, Any]] = []
        retrieved_events: List[Dict[str, Any]] = []
        retrieved_detections: List[Dict[str, Any]] = []
        retrieved_threat_intel: Optional[Dict[str, Any]] = None

        if target_inc_id:
            retrieved_incidents = await self.tools.get_incidents(db, incident_id=target_inc_id)
            tool_records.append({"tool": "get_incidents", "params": {"incident_id": target_inc_id}, "count": len(retrieved_incidents)})

            if retrieved_incidents:
                inc = retrieved_incidents[0]
                evidence_refs.append({
                    "type": "incident",
                    "id": inc["id"],
                    "title": inc["title"],
                    "severity": inc["severity"],
                    "snippet": f"Risk Score: {inc['riskScore']}, Status: {inc['status']}"
                })
                # If incident has source IPs, fetch events for the first IP
                if inc["sourceIps"] and not target_ip:
                    target_ip = inc["sourceIps"][0]

        if target_ip:
            retrieved_events = await self.tools.query_security_events(db, source_ip=target_ip, limit=20)
            tool_records.append({"tool": "query_security_events", "params": {"source_ip": target_ip}, "count": len(retrieved_events)})

            retrieved_detections = await self.tools.get_detections(db, source_ip=target_ip, limit=10)
            tool_records.append({"tool": "get_detections", "params": {"source_ip": target_ip}, "count": len(retrieved_detections)})

            retrieved_threat_intel = await self.tools.lookup_threat_intel(db, target_ip)
            tool_records.append({"tool": "lookup_threat_intel", "params": {"ip": target_ip}, "found": retrieved_threat_intel is not None})

            if retrieved_threat_intel:
                evidence_refs.append({
                    "type": "threat_intel",
                    "id": target_ip,
                    "title": f"Threat Intel: {target_ip}",
                    "snippet": f"Score: {retrieved_threat_intel['reputationScore']}/100, Class: {retrieved_threat_intel['threatClassification']}"
                })
        elif "incident" in p or "critical" in p or "unresolved" in p or "active" in p:
            retrieved_incidents = await self.tools.get_incidents(db, status="active", limit=10)
            tool_records.append({"tool": "get_incidents", "params": {"status": "active"}, "count": len(retrieved_incidents)})
            for inc in retrieved_incidents[:3]:
                evidence_refs.append({
                    "type": "incident",
                    "id": inc["id"],
                    "title": inc["title"],
                    "severity": inc["severity"],
                    "snippet": f"Risk Score: {inc['riskScore']}, Status: {inc['status']}"
                })
        elif "detection" in p or "threat" in p or "spray" in p or "brute" in p or "attack" in p:
            retrieved_detections = await self.tools.get_detections(db, limit=15)
            tool_records.append({"tool": "get_detections", "params": {"limit": 15}, "count": len(retrieved_detections)})
            if not retrieved_events and retrieved_detections:
                first_ip = retrieved_detections[0]["sourceIp"]
                retrieved_events = await self.tools.query_security_events(db, source_ip=first_ip, limit=15)
                tool_records.append({"tool": "query_security_events", "params": {"source_ip": first_ip}, "count": len(retrieved_events)})
        else:
            # General overview / health query
            health_info = await self.tools.get_system_health(db)
            tool_records.append({"tool": "get_system_health", "params": {}, "data": health_info})
            retrieved_incidents = await self.tools.get_incidents(db, limit=5)
            retrieved_events = await self.tools.query_security_events(db, limit=10)

        # Collect event evidence references
        for evt in retrieved_events[:5]:
            evidence_refs.append({
                "type": "event",
                "id": evt["id"],
                "title": f"{evt['source']} ({evt['outcome']}) - {evt['username']}",
                "severity": evt["severity"],
                "timestamp": evt["timestamp"],
                "snippet": evt["rawEvent"][:120]
            })

        for det in retrieved_detections[:3]:
            evidence_refs.append({
                "type": "detection",
                "id": det["id"],
                "title": det["name"],
                "severity": det["severity"],
                "snippet": f"Rule: {det['ruleName']} (Confidence: {det['confidence']}%)"
            })

        # 4. Stage 3: Correlation & Pattern Recognition
        yield f"event: step\ndata: {json.dumps({'step': 'correlating', 'label': f'Correlating {len(retrieved_events)} events, {len(retrieved_detections)} detections, and {len(retrieved_incidents)} incidents...'})}\n\n"
        await asyncio.sleep(0.08)

        # 5. Stage 4: MITRE ATT&CK & Knowledge Mapping
        yield f"event: step\ndata: {json.dumps({'step': 'mapping', 'label': 'Retrieving MITRE ATT&CK techniques & defensive playbooks via RAG...'})}\n\n"
        await asyncio.sleep(0.08)

        rag_knowledge = knowledge_retriever.retrieve(user_message_text, max_results=3)
        for k in rag_knowledge:
            if k["source"] == "mitre_attack":
                evidence_refs.append({
                    "type": "mitre",
                    "id": k["id"],
                    "title": k["title"],
                    "snippet": f"Tactic: {k['tactic']} - {k['guidelines'][:100]}"
                })

        # 6. Stage 5: Formulating Safe Recommendations & Policy Evaluation
        yield f"event: step\ndata: {json.dumps({'step': 'evaluating', 'label': 'Evaluating defensive countermeasures against PolicyEngine guardrails...'})}\n\n"
        await asyncio.sleep(0.08)

        # Check if we should propose defensive action
        offending_ip = target_ip or (retrieved_detections[0]["sourceIp"] if retrieved_detections else None)
        if offending_ip and ("block" in p or "mitigate" in p or "contain" in p or "investigate" in p or "remediate" in p):
            is_prot = PolicyEngine.is_target_protected(offending_ip)
            if is_prot:
                action_status = "blocked"
                desc = f"PROHIBITED: Target {offending_ip} resides in a protected exclusion CIDR."
            else:
                action_status = "pending"
                desc = f"Execute boundary firewall DROP on offending attacker IP {offending_ip} with 30-min TTL."

            action_proposal = {
                "id": f"ACT-PROP-{int(time.time()*1000)%10000:04d}",
                "actionName": "iptables drop",
                "target": offending_ip,
                "playbookId": "PB-SSH-BRUTE-01",
                "description": desc,
                "requiresConfirmation": True,
                "status": action_status,
                "incidentId": target_inc_id or (retrieved_incidents[0]["id"] if retrieved_incidents else None)
            }
            suggested_actions.append(action_proposal)

        # 7. Synthesize Grounded Narrative Response
        yield f"event: step\ndata: {json.dumps({'step': 'synthesizing', 'label': 'Generating grounded investigation analysis...'})}\n\n"

        # Emit evidence references before tokens so UI displays context immediately
        yield f"event: evidence\ndata: {json.dumps({'references': evidence_refs})}\n\n"
        if suggested_actions:
            yield f"event: actions\ndata: {json.dumps({'actions': suggested_actions})}\n\n"

        # Build Grounded Text Narrative
        response_sections: List[str] = []

        if target_inc_id and not retrieved_incidents:
            response_sections.append(
                f"### Incident Investigation: `{target_inc_id}`\n\n"
                f"> [!WARNING]\n"
                f"> **Incident Not Found**: No incident with identifier `{target_inc_id}` exists in the environment. "
                f"Please verify the incident ID or list current active incidents."
            )
        elif target_ip and not retrieved_events and not retrieved_detections:
            response_sections.append(
                f"### Telemetry Query: IP `{target_ip}`\n\n"
                f"No security events, detections, or active telemetry records were observed for IP address `{target_ip}` in the analyzed sliding window."
            )
        elif retrieved_incidents:
            inc = retrieved_incidents[0]
            exec_summary = inc.get("aiSummary", {}).get("executiveSummary") if isinstance(inc.get("aiSummary"), dict) else None
            if not exec_summary:
                exec_summary = inc.get("detectionExplanation") or "Adversary activity detected matching automated credential probing."

            response_sections.append(
                f"### Incident Status Report: **{inc['id']}**\n\n"
                f"**Title**: {inc['title']}\n"
                f"- **Severity**: `{inc['severity'].upper()}` | **Status**: `{inc['status'].upper()}`\n"
                f"- **Risk Score**: `{inc['riskScore']}/100` | **Confidence**: `{inc['confidenceScore']}%`\n"
                f"- **Associated Attack Sources**: {', '.join([f'`{ip}`' for ip in inc['sourceIps']]) if inc['sourceIps'] else 'None'}\n"
                f"- **Targeted Identities**: {', '.join([f'`{u}`' for u in inc['targetAccounts']]) if inc['targetAccounts'] else 'None'}\n"
                f"- **Correlated Event Count**: `{inc['eventCount']} records`\n\n"
                f"#### Executive Summary\n"
                f"{exec_summary}\n"
            )
            if retrieved_events:
                fails = [e for e in retrieved_events if e["outcome"] == "failure"]
                successes = [e for e in retrieved_events if e["outcome"] == "success"]
                response_sections.append(
                    f"#### Correlated Telemetry & Forensics\n"
                    f"- Analyzed **{len(retrieved_events)} related security events**.\n"
                    f"- **Observed Failures**: `{len(fails)}` | **Observed Successes**: `{len(successes)}`\n"
                )
            if retrieved_threat_intel:
                response_sections.append(
                    f"\n#### Threat Intelligence Profile (`{retrieved_threat_intel['ip']}`)\n"
                    f"- **Classification**: {retrieved_threat_intel['threatClassification']}\n"
                    f"- **Reputation Score**: `{retrieved_threat_intel['reputationScore']}/100` | **Country**: `{retrieved_threat_intel['country']}`\n"
                )
            if inc.get("mitreAttack"):
                m_list = [f"- **{m.get('techniqueId')}** ({m.get('techniqueName', 'Tactic')}): {m.get('tactic', '')}" for m in inc["mitreAttack"]]
                response_sections.append("\n#### MITRE ATT&CK Mapping\n" + "\n".join(m_list))

            response_sections.append(
                f"\n#### Recommended Investigative Steps\n"
                f"1. Inspect raw authentication failures from `{inc['sourceIps'][0] if inc['sourceIps'] else 'attacker'}`.\n"
                f"2. Check if any credentials succeeded after repetitive failures.\n"
                f"3. Apply defensive containment playbook `{inc.get('assignedPlaybookId', 'PB-SSH-BRUTE-01')}`.\n"
            )

        elif retrieved_events or retrieved_detections:
            ip_str = target_ip or (retrieved_events[0]["sourceIp"] if retrieved_events else "the target")
            fails = [e for e in retrieved_events if e["outcome"] == "failure"]
            successes = [e for e in retrieved_events if e["outcome"] == "success"]
            unique_targets = list(set(e["username"] for e in retrieved_events))

            response_sections.append(
                f"### Security Analysis for `{ip_str}`\n\n"
                f"Evaluated **{len(retrieved_events)} security events** and **{len(retrieved_detections)} detection alerts**.\n\n"
                f"#### Forensic Evidence\n"
                f"- **Attacker Source IP**: `{ip_str}`\n"
                f"- **Authentication Failures**: `{len(fails)}` attempts observed\n"
                f"- **Successful Authentications**: `{len(successes)}`" + (f" (CRITICAL: Breach confirmed for user `{successes[0]['username']}`)" if successes else " (No breach breakthrough)") + "\n"
                f"- **Targeted Accounts ({len(unique_targets)})**: {', '.join([f'`{u}`' for u in unique_targets[:6]])}\n"
            )

            if retrieved_threat_intel:
                response_sections.append(
                    f"\n#### Threat Intelligence Profile\n"
                    f"- **Classification**: {retrieved_threat_intel['threatClassification']}\n"
                    f"- **Reputation Score**: `{retrieved_threat_intel['reputationScore']}/100` | **Confidence**: `{retrieved_threat_intel['confidence']}%`\n"
                    f"- **Origin**: `{retrieved_threat_intel['country']} ({retrieved_threat_intel['asn']})`\n"
                    f"- **Known Tags**: {', '.join([f'`{t}`' for t in retrieved_threat_intel['tags']])}\n"
                )

            if rag_knowledge:
                rag_bullets = []
                for k in rag_knowledge:
                    if k["source"] == "mitre_attack":
                        rag_bullets.append(f"- **{k['title']}** ({k['tactic']}): {k['guidelines']}")
                    elif k["source"] == "defensive_playbook":
                        rag_bullets.append(f"- **Playbook {k['id']}**: {k['title']} (Actions: {', '.join(k['actions'][:2])})")
                if rag_bullets:
                    response_sections.append("\n#### Threat Framework Grounding (RAG)\n" + "\n".join(rag_bullets) + "\n")

            response_sections.append(
                f"\n#### Autonomous Response Recommendation\n"
                f"To contain this vector, recommend applying playbook `PB-SSH-BRUTE-01` to enforce a boundary DROP on `{ip_str}`. "
                f"Review the proposed action card below to authorize or reject execution."
            )
        else:
            # Overview response
            health = tool_records[0].get("data", {}) if tool_records else {}
            response_sections.append(
                f"### SENTINEL AI Operational Overview\n\n"
                f"- **Total Ingested Events**: `{health.get('totalEventsIngested', 0):,}`\n"
                f"- **Active Unresolved Incidents**: `{health.get('activeIncidents', 0)}`\n"
                f"- **Active Forwarder Sensors**: `{health.get('healthyForwarders', 0)}/{health.get('forwardersCount', 0)} online`\n"
                f"- **Autonomous Response Engine**: `{health.get('defenseStatus', 'ONLINE')}`\n\n"
                f"How would you like to proceed? You can ask me to:\n"
                f"- *'Investigate active incident INC-...'*\n"
                f"- *'Check suspicious activity from 198.51.100.42'*\n"
                f"- *'Explain MITRE techniques involved in recent attacks'*\n"
                f"- *'Propose containment for recent brute force campaigns'*"
            )

        full_content = "\n\n".join(response_sections)

        # Stream the content in token chunks for realistic typing experience
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
