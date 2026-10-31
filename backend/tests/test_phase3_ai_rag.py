import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient, Response

from backend.app.models.event import SecurityEventModel
from backend.app.models.incident import IncidentModel
from backend.app.services.threat_intel import (
    knowledge_retriever,
    threat_intel_service,
    SecurityKnowledgeRetriever,
    MITRE_ATTACK_KNOWLEDGE
)
from backend.app.services.analyst import (
    AIInvestigatorService,
    LocalDeterministicProvider,
    GeminiProvider
)


def test_rag_knowledge_retriever_mitre_and_playbooks():
    """Verify RAG retriever queries MITRE ATT&CK, Sigma rules, and defensive playbooks."""
    # Query for SSH brute force
    results_ssh = knowledge_retriever.retrieve("SSH brute force attack vector")
    assert len(results_ssh) > 0
    technique_ids = [r["id"] for r in results_ssh]
    assert any("T1110" in tid for tid in technique_ids or [])

    # Query by explicit technique IDs
    results_by_id = knowledge_retriever.retrieve("investigation", technique_ids=["T1110.003"])
    assert any(r["id"] == "T1110.003" for r in results_by_id)

    # Query for playbooks
    results_spray = knowledge_retriever.retrieve("password spray campaign defense")
    assert any(r.get("source") in ["defensive_playbook", "mitre_attack"] for r in results_spray)


@pytest.mark.asyncio
async def test_threat_intel_indicator_registration_and_ttl(db_session):
    """Verify threat intelligence indicator lifecycle, confidence tracking, and TTL expiration."""
    # 1. Register active indicator
    rec = await threat_intel_service.register_indicator(
        db=db_session,
        ip="198.51.100.177",
        threat_classification="Known SSH Brute-Force Botnet",
        reputation_score=85,
        confidence=90,
        tags=["botnet", "c2-proxy"],
        mitre_techniques=["T1110.001"]
    )
    assert rec.ip == "198.51.100.177"
    assert rec.reputation_score == 85

    # 2. Lookup active indicator
    found = await threat_intel_service.lookup_ip("198.51.100.177", db_session)
    assert found is not None
    assert found.ip == "198.51.100.177"
    assert "botnet" in found.tags

    # 3. Simulate expired indicator (older than 7 days)
    found.last_seen = datetime.now(timezone.utc) - timedelta(days=10)
    await db_session.commit()

    expired_lookup = await threat_intel_service.lookup_ip("198.51.100.177", db_session)
    assert expired_lookup is None


@pytest.mark.asyncio
async def test_ai_analyst_rag_grounding_and_token_metrics(db_session):
    """Verify AI analyst integrates RAG knowledge, computes token metrics, and validates grounding."""
    # Seed events
    evt1 = SecurityEventModel(
        id="EVT-2026-RAG-001",
        timestamp=datetime.now(timezone.utc),
        source="linux_ssh",
        event_type="authentication_failed",
        severity="medium",
        source_ip="198.51.100.77",
        destination_ip="10.240.10.15",
        destination_port=22,
        username="admin",
        outcome="failure",
        raw_event="Failed password for admin from 198.51.100.77",
        fingerprint="fp001",
        is_simulated=True
    )
    evt2 = SecurityEventModel(
        id="EVT-2026-RAG-002",
        timestamp=datetime.now(timezone.utc),
        source="linux_ssh",
        event_type="authentication_failed",
        severity="medium",
        source_ip="198.51.100.77",
        destination_ip="10.240.10.15",
        destination_port=22,
        username="root",
        outcome="failure",
        raw_event="Failed password for root from 198.51.100.77",
        fingerprint="fp002",
        is_simulated=True
    )
    db_session.add_all([evt1, evt2])
    await db_session.commit()

    service = AIInvestigatorService()
    res = await service.query("Analyze SSH brute force activity and advise remediation", incident_id=None, db=db_session)

    assert res.provider == "local_deterministic"
    assert res.promptTokens is not None and res.promptTokens > 0
    assert res.completionTokens is not None and res.completionTokens > 0
    assert res.totalTokens == res.promptTokens + res.completionTokens
    assert res.retrievedKnowledgeCount > 0
    # Grounding check: referenced event IDs must be subset of available event IDs
    for eid in res.referencedEventIds:
        assert eid in ["EVT-2026-RAG-001", "EVT-2026-RAG-002"]


@pytest.mark.asyncio
async def test_ai_analyst_hallucination_stripping_and_grounding():
    """Verify that hallucinated event IDs returned by an LLM provider are stripped before returning."""
    provider = GeminiProvider(api_key="mock_key", model_name="gemini-2.5-flash")

    # Real event
    real_evt = SecurityEventModel(
        id="EVT-REAL-001",
        timestamp=datetime.now(timezone.utc),
        source="linux_ssh",
        event_type="authentication_failed",
        severity="medium",
        source_ip="198.51.100.99",
        username="deploy",
        outcome="failure",
        raw_event="Failed password for deploy",
        fingerprint="fp_real",
        is_simulated=True
    )

    mock_gemini_response = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "text": (
                                '{"reply": "Analyzed attack sequence.", '
                                '"referencedEventIds": ["EVT-REAL-001", "EVT-HALLUCINATED-999"], '
                                '"mitreTechniques": ["T1110.001"], '
                                '"recommendedPlaybookId": "PB-SSH-BRUTE-01", '
                                '"confidence": 0.95}'
                            )
                        }
                    ]
                }
            }
        ],
        "usageMetadata": {
            "promptTokenCount": 240,
            "candidatesTokenCount": 115,
            "totalTokenCount": 355
        }
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_resp = AsyncMock(spec=Response)
        mock_resp.status_code = 200
        mock_resp.json.return_value = mock_gemini_response
        mock_post.return_value = mock_resp

        res = await provider.investigate(
            prompt="Analyze intrusion",
            events=[real_evt],
            incident=None,
            retrieved_knowledge=[]
        )

        assert "EVT-REAL-001" in res.referencedEventIds
        # Hallucinated ID MUST be stripped
        assert "EVT-HALLUCINATED-999" not in res.referencedEventIds
        assert res.promptTokens == 240
        assert res.completionTokens == 115
        assert res.totalTokens == 355
        assert res.provider == "gemini:gemini-2.5-flash"


@pytest.mark.asyncio
async def test_ai_analyst_graceful_provider_degradation(db_session):
    """Verify that external LLM failure gracefully degrades to local deterministic engine."""
    service = AIInvestigatorService()
    # Inject a dummy provider that raises RuntimeError
    failing_provider = GeminiProvider(api_key="mock_key")
    service._gemini_provider = failing_provider

    with patch.object(failing_provider, "investigate", side_effect=RuntimeError("External LLM connection timed out")):
        res = await service.query("Analyze SSH logon failures", incident_id=None, db=db_session)
        # Succeeded via fallback
        assert res is not None
        assert res.provider == "local_deterministic"
        assert len(res.reply) > 50
