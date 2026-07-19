"""Integration tests for the adaptations API."""

from __future__ import annotations

import asyncio
import json

import psycopg
import pytest
from httpx import AsyncClient

from tests.conftest import ALICE_ID, TEST_DB_DSN

CREATE_PLAN_BODY = {
    "archetype": "general-crossfit",
    "title": "Adaptation Test Plan",
    "start_date": "2026-07-01",
    "weeks": 8,
    "training_age": "intermediate",
    "days_per_week": 4,
}


async def _make_plan(alice_client: AsyncClient) -> str:
    r = await alice_client.post("/api/v1/plans", json=CREATE_PLAN_BODY)
    task_id = r.json()["task_id"]
    for _ in range(20):
        tr = await alice_client.get(f"/api/v1/plans/tasks/{task_id}")
        if tr.json()["status"] == "complete":
            return str(tr.json()["plan_id"])
        await asyncio.sleep(0.1)
    raise RuntimeError("Plan generation timed out")


async def _seed_adaptation(plan_id: str) -> str:
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN) as db:
        async with db.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO adaptations
                    (plan_id, user_id, trigger_type, trigger_data, rationale, stub)
                VALUES (%s::uuid, %s, 'low_readiness', '{"streak_days":4}', 'Test rationale', true)
                RETURNING id::text
                """,
                [plan_id, str(ALICE_ID)],
            )
            row = await cur.fetchone()
        await db.commit()
    return row[0]  # type: ignore[index]


@pytest.mark.asyncio
async def test_list_adaptations_empty(alice_client: AsyncClient) -> None:
    plan_id = await _make_plan(alice_client)
    r = await alice_client.get(f"/api/v1/plans/{plan_id}/adaptations")
    assert r.status_code == 200
    assert r.json() == []


@pytest.mark.asyncio
async def test_list_adaptations_shows_seeded(alice_client: AsyncClient) -> None:
    plan_id = await _make_plan(alice_client)
    await _seed_adaptation(plan_id)
    r = await alice_client.get(f"/api/v1/plans/{plan_id}/adaptations")
    assert r.status_code == 200
    assert any(a["status"] == "proposed" for a in r.json())


@pytest.mark.asyncio
async def test_merge_adaptation(alice_client: AsyncClient) -> None:
    plan_id = await _make_plan(alice_client)
    adaptation_id = await _seed_adaptation(plan_id)
    r = await alice_client.post(f"/api/v1/adaptations/{adaptation_id}/merge")
    assert r.status_code == 200
    assert r.json()["status"] == "merged"
    assert r.json()["merged_at"] is not None


@pytest.mark.asyncio
async def test_reject_adaptation(alice_client: AsyncClient) -> None:
    plan_id = await _make_plan(alice_client)
    adaptation_id = await _seed_adaptation(plan_id)
    r = await alice_client.post(f"/api/v1/adaptations/{adaptation_id}/reject")
    assert r.status_code == 200
    assert r.json()["status"] == "rejected"
    assert r.json()["rejected_at"] is not None


@pytest.mark.asyncio
async def test_cannot_merge_already_merged(alice_client: AsyncClient) -> None:
    plan_id = await _make_plan(alice_client)
    adaptation_id = await _seed_adaptation(plan_id)
    await alice_client.post(f"/api/v1/adaptations/{adaptation_id}/merge")
    r = await alice_client.post(f"/api/v1/adaptations/{adaptation_id}/merge")
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_cannot_reject_already_rejected(alice_client: AsyncClient) -> None:
    plan_id = await _make_plan(alice_client)
    adaptation_id = await _seed_adaptation(plan_id)
    await alice_client.post(f"/api/v1/adaptations/{adaptation_id}/reject")
    r = await alice_client.post(f"/api/v1/adaptations/{adaptation_id}/reject")
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_adaptations_require_auth(anon_client: AsyncClient) -> None:
    r = await anon_client.get("/api/v1/plans/00000000-0000-0000-0000-000000000000/adaptations")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_adaptation_idor_404(alice_client: AsyncClient, bob_client: AsyncClient) -> None:
    plan_id = await _make_plan(alice_client)
    adaptation_id = await _seed_adaptation(plan_id)
    r = await bob_client.post(f"/api/v1/adaptations/{adaptation_id}/merge")
    assert r.status_code == 404


# ── BG-01/BG-02: rich diff_json shape + merge actually rewriting sessions ──────


async def _first_prescribed_session_with_items(
    plan_id: str,
) -> tuple[dict[str, object], list[dict[str, object]]]:
    """Fetch the first prescribed session (with all its items) for a freshly created plan."""
    async with (
        await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn,
        conn.cursor(row_factory=psycopg.rows.dict_row) as cur,
    ):
        await cur.execute(
            "SELECT id::text, title FROM planned_sessions"
            " WHERE plan_id = %s::uuid AND status = 'prescribed'"
            " ORDER BY scheduled_date LIMIT 1",
            [plan_id],
        )
        session = await cur.fetchone()
        assert session is not None, "freshly created plan must have a prescribed session"

        await cur.execute(
            "SELECT id::text, movement_name, sets, reps,"
            " load_pct_1rm::float AS load_pct_1rm, load_kg::float AS load_kg, notes, item_order"
            " FROM planned_items WHERE session_id = %s::uuid ORDER BY item_order",
            [session["id"]],
        )
        items = list(await cur.fetchall())
    return dict(session), items


def _rich_diff_json(
    session: dict[str, object], items: list[dict[str, object]], *, new_load_pct_1rm: float
) -> list[dict[str, object]]:
    """Build a BG-02-shaped diff_json: first item's load% reduced, any others carried
    through unchanged as context rows — exercising both branches of _diff_to_session_patch."""
    item_changes = []
    for i, item in enumerate(items):
        changed = i == 0
        item_changes.append(
            {
                "item_id": item["id"],
                "movement_name": item["movement_name"],
                "item_order": item["item_order"],
                "old_sets": item["sets"],
                "old_reps": item["reps"],
                "old_load_pct_1rm": item["load_pct_1rm"],
                "old_load_kg": item["load_kg"],
                "old_notes": item["notes"],
                "new_sets": item["sets"],
                "new_reps": item["reps"],
                "new_load_pct_1rm": new_load_pct_1rm if changed else item["load_pct_1rm"],
                "new_load_kg": item["load_kg"],
                "new_notes": item["notes"],
                "changed": changed,
                "removed": False,
            }
        )
    return [
        {
            "session_id": session["id"],
            "session_title": session["title"],
            "scheduled_date": None,
            "change": "reduce_intensity",
            "load_pct_delta": new_load_pct_1rm - float(items[0]["load_pct_1rm"] or 0),
            "volume_delta_sets": None,
            "notes": "Back off load this week.",
            "item_changes": item_changes,
        }
    ]


async def _seed_adaptation_with_diff(plan_id: str, diff_json: list[dict[str, object]]) -> str:
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN) as db:
        async with db.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO adaptations
                    (plan_id, user_id, trigger_type, trigger_data, rationale, diff_json, stub)
                VALUES (%s::uuid, %s, 'low_readiness', '{"streak_days":4}',
                        'Test rationale', %s::jsonb, true)
                RETURNING id::text
                """,
                [plan_id, str(ALICE_ID), json.dumps(diff_json)],
            )
            row = await cur.fetchone()
        await db.commit()
    return row[0]  # type: ignore[index]


@pytest.mark.asyncio
async def test_diff_json_round_trips_rich_shape(alice_client: AsyncClient) -> None:
    """BG-02: the new per-session/per-item diff_json shape survives the DB round trip
    through AdaptationOut without a Pydantic validation error."""
    plan_id = await _make_plan(alice_client)
    session, items = await _first_prescribed_session_with_items(plan_id)
    diff_json = _rich_diff_json(session, items, new_load_pct_1rm=55.0)
    await _seed_adaptation_with_diff(plan_id, diff_json)

    r = await alice_client.get(f"/api/v1/plans/{plan_id}/adaptations")
    assert r.status_code == 200
    proposed = [a for a in r.json() if a["status"] == "proposed"]
    assert len(proposed) == 1
    entry = proposed[0]["diff_json"][0]

    assert entry["session_id"] == session["id"]
    assert entry["change"] == "reduce_intensity"
    first_item = entry["item_changes"][0]
    assert first_item["item_id"] == items[0]["id"]
    assert first_item["movement_name"] == items[0]["movement_name"]
    assert first_item["new_load_pct_1rm"] == 55.0
    assert first_item["changed"] is True
    assert first_item["removed"] is False


@pytest.mark.asyncio
async def test_adjust_produces_diff_with_new_shape(alice_client: AsyncClient) -> None:
    """BG-02: adjust's revised proposal also carries the rich diff_json shape (stub mode)."""
    plan_id = await _make_plan(alice_client)
    adaptation_id = await _seed_adaptation(plan_id)

    r = await alice_client.post(
        f"/api/v1/adaptations/{adaptation_id}/adjust",
        json={"feedback": "Please reduce volume instead of intensity."},
    )
    assert r.status_code == 200
    new_adaptation = r.json()
    assert isinstance(new_adaptation["diff_json"], list)
    if new_adaptation["diff_json"]:
        entry = new_adaptation["diff_json"][0]
        assert "session_id" in entry
        assert "item_changes" in entry


@pytest.mark.asyncio
async def test_detect_produces_diff_with_new_shape(alice_client: AsyncClient) -> None:
    """BG-02: a triggered detect() proposal also carries the rich diff_json shape (stub mode)."""
    plan_id = await _make_plan(alice_client)

    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn:
        for i in range(4):
            await conn.execute(
                """
                INSERT INTO derived_metrics
                    (user_id, date, recovery_score, coverage, confidence_tier, baseline_days)
                VALUES (%s, CURRENT_DATE - %s, 0.3, 0.4, 'standard', 30)
                ON CONFLICT (user_id, date) DO UPDATE SET recovery_score = 0.3
                """,
                [str(ALICE_ID), i],
            )

    r = await alice_client.post(f"/api/v1/plans/{plan_id}/adaptations/detect")
    assert r.status_code == 201
    body = r.json()
    proposed = body["proposed_adaptations"]
    assert len(proposed) >= 1
    for adaptation in proposed:
        assert isinstance(adaptation["diff_json"], list)
        if adaptation["diff_json"]:
            entry = adaptation["diff_json"][0]
            assert "session_id" in entry
            assert "item_changes" in entry
