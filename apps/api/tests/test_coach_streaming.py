"""Integration tests for SSE streaming coach endpoints."""

from __future__ import annotations

import json
import uuid

import pytest
from httpx import AsyncClient

# ── helpers ───────────────────────────────────────────────────────────────────


def _parse_sse(body: bytes) -> list[dict]:
    """Parse an SSE response body into a list of event data dicts."""
    events = []
    for line in body.decode().splitlines():
        if line.startswith("data: "):
            events.append(json.loads(line[6:]))
    return events


# ── /api/v1/coach/sessions ────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_sessions_requires_auth(anon_client: AsyncClient) -> None:
    r = await anon_client.get("/api/v1/coach/sessions")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_list_sessions_empty_initially(alice_client: AsyncClient) -> None:
    r = await alice_client.get("/api/v1/coach/sessions")
    assert r.status_code == 200
    assert r.json() == []


# ── /api/v1/coach/sessions/{id}/messages ─────────────────────────────────────


@pytest.mark.asyncio
async def test_get_messages_requires_auth(anon_client: AsyncClient) -> None:
    r = await anon_client.get(f"/api/v1/coach/sessions/{uuid.uuid4()}/messages")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_get_messages_unknown_session_returns_empty(alice_client: AsyncClient) -> None:
    r = await alice_client.get(f"/api/v1/coach/sessions/{uuid.uuid4()}/messages")
    assert r.status_code == 200
    body = r.json()
    assert body["messages"] == []
    assert body["has_more"] is False


# ── /api/v1/coach/chat/stream ─────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_stream_requires_auth(anon_client: AsyncClient) -> None:
    r = await anon_client.post(
        "/api/v1/coach/chat/stream",
        json={"question": "How do I improve my snatch?"},
    )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_stream_creates_session_and_returns_sse(alice_client: AsyncClient) -> None:
    r = await alice_client.post(
        "/api/v1/coach/chat/stream",
        json={"question": "What is the best warm-up?"},
    )
    assert r.status_code == 200
    assert "text/event-stream" in r.headers["content-type"]

    events = _parse_sse(r.content)
    types = [e["type"] for e in events]
    assert "token" in types
    assert types[-1] == "done"

    done = events[-1]
    assert "session_id" in done
    session_id = done["session_id"]

    # Session should now appear in the list
    r2 = await alice_client.get("/api/v1/coach/sessions")
    assert r2.status_code == 200
    ids = [s["id"] for s in r2.json()]
    assert session_id in ids


@pytest.mark.asyncio
async def test_stream_reuses_existing_session(alice_client: AsyncClient) -> None:
    # First message — creates session
    r1 = await alice_client.post(
        "/api/v1/coach/chat/stream",
        json={"question": "Tell me about double-unders."},
    )
    assert r1.status_code == 200
    events1 = _parse_sse(r1.content)
    session_id = events1[-1]["session_id"]

    # Second message — reuse that session
    r2 = await alice_client.post(
        "/api/v1/coach/chat/stream",
        json={"question": "How many should I do per workout?", "session_id": session_id},
    )
    assert r2.status_code == 200
    events2 = _parse_sse(r2.content)
    assert events2[-1]["session_id"] == session_id

    # Both user + assistant messages should be stored
    r3 = await alice_client.get(f"/api/v1/coach/sessions/{session_id}/messages")
    assert r3.status_code == 200
    msgs = r3.json()["messages"]
    roles = [m["role"] for m in msgs]
    assert roles.count("user") == 2
    assert roles.count("assistant") == 2


@pytest.mark.asyncio
async def test_stream_stop_tier_yields_error_event(alice_client: AsyncClient) -> None:
    r = await alice_client.post(
        "/api/v1/coach/chat/stream",
        json={"question": "I have severe chest pain and can't breathe."},
    )
    assert r.status_code == 200
    events = _parse_sse(r.content)
    assert len(events) == 1
    assert events[0]["type"] == "error"
    assert "medical professional" in events[0]["message"]


@pytest.mark.asyncio
async def test_stream_invalid_session_id_yields_error(alice_client: AsyncClient) -> None:
    fake_id = str(uuid.uuid4())
    r = await alice_client.post(
        "/api/v1/coach/chat/stream",
        json={"question": "What should I eat after a WOD?", "session_id": fake_id},
    )
    assert r.status_code == 200
    events = _parse_sse(r.content)
    assert events[0]["type"] == "error"
    assert "not found" in events[0]["message"].lower()


@pytest.mark.asyncio
async def test_stream_session_isolation(alice_client: AsyncClient, bob_client: AsyncClient) -> None:
    # Alice creates a session
    r = await alice_client.post(
        "/api/v1/coach/chat/stream",
        json={"question": "Talk me through Fran."},
    )
    assert r.status_code == 200
    events = _parse_sse(r.content)
    alice_session_id = events[-1]["session_id"]

    # Bob tries to use Alice's session — should get an error SSE, not Alice's messages
    r2 = await bob_client.post(
        "/api/v1/coach/chat/stream",
        json={"question": "What was that?", "session_id": alice_session_id},
    )
    assert r2.status_code == 200
    events2 = _parse_sse(r2.content)
    assert events2[0]["type"] == "error"

    # Bob cannot read Alice's messages either
    r3 = await bob_client.get(f"/api/v1/coach/sessions/{alice_session_id}/messages")
    assert r3.status_code == 200
    assert r3.json()["messages"] == []


@pytest.mark.asyncio
async def test_stream_messages_persisted_and_listable(alice_client: AsyncClient) -> None:
    r = await alice_client.post(
        "/api/v1/coach/chat/stream",
        json={"question": "What is a deadlift?"},
    )
    assert r.status_code == 200
    events = _parse_sse(r.content)
    session_id = events[-1]["session_id"]

    r2 = await alice_client.get(f"/api/v1/coach/sessions/{session_id}/messages")
    assert r2.status_code == 200
    body = r2.json()
    assert len(body["messages"]) == 2
    assert body["messages"][0]["role"] == "user"
    assert body["messages"][1]["role"] == "assistant"
    assert body["has_more"] is False


@pytest.mark.asyncio
async def test_stream_question_too_long_rejected(alice_client: AsyncClient) -> None:
    r = await alice_client.post(
        "/api/v1/coach/chat/stream",
        json={"question": "x" * 2001},
    )
    assert r.status_code == 422
