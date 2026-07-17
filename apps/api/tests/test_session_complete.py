"""Integration tests for POST /api/v1/plans/{plan_id}/sessions/{session_id}/complete (C4)."""

from __future__ import annotations

import asyncio
import uuid

import psycopg
import pytest
from httpx import AsyncClient

from tests.conftest import ALICE_ID, BOB_ID, TEST_DB_DSN

CREATE_BODY = {
    "archetype": "general-crossfit",
    "title": "Session Complete Test Plan",
    "start_date": "2026-07-01",
    "weeks": 4,
    "training_age": "intermediate",
    "days_per_week": 4,
}


async def _create_plan(client: AsyncClient) -> str:
    """Create a plan and wait for task completion; return plan_id."""
    r = await client.post("/api/v1/plans", json=CREATE_BODY)
    assert r.status_code == 202
    task_id = r.json()["task_id"]
    for _ in range(100):
        tr = await client.get(f"/api/v1/plans/tasks/{task_id}")
        if tr.json()["status"] == "complete":
            return str(tr.json()["plan_id"])
        await asyncio.sleep(0.1)
    pytest.fail("Plan task did not complete within 10 seconds")


async def _prescribed_session_with_items(plan_id: str) -> tuple[str, list[str]]:
    """Return (session_id, [planned_item_id, ...]) for the prescribed session with
    the most items in this plan — real, seeded rows, not fixtures."""
    async with (
        await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn,
        conn.cursor(row_factory=psycopg.rows.dict_row) as cur,
    ):
        await cur.execute(
            """
            SELECT ps.id AS session_id,
                   json_agg(pi.id::text ORDER BY pi.item_order) AS item_ids
            FROM planned_sessions ps
            JOIN planned_items pi ON pi.session_id = ps.id
            WHERE ps.plan_id = %s::uuid AND ps.status = 'prescribed'
            GROUP BY ps.id
            ORDER BY COUNT(pi.id) DESC
            LIMIT 1
            """,
            [plan_id],
        )
        row = await cur.fetchone()
    assert row is not None, "Seeded plan has no prescribed session with items"
    return str(row["session_id"]), list(row["item_ids"])


async def _create_movement(client: AsyncClient) -> str:
    slug = "session-complete-test-" + uuid.uuid4().hex[:8]
    r = await client.post(
        "/api/v1/movements",
        json={
            "name": "Session Complete Test Lift",
            "slug": slug,
            "base_movement": "Session Complete Test Lift",
            "modality": "strength",
        },
    )
    assert r.status_code == 201, r.json()
    return str(r.json()["id"])


def _logged_sets_body(item_ids: list[str], movement_id: str | None) -> list[dict[str, object]]:
    chosen = item_ids[: min(5, max(3, len(item_ids)))][: len(item_ids)]
    return [
        {
            "planned_item_id": item_id,
            "movement_id": movement_id if i == 0 else None,
            "load_kg": 60 + i * 2.5,
            "reps": 5,
            "rpe": 7.5,
        }
        for i, item_id in enumerate(chosen)
    ]


# ── Auth ───────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_complete_session_requires_auth(
    alice_client: AsyncClient, anon_client: AsyncClient
) -> None:
    plan_id = await _create_plan(alice_client)
    session_id, item_ids = await _prescribed_session_with_items(plan_id)
    r = await anon_client.post(
        f"/api/v1/plans/{plan_id}/sessions/{session_id}/complete",
        json={"logged_sets": _logged_sets_body(item_ids, None)},
    )
    assert r.status_code == 401


# ── IDOR ───────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_complete_session_idor_returns_404(
    alice_client: AsyncClient, bob_client: AsyncClient
) -> None:
    plan_id = await _create_plan(alice_client)
    session_id, item_ids = await _prescribed_session_with_items(plan_id)
    r = await bob_client.post(
        f"/api/v1/plans/{plan_id}/sessions/{session_id}/complete",
        json={"logged_sets": _logged_sets_body(item_ids, None)},
    )
    assert r.status_code == 404

    # Confirm the attack had zero side effects: session still prescribed, no workout created.
    async with (
        await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn,
        conn.cursor(row_factory=psycopg.rows.dict_row) as cur,
    ):
        await cur.execute("SELECT status FROM planned_sessions WHERE id = %s::uuid", [session_id])
        row = await cur.fetchone()
        assert row is not None
        assert row["status"] == "prescribed"

        await cur.execute(
            "SELECT COUNT(*) AS n FROM public.workouts WHERE user_id = %s::uuid", [str(BOB_ID)]
        )
        count_row = await cur.fetchone()
        assert count_row is not None
        assert count_row["n"] == 0


# ── Happy path ─────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_complete_session_persists_results_and_marks_completed(
    alice_client: AsyncClient,
) -> None:
    plan_id = await _create_plan(alice_client)
    session_id, item_ids = await _prescribed_session_with_items(plan_id)
    movement_id = await _create_movement(alice_client)
    logged_sets = _logged_sets_body(item_ids, movement_id)

    r = await alice_client.post(
        f"/api/v1/plans/{plan_id}/sessions/{session_id}/complete",
        json={"logged_sets": logged_sets, "bodyweight_kg": 82.5},
    )
    assert r.status_code == 200, r.json()
    data = r.json()
    assert data["id"] == session_id
    assert data["status"] == "completed"
    assert isinstance(data["items"], list)
    assert len(data["items"]) >= 1

    async with (
        await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn,
        conn.cursor(row_factory=psycopg.rows.dict_row) as cur,
    ):
        await cur.execute("SELECT status FROM planned_sessions WHERE id = %s::uuid", [session_id])
        session_row = await cur.fetchone()
        assert session_row is not None
        assert session_row["status"] == "completed"

        await cur.execute(
            """
            SELECT r.planned_item_id::text AS planned_item_id, r.workout_id::text AS workout_id,
                   r.movement_id::text AS movement_id, r.load_kg, r.reps, r.result_type
            FROM public.results r
            JOIN public.workouts w ON w.id = r.workout_id
            WHERE w.user_id = %s::uuid
            ORDER BY r.created_at
            """,
            [str(ALICE_ID)],
        )
        result_rows = await cur.fetchall()

    assert len(result_rows) == len(logged_sets)
    workout_ids = {row["workout_id"] for row in result_rows}
    assert len(workout_ids) == 1, "All logged sets must attach to the same new workout"

    logged_by_item = {s["planned_item_id"]: s for s in logged_sets}
    for row in result_rows:
        assert row["result_type"] == "weight"
        expected = logged_by_item[row["planned_item_id"]]
        assert row["planned_item_id"] == expected["planned_item_id"]
        assert float(row["load_kg"]) == expected["load_kg"]
        assert row["reps"] == expected["reps"]
    assert result_rows[0]["movement_id"] == movement_id


# ── Atomicity ──────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_complete_session_rolls_back_on_invalid_planned_item_id(
    alice_client: AsyncClient,
) -> None:
    """One logged set with a nonexistent planned_item_id must roll back the
    entire transaction — no orphaned workout row, no partial results, session
    status untouched. This is the test that proves the transaction wrapping."""
    plan_id = await _create_plan(alice_client)
    session_id, item_ids = await _prescribed_session_with_items(plan_id)
    logged_sets = _logged_sets_body(item_ids, None)
    logged_sets.append(
        {
            "planned_item_id": str(uuid.uuid4()),  # never exists -> FK violation
            "movement_id": None,
            "load_kg": 50,
            "reps": 5,
            "rpe": 6,
        }
    )

    async with (
        await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn,
        conn.cursor(row_factory=psycopg.rows.dict_row) as cur,
    ):
        await cur.execute(
            "SELECT COUNT(*) AS n FROM public.workouts WHERE user_id = %s::uuid", [str(ALICE_ID)]
        )
        before_row = await cur.fetchone()
        assert before_row is not None
        workouts_before = before_row["n"]

    r = await alice_client.post(
        f"/api/v1/plans/{plan_id}/sessions/{session_id}/complete",
        json={"logged_sets": logged_sets},
    )
    assert r.status_code >= 400

    async with (
        await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn,
        conn.cursor(row_factory=psycopg.rows.dict_row) as cur,
    ):
        await cur.execute(
            "SELECT COUNT(*) AS n FROM public.workouts WHERE user_id = %s::uuid", [str(ALICE_ID)]
        )
        after_row = await cur.fetchone()
        assert after_row is not None
        assert after_row["n"] == workouts_before, "No orphaned workout row from the failed attempt"

        await cur.execute("SELECT status FROM planned_sessions WHERE id = %s::uuid", [session_id])
        session_row = await cur.fetchone()
        assert session_row is not None
        assert session_row["status"] == "prescribed"

        await cur.execute(
            "SELECT COUNT(*) AS n FROM public.results WHERE user_id = %s::uuid", [str(ALICE_ID)]
        )
        results_row = await cur.fetchone()
        assert results_row is not None
        assert results_row["n"] == 0, "No partial results rows from the rolled-back transaction"


# ── Validation ─────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_complete_session_rejects_too_many_logged_sets(alice_client: AsyncClient) -> None:
    plan_id = await _create_plan(alice_client)
    session_id, item_ids = await _prescribed_session_with_items(plan_id)
    too_many = [
        {"planned_item_id": item_ids[0], "movement_id": None, "load_kg": 50, "reps": 5}
        for _ in range(201)
    ]
    r = await alice_client.post(
        f"/api/v1/plans/{plan_id}/sessions/{session_id}/complete",
        json={"logged_sets": too_many},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_complete_session_rejects_invalid_rpe(alice_client: AsyncClient) -> None:
    plan_id = await _create_plan(alice_client)
    session_id, item_ids = await _prescribed_session_with_items(plan_id)
    r = await alice_client.post(
        f"/api/v1/plans/{plan_id}/sessions/{session_id}/complete",
        json={
            "logged_sets": [{"planned_item_id": item_ids[0], "load_kg": 50, "reps": 5, "rpe": 11}]
        },
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_complete_session_nonexistent_session_returns_404(alice_client: AsyncClient) -> None:
    plan_id = await _create_plan(alice_client)
    r = await alice_client.post(
        f"/api/v1/plans/{plan_id}/sessions/{uuid.uuid4()}/complete",
        json={"logged_sets": []},
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_complete_session_allows_zero_logged_sets(alice_client: AsyncClient) -> None:
    """A session can be marked complete with no logged sets (e.g. all bodyweight,
    nothing worth recording numerically)."""
    plan_id = await _create_plan(alice_client)
    session_id, _item_ids = await _prescribed_session_with_items(plan_id)
    r = await alice_client.post(
        f"/api/v1/plans/{plan_id}/sessions/{session_id}/complete",
        json={"logged_sets": []},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "completed"
