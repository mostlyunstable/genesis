import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.services.vector_rag import vector_rag, VectorKnowledgeRetriever
from backend.app.services.threat_intel import knowledge_retriever
from backend.app.services.chat_tools import tool_registry, SearchVectorKnowledgeInput


def test_vector_index_initialization():
    """Verifies that dense vector RAG correctly indexes knowledge base corpus."""
    assert vector_rag.total_docs >= 15
    assert len(vector_rag.doc_vectors) == vector_rag.total_docs
    assert len(vector_rag.doc_norms) == vector_rag.total_docs
    assert all(norm > 0.0 for norm in vector_rag.doc_norms)


def test_semantic_vector_retrieval_without_exact_literal_match():
    """
    Verifies that dense character n-gram subword vector search captures conceptual
    similarity even when the exact phrasing is novel.
    """
    # Query describing Kerberoasting without literal phrase 'T1558.003'
    query_kerb = "adversaries requesting service tickets to crack passwords offline"
    results = vector_rag.search(query_kerb, top_k=3)

    assert len(results) > 0
    top_ids = [r["id"] for r in results]
    assert "T1558.003" in top_ids or "T1558.004" in top_ids
    # Verify similarity scores are between 0 and 1, sorted descending
    assert 0.0 < results[0]["similarity_score"] <= 1.0
    for i in range(len(results) - 1):
        assert results[i]["similarity_score"] >= results[i + 1]["similarity_score"]


def test_vector_rag_source_filtering():
    """Verifies that source filters (e.g. defensive_playbook only) operate deterministically."""
    results = vector_rag.search("isolate host and revoke tokens", top_k=3, source_filter="defensive_playbook")
    assert len(results) > 0
    assert all(r["source"] == "defensive_playbook" for r in results)
    assert any("PB-" in r["id"] for r in results)


@pytest.mark.asyncio
async def test_copilot_search_vector_knowledge_tool(db_session: AsyncSession):
    """Verifies the Copilot tool registry integration for dense semantic RAG search."""
    params = SearchVectorKnowledgeInput(
        query="lateral movement remote ssh pivot",
        top_k=3
    )
    res = await tool_registry.search_vector_knowledge(params, db_session)

    assert res["status"] == "SUCCESS"
    assert res["total_matches"] > 0
    assert len(res["evidence"]) == len(res["matches"])
    assert any("SSH" in m["title"] or "T1021" in m["id"] for m in res["matches"])


def test_knowledge_retriever_hybrid_integration():
    """Verifies that SecurityKnowledgeRetriever seamlessly incorporates dense vector matches."""
    res = knowledge_retriever.retrieve("adversary spraying multiple accounts to avoid lockouts", max_results=3)
    assert len(res) > 0
    # Should identify T1110.003 Password Spraying
    assert any("T1110.003" in r.get("id", "") or "Password Spraying" in r.get("title", "") for r in res)
