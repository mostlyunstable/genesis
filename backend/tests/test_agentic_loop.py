import pytest
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.event import SecurityEventModel
from backend.app.models.threat_intel import ThreatIntelModel
from backend.app.models.incident import IncidentModel
from backend.app.services.autonomous_agent import autonomous_agent, AutonomousSecurityAgent


@pytest.fixture
async def seed_agent_investigation_data(db_session: AsyncSession):
    now = datetime.now(timezone.utc)
    for i in range(5):
        evt = SecurityEventModel(
            id=f"EVT-AGENT-{i:03d}",
            timestamp=now,
            source="linux_ssh",
            event_type="SSH_AUTH_FAIL",
            username="admin" if i % 2 == 0 else "deploy",
            source_ip="198.51.100.88",
            destination_ip="10.240.10.15",
            destination_port=22,
            outcome="failure",
            severity="warning",
            raw_event=f"Failed password for user from 198.51.100.88 port {50000+i}",
            parsed_fields={},
            fingerprint=f"fp_agent_{i}",
            is_simulated=True
        )
        db_session.add(evt)

    ti = ThreatIntelModel(
        ip="198.51.100.88",
        threat_classification="High-Velocity Brute Force Actor",
        reputation_score=89,
        country="Germany",
        country_code="DE",
        asn="AS3320",
        associated_incidents=[],
        confidence=92,
        mitre_techniques=["T1110.001"],
        tags=["brute_force", "ssh"],
        simulated_data_source="Sentinel Synthetic Feed"
    )
    db_session.add(ti)
    await db_session.commit()


@pytest.mark.asyncio
async def test_agent_plan_investigation_ip():
    """Verifies agent initial planning and entity extraction."""
    plan = autonomous_agent.plan_investigation("Investigate suspicious host 198.51.100.88")
    assert plan.target_entity == "198.51.100.88"
    assert plan.entity_type == "ip"
    assert "investigate_ip_address" in plan.planned_tools
    assert "198.51.100.88" in plan.initial_hypothesis


@pytest.mark.asyncio
async def test_agent_plan_investigation_incident():
    """Verifies agent planning from incident ID."""
    plan = autonomous_agent.plan_investigation("What is the root cause of INC-2026-A1B2?")
    assert plan.target_entity == "INC-2026-A1B2"
    assert plan.entity_type == "incident"
    assert "investigate_incident" in plan.planned_tools


@pytest.mark.asyncio
async def test_agent_react_execution_loop(seed_agent_investigation_data, db_session: AsyncSession):
    """
    Verifies genuine autonomous ReAct execution:
    Agent cycles through thoughts, actions, observations, reflections, and synthesis.
    """
    events = []
    async for event in autonomous_agent.run_investigation_loop(
        goal="Investigate suspicious host 198.51.100.88 and determine containment action",
        db=db_session
    ):
        events.append(event)

    types = [e["type"] for e in events]
    assert "thought" in types
    assert "action" in types
    assert "observation" in types
    assert "synthesis" in types

    # Verify actions were taken sequentially based on observations
    actions = [e for e in events if e["type"] == "action"]
    action_names = [a["tool"] for a in actions]

    assert "investigate_ip_address" in action_names
    assert "retrieve_threat_intelligence" in action_names
    assert "map_mitre_techniques" in action_names
    assert "propose_response_action" in action_names

    # Verify final synthesis
    synthesis = next(e for e in events if e["type"] == "synthesis")
    assert "Autonomous Security Assessment" in synthesis["content"]
    assert len(synthesis["evidence"]) > 0
    assert len(synthesis["actions"]) > 0
    assert synthesis["actions"][0]["target"] == "198.51.100.88"


@pytest.mark.asyncio
async def test_agent_stopping_condition_and_max_iterations(db_session: AsyncSession):
    """Verifies that the agent loop respects iteration limits and terminates cleanly."""
    bounded_agent = AutonomousSecurityAgent(max_iterations=2)
    events = []
    async for event in bounded_agent.run_investigation_loop(
        goal="Investigate 198.51.100.88",
        db=db_session
    ):
        events.append(event)

    actions = [e for e in events if e["type"] == "action"]
    assert len(actions) <= 2
    assert any(e["type"] == "synthesis" for e in events)


@pytest.mark.asyncio
async def test_agent_report_generation_dispatch(seed_agent_investigation_data, db_session: AsyncSession):
    """Verifies that when asked for a report, the agent autonomously executes generate_investigation_report."""
    events = []
    async for event in autonomous_agent.run_investigation_loop(
        goal="Investigate 198.51.100.88 and generate an official security report dossier",
        db=db_session
    ):
        events.append(event)

    actions = [e for e in events if e["type"] == "action"]
    action_names = [a["tool"] for a in actions]
    assert "generate_investigation_report" in action_names

    synthesis = next(e for e in events if e["type"] == "synthesis")
    assert synthesis["reportId"] is not None
    assert "/api/v1/reports/" in synthesis["content"]
