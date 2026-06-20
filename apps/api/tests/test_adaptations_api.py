"""Integration tests for the adaptations API."""

from __future__ import annotations

import asyncio

import psycopg
import pytest
from httpx import AsyncClient

from tests.conftest import ALICE_ID, TEST_DB_DSN

CREATE_PLAN_BODY = {
    "goal": "general_fitness",
    "title": "Adaptation Test Plan",
    "start_date": "2026-07-01",
    "weeks": 8,
    "training_age": "intermediate",
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
