import pytest
import json
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.services.chat import chat_copilot_service


def extract_stream_text(events: list) -> str:
    tokens = []
    for line in events:
        for block in line.split("\n\n"):
            if "event: token" in block:
                for sub in block.split("\n"):
                    if sub.startswith("data:"):
                        try:
                            d = json.loads(sub[5:].strip())
                            tokens.append(d.get("delta", ""))
                        except Exception:
                            pass
    return "".join(tokens)


@pytest.mark.asyncio
async def test_q01_arp_poisoning_query(db_session: AsyncSession):
    conv = await chat_copilot_service.get_or_create_conversation(conversation_id=None, db=db_session, title="ARP Q")
    chunks = []
    async for chunk in chat_copilot_service.process_message_stream(
        conversation=conv,
        user_message_text="What is an ARP poisoning attack and how does it work?",
        db=db_session
    ):
        chunks.append(chunk)
    text = extract_stream_text(chunks)
    assert "environment status: online" not in text.lower()
    assert "arp" in text.lower()
    assert "mac" in text.lower()
    assert "gateway" in text.lower() or "mitm" in text.lower() or "gratuitous" in text.lower()


@pytest.mark.asyncio
async def test_q02_firewalls_spi_query(db_session: AsyncSession):
    conv = await chat_copilot_service.get_or_create_conversation(conversation_id=None, db=db_session, title="Firewall Q")
    chunks = []
    async for chunk in chat_copilot_service.process_message_stream(
        conversation=conv,
        user_message_text="How do firewalls work and what is stateful packet inspection?",
        db=db_session
    ):
        chunks.append(chunk)
    text = extract_stream_text(chunks)
    assert "environment status: online" not in text.lower()
    assert "firewall" in text.lower()
    assert "stateful packet inspection" in text.lower() or "spi" in text.lower()
    assert "connection" in text.lower() or "state" in text.lower()


@pytest.mark.asyncio
async def test_q03_symmetric_vs_asymmetric_query(db_session: AsyncSession):
    conv = await chat_copilot_service.get_or_create_conversation(conversation_id=None, db=db_session, title="Crypto Q")
    chunks = []
    async for chunk in chat_copilot_service.process_message_stream(
        conversation=conv,
        user_message_text="Explain the difference between symmetric and asymmetric encryption.",
        db=db_session
    ):
        chunks.append(chunk)
    text = extract_stream_text(chunks)
    assert "environment status: online" not in text.lower()
    assert "symmetric" in text.lower()
    assert "asymmetric" in text.lower()
    assert "aes" in text.lower() or "rsa" in text.lower() or "key" in text.lower()


@pytest.mark.asyncio
async def test_q04_ransomware_query(db_session: AsyncSession):
    conv = await chat_copilot_service.get_or_create_conversation(conversation_id=None, db=db_session, title="Ransomware Q")
    chunks = []
    async for chunk in chat_copilot_service.process_message_stream(
        conversation=conv,
        user_message_text="What is ransomware and how does it delete shadow copies?",
        db=db_session
    ):
        chunks.append(chunk)
    text = extract_stream_text(chunks)
    assert "environment status: online" not in text.lower()
    assert "ransomware" in text.lower()
    assert "vssadmin" in text.lower() or "shadow" in text.lower() or "encryption" in text.lower()


@pytest.mark.asyncio
async def test_q05_csrf_query(db_session: AsyncSession):
    conv = await chat_copilot_service.get_or_create_conversation(conversation_id=None, db=db_session, title="CSRF Q")
    chunks = []
    async for chunk in chat_copilot_service.process_message_stream(
        conversation=conv,
        user_message_text="Explain Cross-Site Request Forgery (CSRF) and how SameSite cookies mitigate it.",
        db=db_session
    ):
        chunks.append(chunk)
    text = extract_stream_text(chunks)
    assert "environment status: online" not in text.lower()
    assert "csrf" in text.lower() or "cross-site request forgery" in text.lower()
    assert "samesite" in text.lower() or "cookie" in text.lower()


@pytest.mark.asyncio
async def test_q06_siem_vs_edr_query(db_session: AsyncSession):
    conv = await chat_copilot_service.get_or_create_conversation(conversation_id=None, db=db_session, title="SIEM EDR Q")
    chunks = []
    async for chunk in chat_copilot_service.process_message_stream(
        conversation=conv,
        user_message_text="What is the difference between SIEM and EDR?",
        db=db_session
    ):
        chunks.append(chunk)
    text = extract_stream_text(chunks)
    assert "environment status: online" not in text.lower()
    assert "siem" in text.lower()
    assert "edr" in text.lower()
    assert "endpoint" in text.lower() or "log" in text.lower()


@pytest.mark.asyncio
async def test_q07_incident_response_lifecycle_query(db_session: AsyncSession):
    conv = await chat_copilot_service.get_or_create_conversation(conversation_id=None, db=db_session, title="IR Q")
    chunks = []
    async for chunk in chat_copilot_service.process_message_stream(
        conversation=conv,
        user_message_text="What is the NIST 800-61 Incident Response Lifecycle?",
        db=db_session
    ):
        chunks.append(chunk)
    text = extract_stream_text(chunks)
    assert "environment status: online" not in text.lower()
    assert "incident response" in text.lower()
    assert "containment" in text.lower()
    assert "eradication" in text.lower() or "recovery" in text.lower()


@pytest.mark.asyncio
async def test_q08_lolbins_query(db_session: AsyncSession):
    conv = await chat_copilot_service.get_or_create_conversation(conversation_id=None, db=db_session, title="LOLBins Q")
    chunks = []
    async for chunk in chat_copilot_service.process_message_stream(
        conversation=conv,
        user_message_text="What are LOLBins and how does certutil get abused?",
        db=db_session
    ):
        chunks.append(chunk)
    text = extract_stream_text(chunks)
    assert "environment status: online" not in text.lower()
    assert "lolbin" in text.lower() or "living-off-the-land" in text.lower() or "certutil" in text.lower()


@pytest.mark.asyncio
async def test_q09_docker_security_query(db_session: AsyncSession):
    conv = await chat_copilot_service.get_or_create_conversation(conversation_id=None, db=db_session, title="Docker Q")
    chunks = []
    async for chunk in chat_copilot_service.process_message_stream(
        conversation=conv,
        user_message_text="What is Docker socket abuse and how does it lead to host compromise?",
        db=db_session
    ):
        chunks.append(chunk)
    text = extract_stream_text(chunks)
    assert "environment status: online" not in text.lower()
    assert "docker" in text.lower()
    assert "socket" in text.lower() or "root" in text.lower() or "container" in text.lower()


@pytest.mark.asyncio
async def test_q10_password_hashing_argon2_query(db_session: AsyncSession):
    conv = await chat_copilot_service.get_or_create_conversation(conversation_id=None, db=db_session, title="Hashing Q")
    chunks = []
    async for chunk in chat_copilot_service.process_message_stream(
        conversation=conv,
        user_message_text="What is password hashing and why is Argon2id recommended over MD5?",
        db=db_session
    ):
        chunks.append(chunk)
    text = extract_stream_text(chunks)
    assert "environment status: online" not in text.lower()
    assert "argon2id" in text.lower() or "password hashing" in text.lower()
    assert "salt" in text.lower() or "rainbow" in text.lower() or "gpu" in text.lower()


@pytest.mark.asyncio
async def test_q11_what_is_phishing_attack(db_session: AsyncSession):
    conv = await chat_copilot_service.get_or_create_conversation(conversation_id=None, db=db_session, title="Phishing Concept")
    chunks = []
    async for chunk in chat_copilot_service.process_message_stream(
        conversation=conv,
        user_message_text="What is a phishing attack?",
        db=db_session
    ):
        chunks.append(chunk)
    text = extract_stream_text(chunks)
    # Must NOT output log analysis or dataset evaluation records
    assert "log analysis" not in text.lower()
    assert "evaluated 6 corporate email records" not in text.lower()
    assert "environment status: online" not in text.lower()
    # Must answer with comprehensive technical explanation
    assert "phishing" in text.lower()
    assert "social engineering" in text.lower() or "credentials" in text.lower()
    assert "spf" in text.lower() or "dmarc" in text.lower() or "fido2" in text.lower()


@pytest.mark.asyncio
async def test_q12_phishing_question_with_file_in_context(db_session: AsyncSession):
    """
    Verifies that if a user has uploaded a log file in a conversation,
    asking 'What is a phishing attack?' answers the question directly and does NOT
    hijack the response with a log analysis summary.
    """
    from backend.app.models.chat import UploadedFileModel
    from datetime import datetime, timezone

    conv = await chat_copilot_service.get_or_create_conversation(conversation_id=None, db=db_session, title="File Context Conversation")
    
    # Simulate an attached uploaded file in the conversation
    sample_file = UploadedFileModel(
        id="file_test_auth_log_001",
        conversation_id=conv.id,
        filename="auth.log",
        file_hash="a" * 64,
        file_size=1024,
        storage_path="/tmp/auth.log",
        format_detected="openssh",
        status="completed",
        parsed_count=12,
        failed_count=0,
        analysis_summary={
            "totalRecords": 12,
            "failureCount": 10,
            "successCount": 2,
            "uniqueSourceIps": ["198.51.100.42"],
            "uniqueAccounts": ["root", "admin", "deploy"],
            "detectionsCount": 2,
            "incidentsCreated": 1
        },
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(sample_file)
    await db_session.commit()

    # User asks a conceptual question in this conversation with an attached file
    chunks = []
    async for chunk in chat_copilot_service.process_message_stream(
        conversation=conv,
        user_message_text="What is a phishing attack and how do attackers use social engineering?",
        db=db_session,
        context_file_id=sample_file.id
    ):
        chunks.append(chunk)
    text = extract_stream_text(chunks)

    # CRITICAL: It MUST answer the question and MUST NOT substitute a log analysis report
    assert "### log analysis: `auth.log`" not in text.lower()
    assert "analyzed `12` records" not in text.lower()
    assert "phishing" in text.lower()
    assert "social engineering" in text.lower()


@pytest.mark.asyncio
async def test_q13_explicit_file_query_still_works_with_file(db_session: AsyncSession):
    """
    Verifies that when the user DOES explicitly ask to analyze the file,
    the bot correctly provides the log analysis report.
    """
    from backend.app.models.chat import UploadedFileModel
    from datetime import datetime, timezone

    conv = await chat_copilot_service.get_or_create_conversation(conversation_id=None, db=db_session, title="File Analysis Conversation")
    
    sample_file = UploadedFileModel(
        id="file_test_auth_log_002",
        conversation_id=conv.id,
        filename="auth.log",
        file_hash="b" * 64,
        file_size=1024,
        storage_path="/tmp/auth.log",
        format_detected="openssh",
        status="completed",
        parsed_count=12,
        failed_count=0,
        analysis_summary={
            "totalRecords": 12,
            "failureCount": 10,
            "successCount": 2,
            "uniqueSourceIps": ["198.51.100.42"],
            "uniqueAccounts": ["root", "admin", "deploy"],
            "detectionsCount": 2,
            "incidentsCreated": 1
        },
        created_at=datetime.now(timezone.utc)
    )
    db_session.add(sample_file)
    await db_session.commit()

    chunks = []
    async for chunk in chat_copilot_service.process_message_stream(
        conversation=conv,
        user_message_text="Analyze the uploaded log file auth.log and summarize the findings.",
        db=db_session,
        context_file_id=sample_file.id
    ):
        chunks.append(chunk)
    text = extract_stream_text(chunks)

    # When explicitly requested, log analysis report MUST be returned
    assert "log analysis" in text.lower()
    assert "auth.log" in text.lower()
    assert "198.51.100.42" in text.lower()


@pytest.mark.asyncio
async def test_q14_malware_and_buffer_overflow_mandatory_answering(db_session: AsyncSession):
    """
    Verifies that other standard technical questions (malware types, buffer overflow)
    are answered authoritatively and mandatorily.
    """
    conv = await chat_copilot_service.get_or_create_conversation(conversation_id=None, db=db_session, title="Malware Q")
    chunks = []
    async for chunk in chat_copilot_service.process_message_stream(
        conversation=conv,
        user_message_text="What are the different types of malware and how do rootkits evade detection?",
        db=db_session
    ):
        chunks.append(chunk)
    text = extract_stream_text(chunks)
    assert "environment status: online" not in text.lower()
    assert "malware" in text.lower()
    assert "rootkit" in text.lower() or "trojan" in text.lower() or "ransomware" in text.lower()

