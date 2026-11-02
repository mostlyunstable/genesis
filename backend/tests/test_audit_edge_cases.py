import pytest
import os
import shutil
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.models.event import SecurityEventModel
from backend.app.models.detection import DetectionModel
from backend.app.models.incident import IncidentModel
from backend.app.models.report import ReportModel
from backend.app.services.detection import detection_engine
from backend.app.services.anomaly import statistical_anomaly_engine
from backend.app.services.correlation import correlation_engine
from backend.app.services.response import PolicyEngine
from backend.app.services.report import report_service
from backend.app.services.chat_tools import validate_safe_dataset_path
from backend.app.services.log_watcher import LogWatcherService


@pytest.mark.asyncio
async def test_path_traversal_validation():
    """Verifies that validate_safe_dataset_path rejects CWE-22 path traversal attacks."""
    default = "data/default.csv"

    # 1. Directory traversal outside data directory
    is_safe, msg = validate_safe_dataset_path("../../etc/passwd", default)
    assert is_safe is False
    assert "outside authorized data sandbox" in msg

    is_safe2, msg2 = validate_safe_dataset_path("/etc/shadow", default)
    assert is_safe2 is False
    assert "outside authorized data sandbox" in msg2

    # 2. Legitimate relative path inside data (sandbox check passes)
    is_safe_valid, msg_valid = validate_safe_dataset_path("data/nonexistent.csv", default)
    assert "outside authorized data sandbox" not in msg_valid


@pytest.mark.asyncio
async def test_detection_engine_null_safety(db_session: AsyncSession):
    """Verifies that detection_engine handles events with null source_ip or username without crashing."""
    evt = SecurityEventModel(
        id="EVT-NULL-TEST-001",
        timestamp=datetime.now(timezone.utc),
        source="generic",
        event_type="authentication",
        source_ip=None,
        destination_ip="10.0.0.1",
        destination_port=22,
        username=None,
        outcome="failure",
        severity="low",
        raw_event="Malformed log missing IP and user",
        parsed_fields={},
        is_simulated=True,
        fingerprint="fp-null-test-001"
    )

    # Should safely process without AttributeError
    dets = await detection_engine.process_event(evt, db_session)
    assert isinstance(dets, list)


@pytest.mark.asyncio
async def test_anomaly_engine_null_safety(db_session: AsyncSession):
    """Verifies that anomaly_service handles events with null source_ip without crashing."""
    evt = SecurityEventModel(
        id="EVT-NULL-TEST-002",
        timestamp=datetime.now(timezone.utc),
        source="generic",
        event_type="authentication",
        source_ip=None,
        destination_ip="10.0.0.1",
        destination_port=22,
        username=None,
        outcome="failure",
        severity="low",
        raw_event="Malformed log missing IP and user",
        parsed_fields={},
        is_simulated=True,
        fingerprint="fp-null-test-002"
    )

    # Should evaluate safely
    res = await statistical_anomaly_engine.evaluate_event(evt, db_session)
    assert res is None or isinstance(res, DetectionModel)


@pytest.mark.asyncio
async def test_correlation_engine_null_list_safety(db_session: AsyncSession):
    """Verifies that correlation_engine handles incidents where JSON lists are None."""
    inc = IncidentModel(
        id="INC-CORR-NULL-TEST",
        title="Test Incident with Null Fields",
        category="Credential Access",
        severity="medium",
        status="active",
        risk_score=50,
        confidence_score=60,
        source_ips=["192.168.1.100"],
        target_accounts=None,  # Null JSON field
        detection_ids=None,    # Null JSON field
        event_ids=None,        # Null JSON field
        event_count=1,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        is_simulated=True
    )
    db_session.add(inc)
    await db_session.commit()

    det = DetectionModel(
        id="DET-CORR-TEST-001",
        name="SSH Brute Force",
        category="ssh_brute_force",
        description="Test detection",
        severity="high",
        source_ip="192.168.1.100",
        target_accounts=["root"],
        event_count=5,
        timestamp=datetime.now(timezone.utc),
        confidence=80.0,
        risk_score=75.0,
        status="open",
        triggering_conditions=["5 failed logons"],
        supporting_event_ids=["EVT-001", "EVT-002"],
        rule_id="RULE-001",
        rule_name="Test Rule"
    )
    db_session.add(det)
    await db_session.flush()

    # Correlate into existing incident with None fields
    correlated_inc = await correlation_engine.correlate_detection(det, db_session)
    assert correlated_inc is not None
    assert "DET-CORR-TEST-001" in correlated_inc.detection_ids
    assert "EVT-001" in correlated_inc.event_ids


@pytest.mark.asyncio
async def test_policy_engine_empty_target_protection():
    """Verifies PolicyEngine doesn't crash on empty, blank, or invalid targets."""
    assert PolicyEngine.is_target_protected("") is False
    assert PolicyEngine.is_target_protected("   ") is False
    assert PolicyEngine.is_target_protected("invalid_target_without_ip") is False
    assert PolicyEngine.is_target_protected("127.0.0.1") is True
    assert PolicyEngine.is_target_protected("10.0.0.1:22") is True


@pytest.mark.asyncio
async def test_report_service_render_export_string_created_at():
    """Verifies report_service.render_export handles string created_at without crashing."""
    class MockReport:
        id = "RPT-MOCK-001"
        incident_id = "INC-001"
        title = "Mock Incident Report"
        report_type = "INCIDENT_DOSSIER"
        classification = "CONFIDENTIAL"
        summary = "Executive summary of incident"
        findings = {"attacker_ip": "198.51.100.1"}
        recommendations = ["Block IP"]
        record_hash = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
        created_at = "2026-11-02T12:00:00Z"  # String representation, not datetime object
        generated_by = "GENESIS Autonomous Engine"
        is_simulated = False
        markdown_content = "# Report\nContent"

    mock_rep = MockReport()

    # Test HTML export
    html_bytes, media_type, fname = report_service.render_export(mock_rep, "html")
    assert b"Mock Incident Report" in html_bytes
    assert media_type == "text/html; charset=utf-8"

    # Test JSON export
    json_bytes, media_type, fname = report_service.render_export(mock_rep, "json")
    assert b"RPT-MOCK-001" in json_bytes
    assert media_type == "application/json; charset=utf-8"

    # Test CSV export
    csv_bytes, media_type, fname = report_service.render_export(mock_rep, "csv")
    assert b"RPT-MOCK-001" in csv_bytes
    assert media_type == "text/csv; charset=utf-8"


@pytest.mark.asyncio
async def test_log_watcher_quarantines_corrupt_file(db_session: AsyncSession):
    """Verifies that corrupted files in data/incoming are safely quarantined to data/quarantine."""
    test_incoming = "data/test_incoming"
    test_processed = "data/test_processed"
    test_quarantine = "data/test_quarantine"

    os.makedirs(test_incoming, exist_ok=True)
    os.makedirs(test_processed, exist_ok=True)
    os.makedirs(test_quarantine, exist_ok=True)

    watcher = LogWatcherService(
        incoming_dir=test_incoming,
        processed_dir=test_processed,
        quarantine_dir=test_quarantine
    )

    # Place a malformed JSON file
    bad_file = os.path.join(test_incoming, "corrupted_payload.json")
    with open(bad_file, "w") as f:
        f.write("{ invalid json payload !!!")

    res = await watcher.scan_and_ingest(db_session)

    # Bad file should no longer be in incoming
    assert not os.path.exists(bad_file)
    # Bad file should be in quarantine
    quarantined = os.listdir(test_quarantine)
    assert any("corrupt_" in q and "corrupted_payload.json" in q for q in quarantined)

    # Clean up test directories
    shutil.rmtree(test_incoming, ignore_errors=True)
    shutil.rmtree(test_processed, ignore_errors=True)
    shutil.rmtree(test_quarantine, ignore_errors=True)
