"""Integration tests for GET /api/v1/analytics/training-balance."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import psycopg
import pytest
from httpx import AsyncClient

from tests.conftest import TEST_DB_DSN


async def _create_movement(client: AsyncClient, name: str, group: str | None) -> str:
    slug = name.lower().replace(" ", "-") + "-" + uuid.uuid4().hex[:6]
    r = await client.post(
        "/api/v1/movements",
        json={"name": name, "slug": slug, "base_movement": name, "modality": "strength"},
    )
    assert r.status_code == 201, r.json()
    movement_id: str = r.json()["id"]

    if group is not None:
        async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn:
            await conn.execute(
                "UPDATE public.movements SET primary_muscle_group = %s WHERE id = %s",
                [group, movement_id],
            )
    return movement_id


def _workout_with_result(movement_id: str, load_kg: float, reps: int, days_ago: int = 1) -> dict:
    dt = datetime.now(UTC) - timedelta(days=days_ago)
    return {
        "performed_at": dt.strftime("%Y-%m-%dT12:00:00Z"),
        "results": [
            {
                "movement_id": movement_id,
                "result_type": "weight",
                "load_kg": load_kg,
                "reps": reps,
                "order_index": 0,
                "is_pr": False,
            }
        ],
    }


@pytest.mark.asyncio
async def test_training_balance_empty(alice_client: AsyncClient) -> None:
    r = await alice_client.get("/api/v1/analytics/training-balance")
    assert r.status_code == 200
    body = r.json()
    assert body["breakdown"] == []
    assert body["period_days"] == 28


@pytest.mark.asyncio
async def test_training_balance_single_group(alice_client: AsyncClient) -> None:
    m_id = await _create_movement(alice_client, "Leg Press Test", "legs")
    await alice_client.post("/api/v1/workouts", json=_workout_with_result(m_id, 100.0, 5))

    r = await alice_client.get("/api/v1/analytics/training-balance?days=28")
    assert r.status_code == 200
    body = r.json()
    breakdown = body["breakdown"]
    assert len(breakdown) == 1
    assert breakdown[0]["category"] == "legs"
    assert breakdown[0]["volume_pct"] == pytest.approx(1.0)
    assert breakdown[0]["load_au"] == pytest.approx(500.0)  # 100 * 5


@pytest.mark.asyncio
async def test_training_balance_multiple_groups(alice_client: AsyncClient) -> None:
    legs_id = await _create_movement(alice_client, "Squat Test", "legs")
    pull_id = await _create_movement(alice_client, "Pullup Test", "pull")

    # legs: 100kg × 5 = 500 load_au
    # pull: 50kg × 10 = 500 load_au
    # → each 50%
    await alice_client.post("/api/v1/workouts", json=_workout_with_result(legs_id, 100.0, 5))
    await alice_client.post("/api/v1/workouts", json=_workout_with_result(pull_id, 50.0, 10))

    r = await alice_client.get("/api/v1/analytics/training-balance?days=28")
    assert r.status_code == 200
    breakdown = r.json()["breakdown"]
    assert len(breakdown) == 2
    cats = {row["category"]: row for row in breakdown}
    assert "legs" in cats
    assert "pull" in cats
    assert cats["legs"]["volume_pct"] == pytest.approx(0.5)
    assert cats["pull"]["volume_pct"] == pytest.approx(0.5)


@pytest.mark.asyncio
async def test_training_balance_days_filter(alice_client: AsyncClient) -> None:
    m_id = await _create_movement(alice_client, "Old Lift Test", "push")

    # One workout 40 days ago (outside 28-day window), one 3 days ago
    await alice_client.post(
        "/api/v1/workouts", json=_workout_with_result(m_id, 100.0, 5, days_ago=40)
    )
    await alice_client.post(
        "/api/v1/workouts", json=_workout_with_result(m_id, 80.0, 5, days_ago=3)
    )

    r28 = await alice_client.get("/api/v1/analytics/training-balance?days=28")
    r60 = await alice_client.get("/api/v1/analytics/training-balance?days=60")
    assert r28.status_code == 200
    assert r60.status_code == 200

    breakdown_28 = r28.json()["breakdown"]
    breakdown_60 = r60.json()["breakdown"]
    assert len(breakdown_28) == 1
    # 28-day window: only 80×5=400
    assert breakdown_28[0]["load_au"] == pytest.approx(400.0)
    # 60-day window: 80×5 + 100×5 = 900
    assert breakdown_60[0]["load_au"] == pytest.approx(900.0)


@pytest.mark.asyncio
async def test_training_balance_excludes_untagged_movements(alice_client: AsyncClient) -> None:
    tagged_id = await _create_movement(alice_client, "Tagged Lift Test", "core")
    untagged_id = await _create_movement(alice_client, "Untagged Lift Test", None)

    await alice_client.post("/api/v1/workouts", json=_workout_with_result(tagged_id, 60.0, 10))
    await alice_client.post("/api/v1/workouts", json=_workout_with_result(untagged_id, 200.0, 10))

    r = await alice_client.get("/api/v1/analytics/training-balance?days=28")
    assert r.status_code == 200
    breakdown = r.json()["breakdown"]
    # Only the tagged movement should appear
    assert len(breakdown) == 1
    assert breakdown[0]["category"] == "core"


@pytest.mark.asyncio
async def test_training_balance_user_isolation(
    alice_client: AsyncClient, bob_client: AsyncClient
) -> None:
    m_id = await _create_movement(alice_client, "Alice Iso Test", "conditioning")
    await alice_client.post("/api/v1/workouts", json=_workout_with_result(m_id, 500.0, 1))

    r = await bob_client.get("/api/v1/analytics/training-balance?days=28")
    assert r.status_code == 200
    assert r.json()["breakdown"] == []


@pytest.mark.asyncio
async def test_training_balance_requires_auth(anon_client: AsyncClient) -> None:
    r = await anon_client.get("/api/v1/analytics/training-balance")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_training_balance_days_bounds(alice_client: AsyncClient) -> None:
    r_low = await alice_client.get("/api/v1/analytics/training-balance?days=3")
    r_high = await alice_client.get("/api/v1/analytics/training-balance?days=999")
    assert r_low.status_code == 422
    assert r_high.status_code == 422


@pytest.mark.asyncio
async def test_training_balance_period_days_echoed(alice_client: AsyncClient) -> None:
    r = await alice_client.get("/api/v1/analytics/training-balance?days=14")
    assert r.status_code == 200
    assert r.json()["period_days"] == 14
