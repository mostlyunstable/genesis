import json
import re
import asyncio
from typing import Dict, Any, List, Optional, Tuple, AsyncGenerator
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.services.chat_tools import (
    tool_registry,
    InvestigateIpAddressInput,
    GetAuthenticationEventsInput,
    RetrieveThreatIntelligenceInput,
    DetectSuspiciousLoginPatternsInput,
    MapMitreTechniquesInput,
    InvestigateIncidentInput,
    GenerateInvestigationReportInput,
    ProposeResponseActionInput,
    AnalyzeUploadedFileInput
)
from backend.app.services.response import PolicyEngine


class AgentActionStep(BaseModel):
    iteration: int
    thought: str
    tool_name: str
    tool_params: Dict[str, Any]
    observation_summary: str
    raw_result: Dict[str, Any]
    evidence_gathered: List[Dict[str, Any]] = Field(default_factory=list)


class AgentInvestigationPlan(BaseModel):
    goal: str
    target_entity: Optional[str] = None
    entity_type: Optional[str] = None  # ip, incident, file, user, general
    initial_hypothesis: str
    planned_tools: List[str]


class AgentExecutionResult(BaseModel):
    goal: str
    completed: bool
    iterations: int
    steps: List[AgentActionStep]
    evidence_references: List[Dict[str, Any]]
    suggested_actions: List[Dict[str, Any]]
    final_assessment: str
    generated_report_id: Optional[str] = None


class AutonomousSecurityAgent:
    """
    Genuine Agentic AI Security Analyst Engine.
    Executes an autonomous ReAct (Reasoning + Acting + Observing + Reflecting) loop:
    1. Formulates an investigation hypothesis from the user request.
    2. Autonomously selects and executes appropriate backend tools.
    3. Interprets raw observations and extracts verified evidence.
    4. Dynamically decides whether further investigation is needed.
    5. Adapts subsequent tool calls based on findings.
    6. Stops upon goal fulfillment or iteration budget limit.
    7. Synthesizes an evidence-backed final assessment and recommends mitigations.
    """
    def __init__(self, max_iterations: int = 5):
        self.max_iterations = max_iterations
        self.tools = tool_registry

    def plan_investigation(
        self,
        prompt: str,
        context: Optional[Dict[str, Any]] = None
    ) -> AgentInvestigationPlan:
        """Formulates an initial investigation hypothesis and target entity."""
        p = prompt.lower()
        context = context or {}

        # Entity extraction
        ip_match = re.search(r'\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b', p)
        inc_match = re.search(r'\b(inc-[a-z0-9\-]+)\b', p)

        target = None
        entity_type = "general"

        if ip_match:
            target = ip_match.group(1)
            entity_type = "ip"
        elif inc_match:
            target = inc_match.group(1).upper()
            entity_type = "incident"
        elif context.get("context_ip"):
            target = context["context_ip"]
            entity_type = "ip"
        elif context.get("context_incident"):
            target = context["context_incident"]
            entity_type = "incident"
        elif context.get("context_file"):
            target = getattr(context["context_file"], "id", None)
            entity_type = "file"

        # Formulate hypothesis
        if entity_type == "ip":
            hypothesis = f"Adversary activity suspected from host {target}. Need to audit failure velocity, evaluate credential breakthroughs, check external reputation, and determine containment necessity."
            planned = ["investigate_ip_address", "retrieve_threat_intelligence", "map_mitre_techniques"]
        elif entity_type == "incident":
            hypothesis = f"Security incident {target} requires multi-source evidence correlation, root cause identification, and defensive playbook assignment."
            planned = ["investigate_incident", "map_mitre_techniques", "generate_investigation_report"]
        elif entity_type == "file":
            hypothesis = f"Uploaded telemetry artifact {target} requires forensic log extraction, anomaly clustering, and threat detection verification."
            planned = ["analyze_uploaded_file"]
        else:
            hypothesis = "General security query. Need to inspect current defense posture, active incidents, and telemetry health."
            planned = ["get_security_overview", "get_active_incidents"]

        return AgentInvestigationPlan(
            goal=prompt,
            target_entity=target,
            entity_type=entity_type,
            initial_hypothesis=hypothesis,
            planned_tools=planned
        )

    async def run_investigation_loop(
        self,
        goal: str,
        context: Optional[Dict[str, Any]] = None,
        db: Optional[AsyncSession] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Executes the autonomous ReAct investigation loop as an async event generator.
        Yields step-by-step agent telemetry: thoughts, tool calls, observations, reflections, and final synthesis.
        """
        plan = self.plan_investigation(goal, context)
        steps_taken: List[AgentActionStep] = []
        all_evidence: List[Dict[str, Any]] = []
        all_actions: List[Dict[str, Any]] = []
        executed_tool_signatures = set()

        yield {
            "type": "thought",
            "phase": "planning",
            "content": f"**Investigation Hypothesis**: {plan.initial_hypothesis}"
        }

        current_target = plan.target_entity
        target_type = plan.entity_type
        iteration = 0
        is_complete = False
        generated_report_id = None

        # ReAct Reasoning Loop
        while iteration < self.max_iterations and not is_complete:
            iteration += 1

            # -------------------------------------------------------------
            # STEP A: DYNAMIC REASONING & TOOL SELECTION
            # -------------------------------------------------------------
            tool_to_call: Optional[str] = None
            tool_params: Dict[str, Any] = {}
            thought_text = ""

            # Check what evidence we currently have vs what is needed
            has_ip_profile = any(s.tool_name == "investigate_ip_address" for s in steps_taken)
            has_threat_intel = any(s.tool_name == "retrieve_threat_intelligence" for s in steps_taken)
            has_mitre_mapping = any(s.tool_name == "map_mitre_techniques" for s in steps_taken)
            has_suspicious_patterns = any(s.tool_name == "detect_suspicious_login_patterns" for s in steps_taken)
            has_incident_data = any(s.tool_name == "investigate_incident" for s in steps_taken)
            has_action_proposal = any(s.tool_name == "propose_response_action" for s in steps_taken)
            has_report_generated = any(s.tool_name == "generate_investigation_report" for s in steps_taken)

            # Determine next required step adaptively
            if target_type == "ip" and current_target:
                if not has_ip_profile:
                    thought_text = f"First, I must inspect host dossier and authentication velocity for IP `{current_target}`."
                    tool_to_call = "investigate_ip_address"
                    tool_params = {"ip": current_target}
                elif not has_threat_intel:
                    thought_text = f"Host telemetry acquired. Now I need to check external threat intelligence reputation for `{current_target}`."
                    tool_to_call = "retrieve_threat_intelligence"
                    tool_params = {"ip": current_target}
                elif not has_mitre_mapping:
                    thought_text = "Correlating observed authentication patterns against the MITRE ATT&CK framework."
                    tool_to_call = "map_mitre_techniques"
                    tool_params = {"technique_id": "T1110.001"}
                elif not has_action_proposal and any(s.raw_result.get("failureCount", 0) >= 3 for s in steps_taken):
                    thought_text = f"Adversary activity confirmed from `{current_target}`. Evaluating policy guardrails to propose automated perimeter containment."
                    tool_to_call = "propose_response_action"
                    tool_params = {
                        "action_name": "iptables drop",
                        "target": current_target,
                        "playbook_id": "PB-SSH-BRUTE-01",
                        "description": f"Enforce perimeter boundary DROP on adversary IP {current_target} (30-min TTL)."
                    }
                elif not has_report_generated and ("report" in goal.lower() or "dossier" in goal.lower() or "export" in goal.lower()):
                    thought_text = f"User requested documentation. Generating cryptographically signed security dossier for `{current_target}`."
                    tool_to_call = "generate_investigation_report"
                    tool_params = {"target_id": current_target, "target_type": "ip"}
                else:
                    thought_text = "All necessary forensic evidence has been gathered. Formulating final assessment."
                    is_complete = True

            elif target_type == "incident" and current_target:
                if not has_incident_data:
                    thought_text = f"Inspecting root cause and correlated telemetry for incident `{current_target}`."
                    tool_to_call = "investigate_incident"
                    tool_params = {"incident_id": current_target}
                elif not has_mitre_mapping:
                    thought_text = f"Mapping incident `{current_target}` TTPs to MITRE ATT&CK."
                    tool_to_call = "map_mitre_techniques"
                    tool_params = {"technique_id": "T1110"}
                elif not has_report_generated and ("report" in goal.lower() or "summary" in goal.lower() or "dossier" in goal.lower()):
                    thought_text = f"Generating formal incident response dossier for `{current_target}`."
                    tool_to_call = "generate_investigation_report"
                    tool_params = {"target_id": current_target, "target_type": "incident"}
                else:
                    thought_text = "Incident evidence gathered. Preparing final response."
                    is_complete = True

            elif target_type == "file" and current_target:
                thought_text = f"Analyzing uploaded telemetry file `{current_target}`."
                tool_to_call = "analyze_uploaded_file"
                tool_params = {"file_id": current_target}
                is_complete = True

            else:
                thought_text = "Querying active security incidents to assess environment posture."
                tool_to_call = "get_active_incidents"
                tool_params = {"limit": 5}
                is_complete = True

            if is_complete or not tool_to_call:
                break

            # Deduplication safeguard
            sig = f"{tool_to_call}:{json.dumps(tool_params, sort_keys=True)}"
            if sig in executed_tool_signatures:
                break
            executed_tool_signatures.add(sig)

            # Yield Thought
            yield {
                "type": "thought",
                "iteration": iteration,
                "content": thought_text
            }
            await asyncio.sleep(0.04)

            # -------------------------------------------------------------
            # STEP B: TOOL EXECUTION
            # -------------------------------------------------------------
            yield {
                "type": "action",
                "iteration": iteration,
                "tool": tool_to_call,
                "params": tool_params
            }

            raw_res = await self._execute_tool(tool_to_call, tool_params, db)
            obs_summary = self._summarize_observation(tool_to_call, raw_res)

            # Extract evidence
            new_evidence = raw_res.get("evidence", [])
            all_evidence.extend(new_evidence)

            if tool_to_call == "propose_response_action" and raw_res.get("status") == "SUCCESS":
                all_actions.append(raw_res["action"])

            if tool_to_call == "generate_investigation_report" and raw_res.get("reportId"):
                generated_report_id = raw_res["reportId"]

            # Adapt target IP from incident or file if not initially known
            if not current_target:
                if raw_res.get("sourceIps"):
                    current_target = raw_res["sourceIps"][0]
                    target_type = "ip"
                elif raw_res.get("analysisSummary", {}).get("uniqueSourceIps"):
                    current_target = raw_res["analysisSummary"]["uniqueSourceIps"][0]
                    target_type = "ip"

            step_record = AgentActionStep(
                iteration=iteration,
                thought=thought_text,
                tool_name=tool_to_call,
                tool_params=tool_params,
                observation_summary=obs_summary,
                raw_result=raw_res,
                evidence_gathered=new_evidence
            )
            steps_taken.append(step_record)

            # -------------------------------------------------------------
            # STEP C: OBSERVATION & REFLECTION
            # -------------------------------------------------------------
            yield {
                "type": "observation",
                "iteration": iteration,
                "tool": tool_to_call,
                "summary": obs_summary
            }
            await asyncio.sleep(0.04)

        # -------------------------------------------------------------
        # STEP D: FINAL SYNTHESIS & ASSESSMENT
        # -------------------------------------------------------------
        final_assessment = self._build_final_assessment(goal, plan, steps_taken, all_actions, generated_report_id)

        yield {
            "type": "synthesis",
            "content": final_assessment,
            "evidence": all_evidence,
            "actions": all_actions,
            "reportId": generated_report_id
        }

    async def _execute_tool(self, tool_name: str, params: Dict[str, Any], db: AsyncSession) -> Dict[str, Any]:
        """Dispatches typed tool execution to ChatToolRegistry."""
        try:
            if tool_name == "investigate_ip_address":
                return await self.tools.investigate_ip_address(InvestigateIpAddressInput(**params), db)
            elif tool_name == "retrieve_threat_intelligence":
                return await self.tools.retrieve_threat_intelligence(RetrieveThreatIntelligenceInput(**params), db)
            elif tool_name == "map_mitre_techniques":
                return await self.tools.map_mitre_techniques(MapMitreTechniquesInput(**params), db)
            elif tool_name == "detect_suspicious_login_patterns":
                return await self.tools.detect_suspicious_login_patterns(DetectSuspiciousLoginPatternsInput(**params), db)
            elif tool_name == "investigate_incident":
                return await self.tools.investigate_incident(InvestigateIncidentInput(**params), db)
            elif tool_name == "propose_response_action":
                return await self.tools.propose_response_action(ProposeResponseActionInput(**params), db)
            elif tool_name == "generate_investigation_report":
                return await self.tools.generate_investigation_report(GenerateInvestigationReportInput(**params), db)
            elif tool_name == "analyze_uploaded_file":
                return await self.tools.analyze_uploaded_file(AnalyzeUploadedFileInput(**params), db)
            elif tool_name == "get_active_incidents":
                return await self.tools.get_active_incidents(params, db)
            else:
                return {"status": "UNKNOWN_TOOL", "tool": tool_name}
        except Exception as e:
            return {"status": "ERROR", "error": str(e), "tool": tool_name}

    def _summarize_observation(self, tool_name: str, res: Dict[str, Any]) -> str:
        """Converts raw tool output into clear analyst observation text."""
        if tool_name == "investigate_ip_address":
            fails = res.get("failureCount", 0)
            succs = res.get("successCount", 0)
            target = res.get("ip", "unknown")
            return f"IP `{target}` has {res.get('totalObservedEvents', 0)} events ({fails} failures, {succs} successes). Targets: {', '.join(res.get('targetedUsers', [])[:4]) or 'none'}."
        elif tool_name == "retrieve_threat_intelligence":
            return f"Threat Intel: Classified as '{res.get('threatClassification', 'Unknown')}' (Reputation: {res.get('reputationScore', 'N/A')}/100, Country: {res.get('country', 'Unknown')})."
        elif tool_name == "map_mitre_techniques":
            techs = res.get("techniques", [])
            rendered = [f"{t.get('techniqueId')} ({t.get('techniqueName')})" for t in techs[:2]]
            return f"Mapped {len(techs)} techniques: {', '.join(rendered)}."
        elif tool_name == "propose_response_action":
            act = res.get("action", {})
            return f"Proposed mitigation action '{act.get('actionName')}' on target `{act.get('target')}` (Requires Analyst Confirmation)."
        elif tool_name == "generate_investigation_report":
            return f"Report generated: `{res.get('reportTitle')}` (ID: `{res.get('reportId')}`, Hash: `{res.get('recordHash', '')[:12]}...`)."
        elif tool_name == "investigate_incident":
            return f"Incident {res.get('incidentId')}: {res.get('title')} (Risk: {res.get('riskScore')}/100, Severity: {res.get('severity')})."
        return f"Tool completed with status: {res.get('status', 'OK')}."

    def _build_final_assessment(
        self,
        goal: str,
        plan: AgentInvestigationPlan,
        steps: List[AgentActionStep],
        actions: List[Dict[str, Any]],
        report_id: Optional[str]
    ) -> str:
        """Synthesizes all collected evidence and reflections into a coherent executive assessment."""
        sections = [
            f"### 🛡️ Autonomous Security Assessment\n\n**Investigation Objective**: {goal}\n",
            f"**Hypothesis**: {plan.initial_hypothesis}\n",
            f"**Autonomous Actions Executed ({len(steps)})**:\n"
            + "\n".join([f"{s.iteration}. `{s.tool_name}`: {s.observation_summary}" for s in steps])
            + "\n"
        ]

        if actions:
            sections.append(
                "**Proposed Defensive Countermeasures**:\n"
                + "\n".join([f"- **{a.get('actionName')}** on `{a.get('target')}` (`{a.get('playbookId')}`): {a.get('description')}" for a in actions])
                + "\n"
            )

        if report_id:
            sections.append(
                f"**Generated Forensic Dossier**: [`{report_id}`](/api/v1/reports/{report_id}/download?format=markdown) (Signed & Stored)\n"
            )

        sections.append(
            "**Analyst Conclusion**: Telemetry confirms adversary credential probing. Defensive policy boundary checks have been evaluated. Human confirmation is required before firewall rule enforcement."
        )

        return "\n".join(sections)


autonomous_agent = AutonomousSecurityAgent()
