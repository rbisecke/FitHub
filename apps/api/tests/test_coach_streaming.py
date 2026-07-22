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


@pytest.mark.asyncio
async def test_stream_done_frame_includes_citations_and_safety_tier(
    alice_client: AsyncClient,
) -> None:
    r = await alice_client.post(
        "/api/v1/coach/chat/stream",
        json={"question": "What is the best warm-up?"},
    )
    assert r.status_code == 200
    events = _parse_sse(r.content)
    done = events[-1]
    assert done["type"] == "done"
    assert isinstance(done["citations"], list)
    assert done["safety_tier"] in ("coach", "modify")


@pytest.mark.asyncio
async def test_stream_stop_tier_error_frame_carries_session_id(
    alice_client: AsyncClient,
) -> None:
    r = await alice_client.post(
        "/api/v1/coach/chat/stream",
        json={"question": "I have severe chest pain and can't breathe."},
    )
    assert r.status_code == 200
    events = _parse_sse(r.content)
    assert len(events) == 1
    session_id = events[0]["session_id"]
    assert session_id

    # The escalation's session must be a real, listable session (fresh-thread
    # STOP still needs to show up in the session list per FR §4).
    r2 = await alice_client.get("/api/v1/coach/sessions")
    ids = [s["id"] for s in r2.json()]
    assert session_id in ids


@pytest.mark.asyncio
async def test_stream_stop_tier_error_frame_has_stop_subtype(alice_client: AsyncClient) -> None:
    r = await alice_client.post(
        "/api/v1/coach/chat/stream",
        json={"question": "I have severe chest pain and can't breathe."},
    )
    assert r.status_code == 200
    events = _parse_sse(r.content)
    assert len(events) == 1
    assert events[0]["type"] == "error"
    assert events[0]["subtype"] == "stop"


@pytest.mark.asyncio
async def test_stream_invalid_session_id_error_frame_has_technical_subtype(
    alice_client: AsyncClient,
) -> None:
    fake_id = str(uuid.uuid4())
    r = await alice_client.post(
        "/api/v1/coach/chat/stream",
        json={"question": "What should I eat after a WOD?", "session_id": fake_id},
    )
    assert r.status_code == 200
    events = _parse_sse(r.content)
    assert events[0]["type"] == "error"
    assert events[0]["subtype"] == "technical"
    assert events[0]["subtype"] != "stop"


@pytest.mark.asyncio
async def test_get_messages_returns_most_recent_window_not_oldest(
    alice_client: AsyncClient,
) -> None:
    # Three exchanges = 6 messages. A limit smaller than the full history
    # must return the MOST RECENT window (oldest-first within that window),
    # not the oldest messages in the session — a resumed thread should show
    # where the athlete left off, not the start of a long conversation.
    session_id: str | None = None
    questions = ["first question", "second question", "third question"]
    for q in questions:
        payload: dict[str, str] = {"question": q}
        if session_id is not None:
            payload["session_id"] = session_id
        r = await alice_client.post("/api/v1/coach/chat/stream", json=payload)
        session_id = _parse_sse(r.content)[-1]["session_id"]
    assert session_id is not None

    r2 = await alice_client.get(
        f"/api/v1/coach/sessions/{session_id}/messages", params={"limit": 4}
    )
    assert r2.status_code == 200
    body = r2.json()
    assert body["has_more"] is True
    assert len(body["messages"]) == 4

    # The window is the last 4 of 6 messages: the full Q2/A2 and Q3/A3 pairs
    # — in ascending (oldest-first) order — not Q1/A1/Q2/A2 (the oldest 4).
    contents = [m["content"] for m in body["messages"]]
    assert contents[0] == "second question"
    assert contents[2] == "third question"
    roles = [m["role"] for m in body["messages"]]
    assert roles == ["user", "assistant", "user", "assistant"]


@pytest.mark.asyncio
async def test_stream_done_frame_includes_stub_flag(alice_client: AsyncClient) -> None:
    r = await alice_client.post(
        "/api/v1/coach/chat/stream",
        json={"question": "What is the best warm-up?"},
    )
    assert r.status_code == 200
    events = _parse_sse(r.content)
    done = events[-1]
    assert done["type"] == "done"
    assert "stub" in done
    assert isinstance(done["stub"], bool)


# ── session list ordering (updated_at, not created_at) ───────────────────────


@pytest.mark.asyncio
async def test_list_sessions_orders_by_updated_at_not_created_at(
    alice_client: AsyncClient,
) -> None:
    # Create session A, then B — A is older by created_at.
    r_a = await alice_client.post(
        "/api/v1/coach/chat/stream",
        json={"question": "Tell me about the clean and jerk."},
    )
    session_a = _parse_sse(r_a.content)[-1]["session_id"]

    r_b = await alice_client.post(
        "/api/v1/coach/chat/stream",
        json={"question": "Tell me about the snatch."},
    )
    session_b = _parse_sse(r_b.content)[-1]["session_id"]

    # Bump A's updated_at by sending a second message into it.
    await alice_client.post(
        "/api/v1/coach/chat/stream",
        json={"question": "How do I fix my catch position?", "session_id": session_a},
    )

    r = await alice_client.get("/api/v1/coach/sessions")
    assert r.status_code == 200
    ids = [s["id"] for s in r.json()]
    # A was created first but touched most recently — it must lead the list.
    assert ids.index(session_a) < ids.index(session_b)


# ── DELETE /sessions/{id} ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_delete_session_requires_auth(anon_client: AsyncClient) -> None:
    r = await anon_client.delete(f"/api/v1/coach/sessions/{uuid.uuid4()}")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_delete_session_unknown_returns_404(alice_client: AsyncClient) -> None:
    r = await alice_client.delete(f"/api/v1/coach/sessions/{uuid.uuid4()}")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_delete_session_other_users_session_returns_404(
    alice_client: AsyncClient, bob_client: AsyncClient
) -> None:
    r = await alice_client.post(
        "/api/v1/coach/chat/stream",
        json={"question": "Talk me through Grace."},
    )
    session_id = _parse_sse(r.content)[-1]["session_id"]

    r2 = await bob_client.delete(f"/api/v1/coach/sessions/{session_id}")
    assert r2.status_code == 404

    # Alice's session must be untouched.
    r3 = await alice_client.get(f"/api/v1/coach/sessions/{session_id}/messages")
    assert len(r3.json()["messages"]) == 2


@pytest.mark.asyncio
async def test_delete_session_removes_it_and_cascades_messages(
    alice_client: AsyncClient,
) -> None:
    r = await alice_client.post(
        "/api/v1/coach/chat/stream",
        json={"question": "Talk me through Cindy."},
    )
    session_id = _parse_sse(r.content)[-1]["session_id"]

    r2 = await alice_client.delete(f"/api/v1/coach/sessions/{session_id}")
    assert r2.status_code == 204

    r3 = await alice_client.get("/api/v1/coach/sessions")
    ids = [s["id"] for s in r3.json()]
    assert session_id not in ids

    # Messages are gone too (cascade), not merely orphaned.
    r4 = await alice_client.get(f"/api/v1/coach/sessions/{session_id}/messages")
    assert r4.json()["messages"] == []


@pytest.mark.asyncio
async def test_session_messages_include_safety_tier_and_stop_copy_matches_live(
    alice_client: AsyncClient,
) -> None:
    r = await alice_client.post(
        "/api/v1/coach/chat/stream",
        json={"question": "I have severe chest pain and can't breathe."},
    )
    assert r.status_code == 200
    events = _parse_sse(r.content)
    live_message = events[0]["message"]

    r2 = await alice_client.get("/api/v1/coach/sessions")
    assert r2.status_code == 200
    session_id = r2.json()[0]["id"]

    r3 = await alice_client.get(f"/api/v1/coach/sessions/{session_id}/messages")
    assert r3.status_code == 200
    msgs = r3.json()["messages"]
    assert len(msgs) == 2
    for m in msgs:
        assert m["safety_tier"] == "stop"

    assistant_msg = next(m for m in msgs if m["role"] == "assistant")
    assert assistant_msg["content"] == live_message
    assert "medical professional" in assistant_msg["content"]
    assert assistant_msg["content"] != "I can't assist with that request."
