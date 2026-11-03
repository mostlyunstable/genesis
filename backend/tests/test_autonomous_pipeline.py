import os
import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.schemas.event import RawLogItem
from backend.app.services.ingest import NormalizerService
from backend.app.services.detection import detection_engine
from backend.app.services.log_watcher import log_watcher
from backend.app.services.auto_investigator import auto_investigator
from backend.app.models.incident import IncidentModel
from backend.app.models.chat import ChatMessageModel, ConversationModel
from backend.app.models.report import ReportModel


def test_vulnerability_banner_extraction():
    """Verifies that NormalizerService automatically detects vulnerable service banners and CVEs."""
    # 1. OpenSSH 8.9p1 -> CVE-2024-6387
    raw_ssh = "sshd[1234]: Failed password for invalid user admin from 198.51.100.44 port 43210 ssh2: OpenSSH_8.9p1 Ubuntu"
    cves_ssh = NormalizerService.extract_vulnerabilities(raw_ssh)
    assert len(cves_ssh) >= 1
    assert any(c["cve_id"] == "CVE-2024-6387" for c in cves_ssh)

    item = RawLogItem(raw=raw_ssh)
    parsed = NormalizerService.parse_log(source="linux_ssh", item=item)
    assert parsed is not None
    assert "detectedCves" in parsed.parsed_fields
    assert parsed.parsed_fields["detectedCves"][0]["cve_id"] == "CVE-2024-6387"

    # 2. Apache 2.4.49 -> CVE-2021-41773
    raw_apache = "Apache/2.4.49 (Unix) mod_ssl/2.4.49 configured -- resuming normal operations"
    cves_apache = NormalizerService.extract_vulnerabilities(raw_apache)
    assert any(c["cve_id"] == "CVE-2021-41773" for c in cves_apache)


@pytest.mark.asyncio
async def test_directory_watcher_ingest_and_archive(db_session: AsyncSession):
    """Verifies that log_watcher monitors data/incoming, ingests logs, and archives to data/processed."""
    detection_engine.reset()
    incoming_dir = log_watcher.incoming_dir
    os.makedirs(incoming_dir, exist_ok=True)

    test_file_path = os.path.join(incoming_dir, "test_watcher_batch.log")
    with open(test_file_path, "w", encoding="utf-8") as f:
        f.write("sshd[901]: Failed password for root from 198.51.100.80 port 2201\n")
        f.write("sshd[902]: Failed password for admin from 198.51.100.80 port 2202\n")

    res = await log_watcher.scan_and_ingest(db_session)

    assert res["status"] == "SUCCESS"
    assert res["files_scanned"] >= 1
    assert res["events_processed"] >= 2
    # The file should be moved out of data/incoming
    assert not os.path.exists(test_file_path)


@pytest.mark.asyncio
async def test_auto_investigator_creates_report_and_chat_briefing(db_session: AsyncSession):
    """
    Verifies that auto_investigator executes the ReAct reasoning loop, generates
    a signed ReportModel, and injects a formatted briefing message into Copilot chat.
    """
    now = datetime.now(timezone.utc)
    inc = IncidentModel(
        id="INC-AUTO-TEST-001",
        title="SSH Brute-Force Intrusion & Breach from 198.51.100.19",
        category="Credential Access",
        severity="critical",
        status="active",
        risk_score=92,
        confidence_score=95,
        source_ips=["198.51.100.19"],
        target_accounts=["root", "deploy"],
        event_count=12,
        created_at=now,
        updated_at=now,
        detection_ids=["DET-001"],
        event_ids=["EVT-001"],
        detection_explanation="High velocity SSH brute force detected.",
        mitre_attack=[{"techniqueId": "T1110.001", "techniqueName": "Password Guessing"}],
        ai_summary={
            "affectedAsset": {
                "hostname": "db-prod-01.corp.internal",
                "ipAddress": "10.240.10.15",
                "assetTier": 1,
                "tierMultiplier": 1.3,
                "vulnerabilities": [{"cve_id": "CVE-2024-6387", "severity": "CRITICAL"}]
            }
        },
        timeline_events=[],
        is_simulated=True
    )
    db_session.add(inc)
    await db_session.commit()

    inv_res = await auto_investigator.auto_investigate_incident(inc, db_session)

    assert inv_res["status"] == "COMPLETED"
    assert inv_res["incident_id"] == "INC-AUTO-TEST-001"
    assert inv_res["report_id"] is not None

    # Verify ReportModel was created and has SHA-256 hash
    stmt_rep = select(ReportModel).where(ReportModel.id == inv_res["report_id"])
    res_rep = await db_session.execute(stmt_rep)
    report = res_rep.scalar_one_or_none()
    assert report is not None
    assert len(report.record_hash) == 64

    # Verify ChatMessageModel was posted to conversation
    stmt_msg = select(ChatMessageModel).where(ChatMessageModel.id == inv_res["message_id"])
    res_msg = await db_session.execute(stmt_msg)
    chat_msg = res_msg.scalar_one_or_none()
    assert chat_msg is not None
    assert chat_msg.role == "assistant"
    assert "Autonomous Incident Assessment" in chat_msg.content
    assert "198.51.100.19" in chat_msg.content
    assert "db-prod-01.corp.internal" in chat_msg.content
    assert "CVE-2024-6387" in chat_msg.content


@pytest.mark.asyncio
async def test_automation_api_endpoints(client: AsyncClient, auth_headers: dict):
    """Verifies the /api/v1/automation REST endpoints."""
    # 1. GET /automation/status
    st_res = await client.get("/api/v1/automation/status", headers=auth_headers)
    assert st_res.status_code == 200
    st_data = st_res.json()
    assert st_data["status"] == "ONLINE"
    assert "watcher" in st_data
    assert "auto_investigation" in st_data

    # 2. POST /automation/watcher/scan
    scan_res = await client.post("/api/v1/automation/watcher/scan", headers=auth_headers)
    assert scan_res.status_code == 200

    # 3. POST /automation/simulate-brute-force
    sim_res = await client.post(
        "/api/v1/automation/simulate-brute-force",
        json={
            "attacker_ip": "198.51.100.188",
            "target_ip": "10.240.10.15",
            "target_accounts": ["root", "admin", "postgres", "deploy"],
            "failure_count": 12,
            "service_banner": "OpenSSH 8.9p1 Ubuntu"
        },
        headers=auth_headers
    )
    assert sim_res.status_code == 200
    sim_data = sim_res.json()
    assert sim_data["status"] == "COMPLETED"
    assert sim_data["events_ingested"] == 12
    assert sim_data["detection_id"] is not None
    assert sim_data["incident_id"] is not None
    assert sim_data["autonomous_investigation"] is not None
    assert sim_data["autonomous_investigation"]["status"] == "COMPLETED"


@pytest.mark.asyncio
@pytest.mark.parametrize("payload", [{"target_accounts": []}, {"failure_count": 0}, {"failure_count": 101}])
async def test_simulator_rejects_invalid_workload(client, auth_headers, payload):
    response = await client.post("/api/v1/automation/simulate-brute-force", headers=auth_headers, json=payload)
    assert response.status_code == 422
