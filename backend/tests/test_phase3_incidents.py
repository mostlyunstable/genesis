import pytest
from httpx import AsyncClient
from backend.app.core.config import settings
from backend.app.models.incident import IncidentModel


@pytest.mark.asyncio
async def test_incident_status_lifecycle_and_transition_audit(client: AsyncClient, auth_headers: dict, db_session):
    """Verify complete incident lifecycle transitions and timeline audit records."""
    # Seed an incident
    inc = IncidentModel(
        id="INC-PHASE3-TEST-01",
        title="SSH Brute-Force Incident for Lifecycle Verification",
        category="Credential Probing",
        severity="high",
        status="active",
        risk_score=75,
        confidence_score=90,
        source_ips=["198.51.100.88"],
        target_accounts=["root"],
        event_count=15,
        detection_ids=["DET-01"],
        event_ids=["EVT-01"],
        detection_explanation="Test explanation",
        mitre_attack=[{"tactic": "Credential Access", "techniqueId": "T1110.001", "techniqueName": "Password Guessing", "referenceUrl": "https://attack.mitre.org"}],
        ai_summary={"executiveSummary": "Summary", "evidenceChain": [], "rootCauseAnalysis": "Analysis", "recommendedActions": [], "confidenceExplanation": "High"},
        timeline_events=[{"id": "TL-01", "timestamp": "2026-10-31T12:00:00Z", "stage": "detection", "title": "Initial Alert", "description": "Alert triggered", "severity": "high", "type": "detection"}],
        comments=[],
        is_simulated=True
    )
    db_session.add(inc)
    await db_session.commit()

    # 1. Transition active -> investigating
    res = await client.patch(
        f"/api/v1/incidents/{inc.id}/status",
        json={"status": "investigating", "assignedAnalyst": "analyst_sarah"},
        headers=auth_headers
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "investigating"
    assert data["assignedAnalyst"] == "analyst_sarah"
    assert any(t["stage"] == "status_change" and "active -> investigating" in t["title"] for t in data["timelineEvents"])

    # 2. Transition investigating -> contained
    res = await client.patch(
        f"/api/v1/incidents/{inc.id}/status",
        json={"status": "contained"},
        headers=auth_headers
    )
    assert res.status_code == 200
    assert res.json()["status"] == "contained"

    # 3. Transition contained -> resolved with resolution notes
    res = await client.patch(
        f"/api/v1/incidents/{inc.id}/status",
        json={
            "status": "resolved",
            "resolutionNotes": "Source IP blocked at perimeter firewall. No unauthorized access verified."
        },
        headers=auth_headers
    )
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["status"] == "resolved"
    assert "perimeter firewall" in res_data["resolutionNotes"]


@pytest.mark.asyncio
async def test_incident_false_positive_disposition(client: AsyncClient, auth_headers: dict, db_session):
    """Verify false-positive resolution transition."""
    inc = IncidentModel(
        id="INC-PHASE3-TEST-FP",
        title="Automated Scanner Trigger",
        category="Credential Probing",
        severity="low",
        status="active",
        risk_score=30,
        confidence_score=70,
        source_ips=["192.0.2.10"],
        target_accounts=["testuser"],
        event_count=5,
        detection_ids=["DET-FP"],
        event_ids=["EVT-FP"],
        detection_explanation="Scanner probe",
        mitre_attack=[],
        ai_summary={"executiveSummary": "Summary", "evidenceChain": [], "rootCauseAnalysis": "", "recommendedActions": [], "confidenceExplanation": ""},
        timeline_events=[],
        comments=[],
        is_simulated=True
    )
    db_session.add(inc)
    await db_session.commit()

    res = await client.patch(
        f"/api/v1/incidents/{inc.id}/status",
        json={"status": "false_positive", "resolutionNotes": "Authorized internal vulnerability scanning activity."},
        headers=auth_headers
    )
    assert res.status_code == 200
    assert res.json()["status"] == "false_positive"
    assert "Authorized internal vulnerability scanning" in res.json()["resolutionNotes"]


@pytest.mark.asyncio
async def test_incident_analyst_comments_and_timeline_provenance(client: AsyncClient, auth_headers: dict, db_session):
    """Verify analyst comments are appended to comments array and recorded on timeline."""
    inc = IncidentModel(
        id="INC-PHASE3-TEST-CMT",
        title="Incident with Analyst Collaboration",
        category="Credential Probing",
        severity="medium",
        status="active",
        risk_score=60,
        confidence_score=85,
        source_ips=["198.51.100.44"],
        target_accounts=["webadmin"],
        event_count=10,
        detection_ids=["DET-CMT"],
        event_ids=["EVT-CMT"],
        detection_explanation="Probing detected",
        mitre_attack=[],
        ai_summary={"executiveSummary": "Summary", "evidenceChain": [], "rootCauseAnalysis": "", "recommendedActions": [], "confidenceExplanation": ""},
        timeline_events=[],
        comments=[],
        is_simulated=True
    )
    db_session.add(inc)
    await db_session.commit()

    # Add comment 1
    res1 = await client.post(
        f"/api/v1/incidents/{inc.id}/comments",
        json={"author": "lead_analyst", "comment": "Correlating with outbound firewall flows to verify exfiltration."},
        headers=auth_headers
    )
    assert res1.status_code == 200
    data1 = res1.json()
    assert len(data1["comments"]) == 1
    assert data1["comments"][0]["author"] == "lead_analyst"
    assert "firewall flows" in data1["comments"][0]["comment"]
    assert any(t["stage"] == "analyst_note" for t in data1["timelineEvents"])

    # Add comment 2
    res2 = await client.post(
        f"/api/v1/incidents/{inc.id}/comments",
        json={"author": "incident_commander", "comment": "Playbook response authorized. Applying boundary quarantine."},
        headers=auth_headers
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert len(data2["comments"]) == 2
    assert data2["comments"][1]["author"] == "incident_commander"
    assert len([t for t in data2["timelineEvents"] if t["stage"] == "analyst_note"]) == 2


@pytest.mark.asyncio
async def test_invalid_status_rejection(client: AsyncClient, auth_headers: dict, db_session):
    """Verify that invalid status updates are rejected with HTTP 400."""
    inc = IncidentModel(
        id="INC-PHASE3-TEST-INV",
        title="Incident for Invalid Status Validation",
        category="Credential Probing",
        severity="medium",
        status="active",
        risk_score=50,
        confidence_score=80,
        source_ips=["198.51.100.55"],
        target_accounts=["guest"],
        event_count=5,
        detection_ids=[],
        event_ids=[],
        detection_explanation="",
        mitre_attack=[],
        ai_summary={"executiveSummary": "", "evidenceChain": [], "rootCauseAnalysis": "", "recommendedActions": [], "confidenceExplanation": ""},
        timeline_events=[],
        comments=[],
        is_simulated=True
    )
    db_session.add(inc)
    await db_session.commit()

    res = await client.patch(
        f"/api/v1/incidents/{inc.id}/status",
        json={"status": "invalid_status_xyz"},
        headers=auth_headers
    )
    assert res.status_code == 400
    assert "INVALID_STATUS" in res.text
