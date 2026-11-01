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
