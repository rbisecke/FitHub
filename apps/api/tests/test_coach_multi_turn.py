"""Tests for multi-turn chat history — Branch 1 of Phase 5b."""

from __future__ import annotations

import uuid

import psycopg
import pytest
from httpx import AsyncClient

from app.ai.chat_history import rag_query_text
from tests.conftest import ALICE_ID, BOB_ID, TEST_DB_DSN

SESSION_A = str(uuid.uuid4())
SESSION_B = str(uuid.uuid4())


# ── Helper ─────────────────────────────────────────────────────────────────────


async def _seed_turns(
    conn: psycopg.AsyncConnection[object],
    user_id: uuid.UUID,
    session_id: str,
    n_turns: int,
) -> None:
    """Insert n_turns pairs (user + assistant) into coach_sessions + coach_messages."""
    # Ensure the session row exists before inserting messages (FK requirement).
    await conn.execute(
        """
        INSERT INTO public.coach_sessions (id, user_id, title)
        VALUES (%s::uuid, %s, 'Test session')
        ON CONFLICT (id) DO NOTHING
        """,
        [session_id, str(user_id)],
    )
    for i in range(n_turns):
        await conn.execute(
            "INSERT INTO public.coach_messages (session_id, role, content, stub)"
            " VALUES (%s::uuid, 'user', %s, true)",
            [session_id, f"question {i}"],
        )
        await conn.execute(
            "INSERT INTO public.coach_messages (session_id, role, content, stub)"
            " VALUES (%s::uuid, 'assistant', %s, true)",
            [session_id, f"answer {i}"],
        )


# ── DB write tests ─────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_session_history_stored_and_fetched(alice_client: AsyncClient) -> None:
    """Two chat turns with the same session_id produce 4 rows in coach_messages."""
    sid = str(uuid.uuid4())

    r1 = await alice_client.post(
        "/api/v1/coach/chat",
        json={"question": "What is ACWR?", "session_id": sid},
    )
    assert r1.status_code == 200

    r2 = await alice_client.post(
        "/api/v1/coach/chat",
        json={"question": "How do I lower it?", "session_id": sid},
    )
    assert r2.status_code == 200

    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn:
        cur = await conn.execute(
            """
            SELECT COUNT(*) FROM public.coach_messages cm
            JOIN public.coach_sessions cs ON cs.id = cm.session_id
            WHERE cm.session_id = %s::uuid AND cs.user_id = %s
            """,
            [sid, str(ALICE_ID)],
        )
        row = await cur.fetchone()

    assert row is not None
    assert row[0] == 4

    r3 = await alice_client.get(f"/api/v1/coach/history?session_id={sid}")
    assert r3.status_code == 200
    turns = r3.json()
    assert len(turns) == 4
    assert turns[0]["role"] == "user"
    assert turns[0]["content"] == "What is ACWR?"
    assert turns[1]["role"] == "assistant"


@pytest.mark.asyncio
async def test_different_sessions_do_not_share_history(alice_client: AsyncClient) -> None:
    """Messages posted to session A do not appear in session B's history."""
    sid_a = str(uuid.uuid4())
    sid_b = str(uuid.uuid4())

    await alice_client.post(
        "/api/v1/coach/chat",
        json={"question": "Session A question", "session_id": sid_a},
    )

    r = await alice_client.get(f"/api/v1/coach/history?session_id={sid_b}")
    assert r.status_code == 200
    assert r.json() == []


@pytest.mark.asyncio
async def test_no_session_id_creates_new_session(alice_client: AsyncClient) -> None:
    """POST /chat with no session_id auto-creates a session and writes to coach_messages."""
    r = await alice_client.post(
        "/api/v1/coach/chat",
        json={"question": "How do I improve my clean?"},
    )
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data["answer"], str)

    # Verify nothing was written to the legacy coach_interactions table.
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn:
        cur = await conn.execute(
            "SELECT COUNT(*) FROM coach_interactions WHERE user_id = %s",
            [str(ALICE_ID)],
        )
        row = await cur.fetchone()
    assert row is not None
    assert row[0] == 0

    # A session was auto-created and messages landed in coach_messages.
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn:
        cur = await conn.execute(
            "SELECT COUNT(*) FROM public.coach_sessions WHERE user_id = %s",
            [str(ALICE_ID)],
        )
        row = await cur.fetchone()
    assert row is not None
    assert row[0] == 1


@pytest.mark.asyncio
async def test_history_cap_at_10_turns(alice_client: AsyncClient) -> None:
    """Seeding 15 turns; fetch_session_history returns at most 20 rows (10 pairs)."""
    sid = str(uuid.uuid4())
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn:
        await _seed_turns(conn, ALICE_ID, sid, 15)

    from app.ai.chat_history import MAX_HISTORY_TURNS, fetch_session_history

    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN) as conn:
        history = await fetch_session_history(sid, conn)

    assert len(history) <= MAX_HISTORY_TURNS * 2


@pytest.mark.asyncio
async def test_stop_tier_does_not_fetch_history(alice_client: AsyncClient) -> None:
    """STOP-tier question returns safety_tier='stop' without fetching session history."""
    sid = str(uuid.uuid4())

    # Seed a prior turn so history would exist if fetched
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn:
        await _seed_turns(conn, ALICE_ID, sid, 1)

    r = await alice_client.post(
        "/api/v1/coach/chat",
        json={"question": "I have chest pain during pull-ups", "session_id": sid},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["safety_tier"] == "stop"
    assert data["stub"] is False


@pytest.mark.asyncio
async def test_stop_tier_persists_assistant_reply_on_non_streaming_chat(
    alice_client: AsyncClient,
) -> None:
    """Reopening a STOP-tier /chat exchange must show a real reply, not silence.

    Mirrors the streaming path's fix: /chat's STOP branch previously persisted
    only the user's message and returned the escalation copy in the HTTP
    response body without ever writing an assistant turn — so resuming the
    session showed the emergency message with no reply at all.
    """
    r = await alice_client.post(
        "/api/v1/coach/chat",
        json={"question": "I have severe chest pain and can't breathe."},
    )
    assert r.status_code == 200
    live_answer = r.json()["answer"]
    session_id = None
    # /chat's ChatResponse doesn't carry the session_id it created, so look it
    # up via list_sessions (there's exactly one, just created).
    sessions_resp = await alice_client.get("/api/v1/coach/sessions")
    assert sessions_resp.status_code == 200
    sessions = sessions_resp.json()
    assert len(sessions) == 1
    session_id = sessions[0]["id"]

    messages_resp = await alice_client.get(f"/api/v1/coach/sessions/{session_id}/messages")
    assert messages_resp.status_code == 200
    messages = messages_resp.json()["messages"]
    assert len(messages) == 2
    assert messages[0]["role"] == "user"
    assert messages[1]["role"] == "assistant"
    assert messages[1]["content"] == live_answer
    assert messages[1]["safety_tier"] == "stop"


# ── Unit tests ─────────────────────────────────────────────────────────────────


def test_rag_fallback_for_short_questions() -> None:
    """rag_query_text falls back to last substantive user turn for short queries."""
    history = [
        {"role": "user", "content": "What is acute-to-chronic workload ratio?"},
        {"role": "assistant", "content": "ACWR is a training load metric..."},
    ]
    assert rag_query_text("why?", history) == "What is acute-to-chronic workload ratio?"


def test_rag_uses_current_question_when_long_enough() -> None:
    """rag_query_text uses the current question when it has 5+ words."""
    history = [
        {"role": "user", "content": "Tell me about ACWR"},
        {"role": "assistant", "content": "ACWR is..."},
    ]
    q = "How do I improve my clean and jerk technique?"
    assert rag_query_text(q, history) == q


def test_rag_returns_question_when_no_substantive_history() -> None:
    """rag_query_text returns the current question when history has no long turns."""
    history = [{"role": "user", "content": "ok"}, {"role": "assistant", "content": "noted"}]
    assert rag_query_text("why?", history) == "why?"


# ── Endpoint access-control tests ─────────────────────────────────────────────


@pytest.mark.asyncio
async def test_history_endpoint_returns_ordered_turns(alice_client: AsyncClient) -> None:
    """GET /coach/history returns turns in ASC order, scoped to the caller."""
    sid = str(uuid.uuid4())
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn:
        await _seed_turns(conn, ALICE_ID, sid, 3)

    r = await alice_client.get(f"/api/v1/coach/history?session_id={sid}")
    assert r.status_code == 200
    turns = r.json()
    assert len(turns) == 6
    roles = [t["role"] for t in turns]
    assert roles == ["user", "assistant"] * 3


@pytest.mark.asyncio
async def test_history_endpoint_idor(alice_client: AsyncClient, bob_client: AsyncClient) -> None:
    """Alice cannot see Bob's session history — returns 200 with empty list (no IDOR leak)."""
    sid = str(uuid.uuid4())
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn:
        await _seed_turns(conn, BOB_ID, sid, 2)

    r = await alice_client.get(f"/api/v1/coach/history?session_id={sid}")
    assert r.status_code == 200
    assert r.json() == []


@pytest.mark.asyncio
async def test_history_endpoint_requires_auth(anon_client: AsyncClient) -> None:
    """GET /coach/history returns 401 without auth."""
    r = await anon_client.get(f"/api/v1/coach/history?session_id={uuid.uuid4()}")
    assert r.status_code == 401
