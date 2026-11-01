import io
import json
import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.models.chat import UploadedFileModel
from backend.app.models.event import SecurityEventModel
from backend.app.models.detection import DetectionModel
from backend.app.services.file_ingest import file_ingest_service


@pytest.mark.asyncio
async def test_file_upload_and_ingestion_openssh(client: AsyncClient, auth_headers: dict, db_session: AsyncSession):
    # 1. Create a conversation
    conv_resp = await client.post(
        "/api/v1/chat/conversations",
        json={"title": "SSH Auth Log Investigation"},
        headers=auth_headers
    )
    conv_id = conv_resp.json()["id"]

    # 2. Prepare realistic OpenSSH log content with brute-force attempts
    sample_log = (
        "Oct 31 10:14:01 bastion sshd[1042]: Failed password for root from 198.51.100.99 port 44321 ssh2\n"
        "Oct 31 10:14:03 bastion sshd[1043]: Failed password for admin from 198.51.100.99 port 44322 ssh2\n"
        "Oct 31 10:14:05 bastion sshd[1044]: Failed password for deploy from 198.51.100.99 port 44323 ssh2\n"
        "Oct 31 10:14:07 bastion sshd[1045]: Failed password for deploy from 198.51.100.99 port 44324 ssh2\n"
        "Oct 31 10:14:09 bastion sshd[1046]: Failed password for deploy from 198.51.100.99 port 44325 ssh2\n"
        "Oct 31 10:14:15 bastion sshd[1047]: Accepted password for deploy from 198.51.100.99 port 44326 ssh2\n"
    )

    files = {"file": ("auth.log", io.BytesIO(sample_log.encode("utf-8")), "text/plain")}

    # 3. Upload file to conversation
    upload_resp = await client.post(
        f"/api/v1/chat/conversations/{conv_id}/upload",
        files=files,
        headers=auth_headers
    )
    assert upload_resp.status_code == 201, upload_resp.text
    file_data = upload_resp.json()
    assert file_data["filename"] == "auth.log"
    assert file_data["formatDetected"] == "openssh"
    assert file_data["status"] == "completed"
    assert file_data["parsedCount"] == 6
    assert file_data["failedCount"] == 0

    analysis = file_data["analysisSummary"]
    assert "198.51.100.99" in analysis["uniqueSourceIps"]
    assert "deploy" in analysis["uniqueAccounts"]
    assert analysis["failureCount"] == 5
    assert analysis["successCount"] == 1

    # 4. List conversation files
    list_files_resp = await client.get(
        f"/api/v1/chat/conversations/{conv_id}/files",
        headers=auth_headers
    )
    assert list_files_resp.status_code == 200
    files_list = list_files_resp.json()
    assert len(files_list) == 1
    assert files_list[0]["id"] == file_data["id"]

    # 5. Get file details
    detail_resp = await client.get(
        f"/api/v1/chat/files/{file_data['id']}",
        headers=auth_headers
    )
    assert detail_resp.status_code == 200
    assert detail_resp.json()["id"] == file_data["id"]


@pytest.mark.asyncio
async def test_file_upload_jsonl_okta(client: AsyncClient, auth_headers: dict):
    conv_resp = await client.post(
        "/api/v1/chat/conversations",
        json={"title": "Okta SSO Ingestion"},
        headers=auth_headers
    )
    conv_id = conv_resp.json()["id"]

    okta_lines = [
        json.dumps({
            "eventType": "user.authentication.verify",
            "actor": {"alternateId": "alice@corp.com"},
            "client": {"ipAddress": "203.0.113.55", "device": "macOS"},
            "outcome": {"result": "FAILURE", "reason": "INVALID_CREDENTIALS"}
        }),
        json.dumps({
            "eventType": "user.authentication.verify",
            "actor": {"alternateId": "bob@corp.com"},
            "client": {"ipAddress": "203.0.113.55", "device": "macOS"},
            "outcome": {"result": "FAILURE", "reason": "INVALID_CREDENTIALS"}
        })
    ]
    raw_content = "\n".join(okta_lines)

    files = {"file": ("okta_events.jsonl", io.BytesIO(raw_content.encode("utf-8")), "application/x-ndjson")}
    upload_resp = await client.post(
        f"/api/v1/chat/conversations/{conv_id}/upload",
        files=files,
        headers=auth_headers
    )
    assert upload_resp.status_code == 201
    res = upload_resp.json()
    assert res["formatDetected"] == "jsonl"
    assert res["parsedCount"] == 2
    assert "203.0.113.55" in res["analysisSummary"]["uniqueSourceIps"]


@pytest.mark.asyncio
async def test_file_upload_security_validations(client: AsyncClient, auth_headers: dict):
    conv_resp = await client.post(
        "/api/v1/chat/conversations",
        json={"title": "Validation Test"},
        headers=auth_headers
    )
    conv_id = conv_resp.json()["id"]

    # 1. Empty file rejection
    empty_file = {"file": ("empty.log", io.BytesIO(b""), "text/plain")}
    resp_empty = await client.post(
        f"/api/v1/chat/conversations/{conv_id}/upload",
        files=empty_file,
        headers=auth_headers
    )
    assert resp_empty.status_code == 400
    assert "empty" in resp_empty.text.lower()

    # 2. Unsupported extension rejection
    bad_file = {"file": ("malware.exe", io.BytesIO(b"binary payload"), "application/octet-stream")}
    resp_bad = await client.post(
        f"/api/v1/chat/conversations/{conv_id}/upload",
        files=bad_file,
        headers=auth_headers
    )
    assert resp_bad.status_code == 400
    assert "extension" in resp_bad.text.lower()

    # 3. Path traversal sanitized
    traversal_file = {"file": ("../../../../etc/passwd.log", io.BytesIO(b"sshd[1]: Failed password for test from 1.2.3.4 port 22\n"), "text/plain")}
    resp_trav = await client.post(
        f"/api/v1/chat/conversations/{conv_id}/upload",
        files=traversal_file,
        headers=auth_headers
    )
    assert resp_trav.status_code == 201
    assert ".." not in resp_trav.json()["filename"]
