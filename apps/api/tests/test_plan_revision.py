"""Integration tests for POST /api/v1/plans/{plan_id}/revise."""

from __future__ import annotations

import asyncio

import psycopg
import pytest
from httpx import AsyncClient

from tests.conftest import ALICE_ID, TEST_DB_DSN

# ── Shared helpers ─────────────────────────────────────────────────────────────

CREATE_BODY = {
    "goal": "general_fitness",
    "title": "Revision Test Plan",
    "start_date": "2026-07-01",
    "weeks": 4,
    "training_age": "intermediate",
}

FEEDBACK = "My knees have been bothering me — please reduce squat volume."


async def _create_plan(client: AsyncClient) -> str:
    """Create a plan and wait for task completion; return plan_id."""
    r = await client.post("/api/v1/plans", json=CREATE_BODY)
    assert r.status_code == 202
    task_id = r.json()["task_id"]
    for _ in range(30):
        tr = await client.get(f"/api/v1/plans/tasks/{task_id}")
        if tr.json()["status"] == "complete":
            return str(tr.json()["plan_id"])
        await asyncio.sleep(0.1)
    pytest.fail("Plan task did not complete within 3 seconds")


# ── Auth ───────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_plan_revise_requires_auth(
    alice_client: AsyncClient, anon_client: AsyncClient
) -> None:
    plan_id = await _create_plan(alice_client)
    r = await anon_client.post(f"/api/v1/plans/{plan_id}/revise", json={"feedback": FEEDBACK})
    assert r.status_code == 401


# ── IDOR ───────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_plan_revise_idor(alice_client: AsyncClient, bob_client: AsyncClient) -> None:
    plan_id = await _create_plan(alice_client)
    r = await bob_client.post(f"/api/v1/plans/{plan_id}/revise", json={"feedback": FEEDBACK})
    assert r.status_code == 404


# ── Validation ─────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_plan_revise_feedback_too_short(alice_client: AsyncClient) -> None:
    plan_id = await _create_plan(alice_client)
    r = await alice_client.post(f"/api/v1/plans/{plan_id}/revise", json={"feedback": "hi"})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_plan_revise_no_prescribed_returns_422(alice_client: AsyncClient) -> None:
    plan_id = await _create_plan(alice_client)
    # Mark all sessions completed so no prescribed sessions remain
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn:
        await conn.execute(
            "UPDATE planned_sessions SET status = 'completed' WHERE plan_id = %s::uuid",
            [plan_id],
        )
    r = await alice_client.post(f"/api/v1/plans/{plan_id}/revise", json={"feedback": FEEDBACK})
    assert r.status_code == 422
    assert "prescribed" in r.json()["detail"].lower()


# ── Happy path ─────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_plan_revise_stub_returns_plan_detail(alice_client: AsyncClient) -> None:
    plan_id = await _create_plan(alice_client)
    r = await alice_client.post(f"/api/v1/plans/{plan_id}/revise", json={"feedback": FEEDBACK})
    assert r.status_code == 200
    data = r.json()
    assert data["id"] == plan_id
    assert isinstance(data["sessions"], list)
    assert len(data["sessions"]) >= 1
    assert isinstance(data["mesocycles"], list)
    assert len(data["mesocycles"]) >= 1


@pytest.mark.asyncio
async def test_plan_revise_only_touches_prescribed(alice_client: AsyncClient) -> None:
    plan_id = await _create_plan(alice_client)
    # Mark exactly one session as completed before revision
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn:
        await conn.execute(
            """
            UPDATE planned_sessions SET status = 'completed'
            WHERE id = (
                SELECT id FROM planned_sessions
                WHERE plan_id = %s::uuid AND status = 'prescribed'
                ORDER BY scheduled_date LIMIT 1
            )
            """,
            [plan_id],
        )

    r = await alice_client.post(f"/api/v1/plans/{plan_id}/revise", json={"feedback": FEEDBACK})
    assert r.status_code == 200
    data = r.json()
    completed = [s for s in data["sessions"] if s["status"] == "completed"]
    assert len(completed) == 1, "Completed session must remain untouched"
    prescribed = [s for s in data["sessions"] if s["status"] == "prescribed"]
    assert len(prescribed) >= 1


@pytest.mark.asyncio
async def test_plan_revise_creates_adaptation_audit_row(alice_client: AsyncClient) -> None:
    plan_id = await _create_plan(alice_client)
    r = await alice_client.post(f"/api/v1/plans/{plan_id}/revise", json={"feedback": FEEDBACK})
    assert r.status_code == 200

    async with (
        await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn,
        conn.cursor(row_factory=psycopg.rows.dict_row) as cur,
    ):
        await cur.execute(
            """
            SELECT trigger_type, status, stub, rationale, trigger_data
            FROM adaptations
            WHERE plan_id = %s::uuid AND user_id = %s::uuid
            ORDER BY proposed_at DESC LIMIT 1
            """,
            [plan_id, str(ALICE_ID)],
        )
        row = await cur.fetchone()

    assert row is not None, "No adaptation audit row was created"
    assert row["trigger_type"] == "manual"
    assert row["status"] == "merged"
    assert row["stub"] is True  # STUB_LLM=true in conftest
    assert row["rationale"] is not None
    assert row["trigger_data"]["feedback"] == FEEDBACK
