import pytest
import re
from datetime import datetime, timezone
from httpx import AsyncClient

from backend.app.core.config import settings
from backend.app.services.ingest import NormalizerService
from backend.app.schemas.event import RawLogItem


@pytest.mark.asyncio
async def test_rfc5424_syslog_parsing():
    """Verify RFC 5424 Syslog parsing: PRI, VERSION, TIMESTAMP, HOSTNAME, APP-NAME, MSG."""
    raw_rfc = "<134>1 2026-10-31T12:00:00Z edge-gw-01 sshd 4120 - - Failed password for user admin from 198.51.100.77 port 52101 ssh2"
    item = RawLogItem(raw=raw_rfc, timestamp=datetime.now(timezone.utc))
    event = NormalizerService.parse_log("syslog", item)

    assert event is not None
    assert event.source == "syslog_rfc5424"
    assert event.source_ip == "198.51.100.77"
    assert event.username == "admin"
    assert event.outcome == "failure"
    assert event.parsed_fields["hostname"] == "edge-gw-01"
    assert event.parsed_fields["pri"] == 134
    assert event.parsed_fields["app"] == "sshd"
    # Verify SHA-256 fingerprint
    assert len(event.fingerprint) == 64
    assert re.match(r"^[0-9a-f]{64}$", event.fingerprint)


@pytest.mark.asyncio
async def test_okta_system_log_parsing():
    """Verify Okta System Log JSON schema parsing: actor, client, outcome, eventType."""
    okta_json = {
        "eventType": "user.authentication.verify",
        "actor": {"id": "00u12345", "type": "User", "alternateId": "carol.danvers@company.com"},
        "client": {
            "ipAddress": "203.0.113.92",
            "device": "MacBookPro",
            "geographicalContext": {"country": "US", "city": "San Francisco"}
        },
        "outcome": {"result": "FAILURE", "reason": "INVALID_CREDENTIALS"}
    }
    import json
    item = RawLogItem(raw=json.dumps(okta_json), timestamp=datetime.now(timezone.utc))
    event = NormalizerService.parse_log("okta", item)

    assert event is not None
    assert event.source == "okta"
    assert event.username == "carol.danvers@company.com"
    assert event.source_ip == "203.0.113.92"
    assert event.outcome == "failure"
    assert event.parsed_fields["vendor"] == "okta"
    assert event.parsed_fields["failureReason"] == "INVALID_CREDENTIALS"
    assert event.parsed_fields["zone"] == "US"
    assert len(event.fingerprint) == 64


@pytest.mark.asyncio
async def test_windows_security_event_4625_parsing():
    """Verify Windows Security Event 4625 (Logon Failure) parsing."""
    raw_win = (
        "Event 4625: An account failed to log on.\n"
        "Subject:\n"
        "\tSecurity ID:\t\tS-1-0-0\n"
        "Account For Which Logon Failed:\n"
        "\tAccount Name:\t\tsvc_backup\n"
        "Network Information:\n"
        "\tWorkstation Name:\tWIN-SRV-2026\n"
        "\tSource Network Address:\t198.51.100.18\n"
        "\tSource Port:\t\t54122\n"
    )
    item = RawLogItem(raw=raw_win, timestamp=datetime.now(timezone.utc))
    event = NormalizerService.parse_log("windows_security", item)

    assert event is not None
    assert event.source == "windows_security"
    assert event.username == "svc_backup"
    assert event.source_ip == "198.51.100.18"
    assert event.destination_port == 54122
    assert event.outcome == "failure"
    assert event.parsed_fields["workstation"] == "WIN-SRV-2026"
    assert event.parsed_fields["eventId"] == "4625"
    assert len(event.fingerprint) == 64


@pytest.mark.asyncio
async def test_sha256_fingerprint_unification_and_deduplication(client: AsyncClient):
    """
    Verify SHA-256 fingerprint consistency across batches:
    1. Ingest batch of diverse logs.
    2. Ensure all fingerprints are 64-character SHA-256 hex strings.
    3. Re-ingesting identical logs yields duplicateCount == batch length.
    """
    ts = datetime.now(timezone.utc).isoformat()
    logs = [
        {"timestamp": ts, "raw": "<134>1 2026-10-31T12:00:00Z h1 sshd 1 - - Failed password for user u1 from 198.51.100.1 port 22"},
        {"timestamp": ts, "raw": '{"eventType": "user.session.start", "actor": {"alternateId": "u2@corp.com"}, "client": {"ipAddress": "198.51.100.2"}, "outcome": {"result": "SUCCESS"}}'},
        {"timestamp": ts, "raw": "Event 4625: Logon Failure. Account Name: u3. Source Network Address: 198.51.100.3. Port: 3389."}
    ]

    # Ingest 1
    res1 = await client.post(
        "/api/v1/ingest/batch",
        json={"source": "generic", "logs": logs},
        headers={"X-Sentinel-Forwarder-Key": settings.FORWARDER_API_KEY}
    )
    assert res1.status_code == 202
    assert res1.json()["normalizedCount"] == 3
    assert res1.json()["duplicateCount"] == 0

    # Ingest 2 (Duplicate check)
    res2 = await client.post(
        "/api/v1/ingest/batch",
        json={"source": "generic", "logs": logs},
        headers={"X-Sentinel-Forwarder-Key": settings.FORWARDER_API_KEY}
    )
    assert res2.status_code == 202
    assert res2.json()["normalizedCount"] == 0
    assert res2.json()["duplicateCount"] == 3
