import json
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.services.chat_tools import (
    tool_registry,
    AnalyzeSocBruteforceLabInput,
    GetDatasetOverviewInput
)
from backend.app.services.cyber_knowledge import cyber_knowledge_engine
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
async def test_zacariah_soc_bruteforce_tool(db_session: AsyncSession):
    """
    Verifies that analyze_soc_bruteforce_lab correctly parses the Kali auth.log,
    identifies 5 failed attempts from 192.168.1.10, flags password spraying across
    admin, root, test, and user accounts, and captures the accepted login for zacariah.
    """
    result = await tool_registry.analyze_soc_bruteforce_lab(
        AnalyzeSocBruteforceLabInput(file_path="data/soc_labs/zacariah_bruteforce/auth.log", threshold=3),
        db_session
    )

    assert result["status"] == "SUCCESS"
    assert result["total_lines_analyzed"] == 6
    assert result["failed_attempts"].get("192.168.1.10") == 5

    alerts = result["alerts"]
    assert len(alerts) == 1
    alert = alerts[0]
    assert alert["ip"] == "192.168.1.10"
    assert alert["failed_count"] == 5
    assert "admin" in alert["targeted_accounts"]
    assert "root" in alert["targeted_accounts"]
    assert "test" in alert["targeted_accounts"]
    assert "user" in alert["targeted_accounts"]
    assert alert["attack_type"] == "Password Spraying (Multi-Account)"

    accepted = result["accepted_logins"]
    assert len(accepted) == 1
    assert accepted[0]["user"] == "zacariah"
    assert accepted[0]["ip"] == "192.168.1.5"

    mitre_techs = [m["techniqueId"] for m in result["mitre_mappings"]]
    assert "T1110.001" in mitre_techs
    assert "T1110.003" in mitre_techs
    assert "T1078" in mitre_techs


@pytest.mark.asyncio
async def test_zacariah_soc_bruteforce_dataset_overview(db_session: AsyncSession):
    """
    Verifies that get_dataset_overview returns structured metadata for the Zacariah SOC Lab.
    """
    res = await tool_registry.get_dataset_overview(
        GetDatasetOverviewInput(dataset_name="soc_lab_bruteforce"),
        db_session
    )
    assert res["status"] == "SUCCESS"
    assert "ZacariahCyberSec" in res["source"]
    assert "SSH Brute Force" in res["attackClasses"]


@pytest.mark.asyncio
async def test_zacariah_cyber_knowledge_catalog():
    """
    Verifies that CyberKnowledgeEngine contains the grounded item for the SOC Brute Force Lab.
    """
    item = cyber_knowledge_engine.find_best_match("zacariah log-analysis-brute-force-detection")
    assert item is not None
    assert "Linux Authentication Log Analysis" in item.title
    assert "auth.log" in item.summary or "auth.log" in item.mechanics
    assert "T1110.001" in item.mitre_ids


@pytest.mark.asyncio
async def test_zacariah_chat_intent_and_streaming(db_session: AsyncSession):
    """
    Verifies that when asked about ZacariahCyberSec/log-analysis-brute-force-detection,
    the Chat Copilot delivers an in-depth forensic breakdown of the Kali auth.log,
    script evaluation, MITRE mappings, and SOAR response.
    """
    conv = await chat_copilot_service.get_or_create_conversation(conversation_id=None, db=db_session, title="Zacariah Lab Test")
    chunks = []
    async for chunk in chat_copilot_service.process_message_stream(
        conversation=conv,
        user_message_text="Analyze the ZacariahCyberSec/log-analysis-brute-force-detection lab and auth.log",
        db=db_session
    ):
        chunks.append(chunk)

    response = extract_stream_text(chunks)
    assert "192.168.1.10" in response
    assert "192.168.1.5" in response
    assert "PB-SSH-BRUTE-01" in response
    assert "T1110" in response
    assert "Tinashe Zacariah Nyandoro" in response
    assert "Password Spraying" in response


@pytest.mark.asyncio
async def test_concept_question_does_not_output_log_analysis(db_session: AsyncSession):
    """
    Verifies that conceptual cybersecurity questions like 'What is a phishing attack?'
    receive direct conceptual answers and NEVER dump log analysis.
    """
    conv = await chat_copilot_service.get_or_create_conversation(conversation_id=None, db=db_session, title="Phishing Concept Test")
    chunks = []
    async for chunk in chat_copilot_service.process_message_stream(
        conversation=conv,
        user_message_text="What is a phishing attack and how does it work?",
        db=db_session
    ):
        chunks.append(chunk)

    response = extract_stream_text(chunks)
    assert "### Log Analysis:" not in response
    assert "phishing" in response.lower()
    assert ("social engineering" in response.lower() or "credential" in response.lower() or "email" in response.lower() or "fraudulent" in response.lower())
