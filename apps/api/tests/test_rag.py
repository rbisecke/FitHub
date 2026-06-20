"""Tests for RAG retrieval and /api/v1/coach/chat endpoint."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_hybrid_retrieve_returns_results() -> None:
    import psycopg

    from app.ai.rag import hybrid_retrieve
    from tests.conftest import TEST_DB_DSN

    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN) as db:
        results = await hybrid_retrieve("what is ACWR?", db, top_k=5)

    assert isinstance(results, list)
    for r in results:
        assert "title" in r and "body" in r and "score" in r


@pytest.mark.asyncio
async def test_hybrid_retrieve_score_ordering() -> None:
    import psycopg

    from app.ai.rag import hybrid_retrieve
    from tests.conftest import TEST_DB_DSN

    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN) as db:
        results = await hybrid_retrieve("pull-up", db, top_k=10)

    if len(results) >= 2:
        scores = [r["score"] for r in results]
        assert scores == sorted(scores, reverse=True), "results must be sorted by score DESC"


@pytest.mark.asyncio
async def test_chat_stub_returns_answer(alice_client: AsyncClient) -> None:
    r = await alice_client.post(
        "/api/v1/coach/chat",
        json={"question": "What is ACWR?", "session_id": None},
    )
    assert r.status_code == 200
    data = r.json()
    assert "answer" in data and isinstance(data["answer"], str)
    assert len(data["answer"]) > 0
    assert "citations" in data and isinstance(data["citations"], list)
    assert data["stub"] is True


@pytest.mark.asyncio
async def test_chat_requires_auth(anon_client: AsyncClient) -> None:
    r = await anon_client.post(
        "/api/v1/coach/chat",
        json={"question": "What is ACWR?"},
    )
    assert r.status_code == 401
