import json
import pytest
from datetime import datetime, timezone
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.models.incident import IncidentModel
from backend.app.models.detection import DetectionModel
from backend.app.models.event import SecurityEventModel
from backend.app.models.threat_intel import ThreatIntelModel
from backend.app.models.report import ReportModel
from backend.app.models.audit import AuditRecordModel
from backend.app.services.chat_tools import tool_registry, GenerateInvestigationReportInput
from backend.app.services.report import report_service


@pytest.fixture
async def setup_incident_data(db_session: AsyncSession):
    now = datetime.now(timezone.utc)
    evt = SecurityEventModel(
        id="EVT-REP-001",
        timestamp=now,
        source="linux_ssh",
        event_type="SSH_AUTH_FAIL",
        username="admin",
        source_ip="198.51.100.99",
        destination_ip="10.240.10.15",
        destination_port=22,
        outcome="failure",
        severity="warning",
        raw_event="Oct 31 12:00:01 bastion sshd[100]: Failed password for admin from 198.51.100.99 port 22",
        parsed_fields={"targetService": "sshd"},
        fingerprint="fp_rep_001",
        is_simulated=True
    )
    db_session.add(evt)

    det = DetectionModel(
        id="DET-REP-001",
        name="SSH Velocity Threshold Breach",
        category="ssh_brute_force",
        description="Observed repeated failures from 198.51.100.99",
        severity="critical",
        source_ip="198.51.100.99",
        target_accounts=["admin"],
        event_count=5,
        timestamp=now,
        confidence=95.0,
        risk_score=85.0,
        status="open",
        triggering_conditions=["Failed attempts >= 5"],
        supporting_event_ids=["EVT-REP-001"],
        rule_id="RULE-SSH-BRUTE-001",
        rule_name="SSH Velocity Threshold",
        is_simulated=True
    )
    db_session.add(det)

    inc = IncidentModel(
        id="INC-2026-REP1",
        title="SSH Brute-Force Intrusion on Bastion-01 (198.51.100.99)",
        category="Credential Probing",
        severity="critical",
        status="active",
        risk_score=88,
        confidence_score=95,
        source_ips=["198.51.100.99"],
        target_accounts=["admin"],
        event_count=5,
        created_at=now,
        updated_at=now,
        detection_ids=["DET-REP-001"],
        event_ids=["EVT-REP-001"],
        detection_explanation="High-velocity SSH brute force",
        mitre_attack=[
            {
                "techniqueId": "T1110.001",
                "techniqueName": "Password Guessing",
                "tactic": "Credential Access",
                "referenceUrl": "https://attack.mitre.org/techniques/T1110/001/"
            }
        ],
        ai_summary={"executiveSummary": "Attacker probed bastion-01."},
        timeline_events=[],
        assigned_playbook_id="PB-SSH-BRUTE-01",
        is_simulated=True
    )
    db_session.add(inc)

    ti = ThreatIntelModel(
        ip="198.51.100.99",
        threat_classification="Known SSH Scanner",
        reputation_score=92,
        country="Netherlands",
        country_code="NL",
        asn="AS12345",
        associated_incidents=["INC-2026-REP1"],
        confidence=90,
        mitre_techniques=["T1110.001"],
        tags=["botnet", "ssh_scanner"],
        simulated_data_source="Sentinel Synthetic Feed"
    )
    db_session.add(ti)

    await db_session.commit()
    return inc


@pytest.mark.asyncio
async def test_generate_report_from_incident(client: AsyncClient, auth_headers: dict, setup_incident_data: IncidentModel, db_session: AsyncSession):
    """Verifies generating an evidence-backed incident dossier via POST /api/v1/reports/generate."""
    inc = setup_incident_data
    res = await client.post(
        "/api/v1/reports/generate",
        json={
            "target_id": inc.id,
            "target_type": "incident",
            "report_type": "INCIDENT_DOSSIER",
            "custom_notes": "Immediate containment verified by analyst."
        },
        headers=auth_headers
    )
    assert res.status_code == 201, res.text
    data = res.json()

    assert data["incidentId"] == inc.id
    assert "Incident Response Dossier" in data["title"]
    assert data["reportType"] == "INCIDENT_DOSSIER"
    assert data["classification"] == "CONFIDENTIAL // SECOPS USE ONLY"
    assert len(data["recordHash"]) == 64  # Valid SHA-256
    assert "88/100" in data["markdownContent"]
    assert "T1110.001" in data["markdownContent"]
    assert "PB-SSH-BRUTE-01" in data["markdownContent"]
    assert "Immediate containment verified by analyst." in data["markdownContent"]

    # Verify report is persisted in database
    res_db = await db_session.execute(select(ReportModel).where(ReportModel.id == data["id"]))
    report_rec = res_db.scalar_one_or_none()
    assert report_rec is not None
    assert report_rec.incident_id == inc.id

    # Verify audit trail record was created
    res_audit = await db_session.execute(
        select(AuditRecordModel).where(AuditRecordModel.target == data["id"])
    )
    audit = res_audit.scalar_one_or_none()
    assert audit is not None
    assert audit.action == "SECURITY_REPORT_GENERATED"
    assert audit.category == "REPORT_GENERATION"


@pytest.mark.asyncio
async def test_generate_report_from_ip(client: AsyncClient, auth_headers: dict, setup_incident_data: IncidentModel):
    """Verifies generating a host threat intelligence dossier via IP lookup."""
    res = await client.post(
        "/api/v1/reports/generate",
        json={
            "target_id": "198.51.100.99",
            "target_type": "ip",
            "report_type": "INVESTIGATION_SUMMARY"
        },
        headers=auth_headers
    )
    assert res.status_code == 201, res.text
    data = res.json()

    assert "198.51.100.99" in data["title"]
    assert data["findings"]["reputationScore"] == 92
    assert data["findings"]["country"] == "Netherlands"
    assert "iptables DROP" in data["markdownContent"]


@pytest.mark.asyncio
async def test_list_and_get_reports(client: AsyncClient, auth_headers: dict, setup_incident_data: IncidentModel):
    """Verifies report catalog listing and single detail fetching."""
    # Generate 2 reports
    await client.post(
        "/api/v1/reports/generate",
        json={"target_id": setup_incident_data.id, "target_type": "incident"},
        headers=auth_headers
    )
    gen_res = await client.post(
        "/api/v1/reports/generate",
        json={"target_id": "198.51.100.99", "target_type": "ip"},
        headers=auth_headers
    )
    report_id = gen_res.json()["id"]

    # List reports
    list_res = await client.get("/api/v1/reports", headers=auth_headers)
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] >= 2
    assert any(r["id"] == report_id for r in list_data["items"])

    # Get single report detail
    detail_res = await client.get(f"/api/v1/reports/{report_id}", headers=auth_headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["id"] == report_id


@pytest.mark.asyncio
async def test_report_export_formats(client: AsyncClient, auth_headers: dict, setup_incident_data: IncidentModel):
    """Verifies exporting reports into Markdown, JSON, CSV, and HTML formats."""
    gen_res = await client.post(
        "/api/v1/reports/generate",
        json={"target_id": setup_incident_data.id, "target_type": "incident"},
        headers=auth_headers
    )
    rep_id = gen_res.json()["id"]

    # 1. Markdown Export
    res_md = await client.get(f"/api/v1/reports/{rep_id}/download?format=markdown", headers=auth_headers)
    assert res_md.status_code == 200
    assert "text/markdown" in res_md.headers["content-type"]
    assert f'filename="genesis_report_{rep_id}.md"' in res_md.headers["content-disposition"]
    assert "# Incident Response Dossier" in res_md.text

    # 2. JSON Export
    res_json = await client.get(f"/api/v1/reports/{rep_id}/download?format=json", headers=auth_headers)
    assert res_json.status_code == 200
    assert "application/json" in res_json.headers["content-type"]
    json_data = json.loads(res_json.text)
    assert json_data["id"] == rep_id
    assert json_data["recordHash"] == gen_res.json()["recordHash"]

    # 3. CSV Export
    res_csv = await client.get(f"/api/v1/reports/{rep_id}/download?format=csv", headers=auth_headers)
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["content-type"]
    assert "Report ID,Title,Type,Classification" in res_csv.text

    # 4. HTML Export
    res_html = await client.get(f"/api/v1/reports/{rep_id}/download?format=html", headers=auth_headers)
    assert res_html.status_code == 200
    assert "text/html" in res_html.headers["content-type"]
    assert "<!DOCTYPE html>" in res_html.text
    assert rep_id in res_html.text


@pytest.mark.asyncio
async def test_chat_tool_generate_investigation_report(setup_incident_data: IncidentModel, db_session: AsyncSession):
    """Verifies that the chat tool generate_investigation_report actively calls the report engine and persists the report."""
    res = await tool_registry.generate_investigation_report(
        GenerateInvestigationReportInput(target_id=setup_incident_data.id, target_type="incident"),
        db_session
    )
    assert res["status"] == "SUCCESS"
    assert res["reportId"].startswith("REP-2026-")
    assert len(res["recordHash"]) == 64
    assert res["downloadUrl"].startswith("/api/v1/reports/")

    # Verify report model exists in DB
    rep = await db_session.execute(select(ReportModel).where(ReportModel.id == res["reportId"]))
    assert rep.scalar_one_or_none() is not None


@pytest.mark.asyncio
async def test_report_cryptographic_hash_integrity(setup_incident_data: IncidentModel, db_session: AsyncSession):
    """Verifies cryptographic tamper detection on generated reports."""
    report = await report_service.generate_report(
        target_id=setup_incident_data.id,
        target_type="incident",
        db=db_session
    )

    # Recalculate original hash -> must match
    expected_hash = report_service.compute_report_hash(
        report.id, report.title, report.created_at, report.summary, report.findings
    )
    assert report.record_hash == expected_hash

    # Tampered summary -> hash mismatch detected
    tampered_hash = report_service.compute_report_hash(
        report.id, report.title, report.created_at, report.summary + " TAMPERED", report.findings
    )
    assert report.record_hash != tampered_hash
