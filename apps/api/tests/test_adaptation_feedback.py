"""Integration tests for adaptation rejection feedback and adjust endpoint."""

from __future__ import annotations

import asyncio

import psycopg
import pytest
from httpx import AsyncClient

from tests.conftest import ALICE_ID, TEST_DB_DSN

CREATE_PLAN_BODY = {
    "goal": "general_fitness",
    "title": "Feedback Test Plan",
    "start_date": "2026-07-01",
    "weeks": 8,
    "training_age": "intermediate",
}


async def _make_plan(client: AsyncClient) -> str:
    r = await client.post("/api/v1/plans", json=CREATE_PLAN_BODY)
    task_id = r.json()["task_id"]
    for _ in range(20):
        tr = await client.get(f"/api/v1/plans/tasks/{task_id}")
        if tr.json()["status"] == "complete":
            return str(tr.json()["plan_id"])
        await asyncio.sleep(0.1)
    raise RuntimeError("Plan generation timed out")


async def _seed_adaptation(plan_id: str, user_id: str = str(ALICE_ID)) -> str:
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN) as db:
        async with db.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO adaptations
                    (plan_id, user_id, trigger_type, trigger_data, rationale, stub)
                VALUES (%s::uuid, %s, 'low_readiness', '{"streak_days":4}',
                        'Reduce intensity by 15%% this week.', true)
                RETURNING id::text
                """,
                [plan_id, user_id],
            )
            row = await cur.fetchone()
        await db.commit()
    return row[0]  # type: ignore[index]


# ── reject with reason ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_reject_with_reason_stores_it(alice_client: AsyncClient) -> None:
    plan_id = await _make_plan(alice_client)
    adaptation_id = await _seed_adaptation(plan_id)
    r = await alice_client.post(
        f"/api/v1/adaptations/{adaptation_id}/reject",
        json={"rejection_reason": "I prefer not to reduce volume this week."},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "rejected"
    assert data["rejection_reason"] == "I prefer not to reduce volume this week."
    assert data["rejected_at"] is not None


@pytest.mark.asyncio
async def test_reject_without_body_still_works(alice_client: AsyncClient) -> None:
    """Backward-compat: rejection_reason is optional."""
    plan_id = await _make_plan(alice_client)
    adaptation_id = await _seed_adaptation(plan_id)
    r = await alice_client.post(f"/api/v1/adaptations/{adaptation_id}/reject")
    assert r.status_code == 200
    assert r.json()["status"] == "rejected"
    assert r.json()["rejection_reason"] is None


@pytest.mark.asyncio
async def test_reject_with_empty_reason_stores_null(alice_client: AsyncClient) -> None:
    plan_id = await _make_plan(alice_client)
    adaptation_id = await _seed_adaptation(plan_id)
    r = await alice_client.post(
        f"/api/v1/adaptations/{adaptation_id}/reject",
        json={"rejection_reason": None},
    )
    assert r.status_code == 200
    assert r.json()["rejection_reason"] is None


# ── adjust endpoint ────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_adjust_rejects_old_and_creates_new(alice_client: AsyncClient) -> None:
    plan_id = await _make_plan(alice_client)
    adaptation_id = await _seed_adaptation(plan_id)

    r = await alice_client.post(
        f"/api/v1/adaptations/{adaptation_id}/adjust",
        json={"feedback": "Please reduce volume instead of intensity."},
    )
    assert r.status_code == 200
    new_adaptation = r.json()
    assert new_adaptation["id"] != adaptation_id
    assert new_adaptation["status"] == "proposed"
    assert new_adaptation["plan_id"] == plan_id
    assert new_adaptation["rationale"] is not None


@pytest.mark.asyncio
async def test_adjust_marks_original_as_rejected(alice_client: AsyncClient) -> None:
    plan_id = await _make_plan(alice_client)
    adaptation_id = await _seed_adaptation(plan_id)

    await alice_client.post(
        f"/api/v1/adaptations/{adaptation_id}/adjust",
        json={"feedback": "Too aggressive, please be more conservative."},
    )

    # Fetch list and check the original is rejected with the feedback as reason
    r = await alice_client.get(f"/api/v1/plans/{plan_id}/adaptations")
    adaptations = r.json()
    original = next((a for a in adaptations if a["id"] == adaptation_id), None)
    assert original is not None
    assert original["status"] == "rejected"
    assert original["rejection_reason"] == "Too aggressive, please be more conservative."


@pytest.mark.asyncio
async def test_adjust_requires_feedback(alice_client: AsyncClient) -> None:
    plan_id = await _make_plan(alice_client)
    adaptation_id = await _seed_adaptation(plan_id)
    r = await alice_client.post(
        f"/api/v1/adaptations/{adaptation_id}/adjust",
        json={"feedback": "hi"},  # too short (min_length=5)
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_adjust_on_non_proposed_returns_409(alice_client: AsyncClient) -> None:
    plan_id = await _make_plan(alice_client)
    adaptation_id = await _seed_adaptation(plan_id)
    # First merge it
    await alice_client.post(f"/api/v1/adaptations/{adaptation_id}/merge")
    r = await alice_client.post(
        f"/api/v1/adaptations/{adaptation_id}/adjust",
        json={"feedback": "Actually please revise this."},
    )
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_adjust_requires_auth(anon_client: AsyncClient) -> None:
    r = await anon_client.post(
        "/api/v1/adaptations/00000000-0000-0000-0000-000000000000/adjust",
        json={"feedback": "Some feedback here."},
    )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_adjust_idor_returns_404(alice_client: AsyncClient, bob_client: AsyncClient) -> None:
    plan_id = await _make_plan(alice_client)
    adaptation_id = await _seed_adaptation(plan_id, str(ALICE_ID))
    r = await bob_client.post(
        f"/api/v1/adaptations/{adaptation_id}/adjust",
        json={"feedback": "Bob should not be able to do this."},
    )
    assert r.status_code == 404
