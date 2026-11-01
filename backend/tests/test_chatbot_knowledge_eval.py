import pytest
import asyncio
import time
import json
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.services.chat import chat_copilot_service
from backend.app.services.chat_tools import (
    tool_registry,
    AnalyzeNetworkTrafficDatasetInput,
    AnalyzePhishingDatasetInput,
    AnalyzeLanlCyberEventsInput,
    AnalyzeSystemLogDatasetInput,
    GetDatasetOverviewInput
)


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
                        except:
                            pass
    return "".join(tokens)


@pytest.mark.asyncio
async def test_category_1_general_cybersecurity_knowledge(db_session: AsyncSession):
    conv = await chat_copilot_service.get_or_create_conversation(conversation_id=None, db=db_session, title="Eval: General Knowledge")
    chunks = []
    t0 = time.time()
    async for event_line in chat_copilot_service.process_message_stream(
        conversation=conv,
        user_message_text="What is a brute-force attack?",
        db=db_session
    ):
        chunks.append(event_line)
    latency = time.time() - t0

    full_output = extract_stream_text(chunks)
    assert "automated attempt to guess credentials" in full_output or "brute-force" in full_output.lower()
    assert "Example" in full_output
    assert latency < 3.0


@pytest.mark.asyncio
async def test_category_2_network_security_syn_flood(db_session: AsyncSession):
    conv = await chat_copilot_service.get_or_create_conversation(conversation_id=None, db=db_session, title="Eval: SYN Flood")
    chunks = []
    async for event_line in chat_copilot_service.process_message_stream(
        conversation=conv,
        user_message_text="How does a SYN flood attack work?",
        db=db_session
    ):
        chunks.append(event_line)

    full_output = extract_stream_text(chunks)
    assert "three-way handshake" in full_output
    assert "SYN" in full_output
    assert "SYN Cookies" in full_output


@pytest.mark.asyncio
async def test_category_3_intrusion_detection_ids_vs_ips(db_session: AsyncSession):
    conv = await chat_copilot_service.get_or_create_conversation(conversation_id=None, db=db_session, title="Eval: IDS vs IPS")
    chunks = []
    async for event_line in chat_copilot_service.process_message_stream(
        conversation=conv,
        user_message_text="Explain the difference between IDS and IPS",
        db=db_session
    ):
        chunks.append(event_line)

    full_output = extract_stream_text(chunks)
    assert "Passive" in full_output or "passive" in full_output
    assert "Inline" in full_output or "inline" in full_output
    assert "Intrusion Detection System" in full_output


@pytest.mark.asyncio
async def test_category_4_packet_analysis(db_session: AsyncSession):
    conv = await chat_copilot_service.get_or_create_conversation(conversation_id=None, db=db_session, title="Eval: Packet Analysis")
    chunks = []
    async for event_line in chat_copilot_service.process_message_stream(
        conversation=conv,
        user_message_text="What is the purpose of network packet analysis?",
        db=db_session
    ):
        chunks.append(event_line)

    full_output = extract_stream_text(chunks)
    assert "packet analysis" in full_output.lower() or "threat detection" in full_output.lower()
    assert "Forensic Reconstruction" in full_output or "reconstruct" in full_output.lower()


@pytest.mark.asyncio
async def test_category_5_dataset_understanding_overview(db_session: AsyncSession):
    conv = await chat_copilot_service.get_or_create_conversation(conversation_id=None, db=db_session, title="Eval: Dataset Structure")
    chunks = []
    async for event_line in chat_copilot_service.process_message_stream(
        conversation=conv,
        user_message_text="Analyze this dataset and explain its structure",
        db=db_session
    ):
        chunks.append(event_line)

    full_output = extract_stream_text(chunks)
    assert "Dataset Overview" in full_output
    assert "CIC-IDS2017" in full_output
    assert "Features" in full_output or "Attack" in full_output


@pytest.mark.asyncio
async def test_category_6_attack_classification_cic_ids(db_session: AsyncSession):
    # Direct tool test
    res = await tool_registry.analyze_network_traffic_dataset(AnalyzeNetworkTrafficDatasetInput(), db_session)
    assert res["status"] == "SUCCESS"
    assert res["totalFlowsEvaluated"] == 10
    assert res["benignFlows"] == 3
    assert res["maliciousFlows"] == 7
    assert "DoS Slowloris" in res["attackBreakdown"]
    assert "DDoS" in res["attackBreakdown"]
    assert "PortScan" in res["attackBreakdown"]

    # Conversational flow test
    conv = await chat_copilot_service.get_or_create_conversation(conversation_id=None, db=db_session, title="Eval: Network Attacks")
    chunks = []
    async for event_line in chat_copilot_service.process_message_stream(
        conversation=conv,
        user_message_text="Analyze these network records and identify attack categories",
        db=db_session
    ):
        chunks.append(event_line)

    full_output = extract_stream_text(chunks)
    assert "CIC-IDS2017" in full_output
    assert "DoS Slowloris" in full_output or "DDoS" in full_output


@pytest.mark.asyncio
async def test_category_7_threat_intelligence_phishing(db_session: AsyncSession):
    # Direct tool test
    res = await tool_registry.analyze_phishing_dataset(AnalyzePhishingDatasetInput(), db_session)
    assert res["status"] == "SUCCESS"
    assert res["totalEmailsAnalyzed"] == 8
    assert res["phishingEmails"] == 4
    assert res["legitimateEmails"] == 4
    assert res["spfFailures"] == 4
    assert "PayPal" in res["targetedBrands"]

    # Conversational flow test
    conv = await chat_copilot_service.get_or_create_conversation(conversation_id=None, db=db_session, title="Eval: Phishing")
    chunks = []
    async for event_line in chat_copilot_service.process_message_stream(
        conversation=conv,
        user_message_text="Analyze phishing emails and check authentication failures",
        db=db_session
    ):
        chunks.append(event_line)

    full_output = extract_stream_text(chunks)
    assert "Phishing" in full_output
    assert "SPF failures" in full_output


@pytest.mark.asyncio
async def test_category_8_incident_investigation_lanl(db_session: AsyncSession):
    # Direct tool test
    res = await tool_registry.analyze_lanl_cyber_events(AnalyzeLanlCyberEventsInput(), db_session)
    assert res["status"] == "SUCCESS"
    assert res["authEventsAnalyzed"] == 10
    assert res["redTeamCompromiseEvents"] == 3
    assert "U748@DOM1" in res["compromisedUsers"]
    assert "C17693" in res["compromisedJumpHosts"]

    # Conversational flow test
    conv = await chat_copilot_service.get_or_create_conversation(conversation_id=None, db=db_session, title="Eval: LANL Lateral")
    chunks = []
    async for event_line in chat_copilot_service.process_message_stream(
        conversation=conv,
        user_message_text="Analyze LANL events and investigate lateral movement",
        db=db_session
    ):
        chunks.append(event_line)

    full_output = extract_stream_text(chunks)
    assert "LANL" in full_output
    assert "C17693" in full_output
    assert "U748@DOM1" in full_output


@pytest.mark.asyncio
async def test_category_9_follow_up_second_suspicious_event(db_session: AsyncSession):
    conv = await chat_copilot_service.get_or_create_conversation(conversation_id=None, db=db_session, title="Eval: Follow-up")
    chunks = []
    async for event_line in chat_copilot_service.process_message_stream(
        conversation=conv,
        user_message_text="Explain the second suspicious event",
        db=db_session
    ):
        chunks.append(event_line)

    full_output = extract_stream_text(chunks)
    assert "Second Suspicious Event" in full_output
    assert "DoS Slowloris" in full_output
    assert "80" in full_output
    assert "T1498.001" in full_output


@pytest.mark.asyncio
async def test_category_10_insufficient_evidence_attribution(db_session: AsyncSession):
    conv = await chat_copilot_service.get_or_create_conversation(conversation_id=None, db=db_session, title="Eval: Insufficient Evidence")
    chunks = []
    async for event_line in chat_copilot_service.process_message_stream(
        conversation=conv,
        user_message_text="What additional information would you need to confirm this attack and who is the threat actor?",
        db=db_session
    ):
        chunks.append(event_line)

    full_output = extract_stream_text(chunks)
    assert "Insufficient Evidence" in full_output
    assert "Threat Intelligence Correlation" in full_output
    assert "unconfirmed" in full_output.lower()
