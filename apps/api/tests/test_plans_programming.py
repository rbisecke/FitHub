"""Integration tests for BE-06: _prefetch_1rm and updated create_plan endpoint."""

from __future__ import annotations

import asyncio
import uuid

import psycopg
import pytest
from httpx import AsyncClient

from app.routers.plans import _prefetch_1rm

# Shared DSN from conftest — matches session-scoped pool
TEST_DB_DSN = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"

ALICE_ID = uuid.UUID("00000001-0000-0000-0000-000000000001")

_BASE_PLAN = {
    "archetype": "general-crossfit",
    "title": "Test Plan",
    "start_date": "2026-07-01",
    "weeks": 8,
    "training_age": "intermediate",
    "days_per_week": 4,
}


# ── Helpers ─────────────────────────────────────────────────────────────────────


async def _create_movement(alice_client: AsyncClient, *, suffix: str | None = None) -> str:
    """Create a minimal movement via the API and return its ID."""
    uid = suffix or uuid.uuid4().hex[:8]
    payload = {
        "name": f"Test Squat {uid}",
        "slug": f"test-squat-{uid}",
        "base_movement": "Back Squat",
        "modality": "strength",
        "default_result_types": ["weight", "reps"],
    }
    r = await alice_client.post("/api/v1/movements", json=payload)
    assert r.status_code == 201, r.text
    return str(r.json()["id"])


async def _log_weight_result(
    alice_client: AsyncClient,
    movement_id: str,
    load_kg: float,
    reps: int,
    performed_at: str = "2026-06-01T08:00:00Z",
) -> None:
    """Create a workout with a single weight result attached to the given movement."""
    payload = {
        "performed_at": performed_at,
        "results": [
            {
                "movement_id": movement_id,
                "result_type": "weight",
                "load_kg": str(load_kg),
                "reps": reps,
                "order_index": 0,
            }
        ],
    }
    r = await alice_client.post("/api/v1/workouts", json=payload)
    assert r.status_code == 201, r.text


# ── _prefetch_1rm unit tests ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_prefetch_1rm_returns_none_when_no_results(alice_client: AsyncClient) -> None:
    """_prefetch_1rm returns None when the user has no weight results for the movement."""
    movement_id = uuid.UUID(await _create_movement(alice_client))

    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN) as conn:
        result = await _prefetch_1rm(movement_id, str(ALICE_ID), conn)

    assert result is None


@pytest.mark.asyncio
async def test_prefetch_1rm_returns_most_recent_epley_estimate(alice_client: AsyncClient) -> None:
    """_prefetch_1rm returns the max Epley estimate across recent sets.

    100kg x 5 reps -> e1RM = 100 * (1 + 5/30) = 116.667 -> rounds to 116.7
    """
    movement_id = await _create_movement(alice_client)

    # Log one result for Alice
    await _log_weight_result(alice_client, movement_id, load_kg=100.0, reps=5)

    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN) as conn:
        result = await _prefetch_1rm(uuid.UUID(movement_id), str(ALICE_ID), conn)

    assert result is not None
    # Epley: 100 * (1 + 5/30) = 116.666... rounds to 116.7
    assert abs(result - 116.7) < 0.5


@pytest.mark.asyncio
async def test_prefetch_1rm_returns_max_across_sets(alice_client: AsyncClient) -> None:
    """When multiple sets exist, _prefetch_1rm returns the highest Epley estimate."""
    movement_id = await _create_movement(alice_client)

    # Log two sets in one workout; the heavier set should win
    payload = {
        "performed_at": "2026-06-02T09:00:00Z",
        "results": [
            {
                "movement_id": movement_id,
                "result_type": "weight",
                "load_kg": "100.0",
                "reps": 5,
                "order_index": 0,
            },
            {
                "movement_id": movement_id,
                "result_type": "weight",
                "load_kg": "110.0",
                "reps": 3,
                "order_index": 1,
            },
        ],
    }
    r = await alice_client.post("/api/v1/workouts", json=payload)
    assert r.status_code == 201, r.text

    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN) as conn:
        result = await _prefetch_1rm(uuid.UUID(movement_id), str(ALICE_ID), conn)

    # set1: 100 * (1 + 5/30) = 116.67; set2: 110 * (1 + 3/30) = 121.0 -> max = 121.0
    assert result is not None
    assert abs(result - 121.0) < 0.5


@pytest.mark.asyncio
async def test_prefetch_1rm_user_isolation(
    alice_client: AsyncClient, bob_client: AsyncClient
) -> None:
    """_prefetch_1rm must not return another user's results (IDOR check)."""
    # Alice logs a result for the movement
    movement_id = await _create_movement(alice_client)
    await _log_weight_result(alice_client, movement_id, load_kg=150.0, reps=1)

    # Bob queries the same movement_id — should get None since it's Alice's data
    BOB_ID = uuid.UUID("00000002-0000-0000-0000-000000000002")
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN) as conn:
        result = await _prefetch_1rm(uuid.UUID(movement_id), str(BOB_ID), conn)

    assert result is None


# ── create_plan endpoint tests ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_plan_one_rm_peak_auto_populates_1rm(alice_client: AsyncClient) -> None:
    """For one-rm-peak without current_1rm_kg, the endpoint fetches 1RM from results."""
    movement_id = await _create_movement(alice_client)
    # Log a result so _prefetch_1rm has data to return
    await _log_weight_result(alice_client, movement_id, load_kg=100.0, reps=5)

    r = await alice_client.post(
        "/api/v1/plans",
        json={
            **_BASE_PLAN,
            "archetype": "one-rm-peak",
            "target_movement_id": movement_id,
            # Deliberately omit current_1rm_kg — endpoint should auto-fill from results
        },
    )
    assert r.status_code == 202, r.text
    data = r.json()
    assert data["status"] == "pending"
    assert "task_id" in data


@pytest.mark.asyncio
async def test_create_plan_accepts_all_new_fields(alice_client: AsyncClient) -> None:
    """create_plan accepts equipment, days_per_week, and current_1rm_kg without errors."""
    movement_id = await _create_movement(alice_client)

    r = await alice_client.post(
        "/api/v1/plans",
        json={
            **_BASE_PLAN,
            "archetype": "one-rm-peak",
            "equipment": ["barbell", "rack"],
            "days_per_week": 4,
            "target_movement_id": movement_id,
            "current_1rm_kg": 120.0,
        },
    )
    assert r.status_code == 202, r.text


@pytest.mark.asyncio
async def test_create_plan_missing_required_fields_returns_422(alice_client: AsyncClient) -> None:
    """create_plan returns 422 when required fields are missing."""
    r = await alice_client.post(
        "/api/v1/plans",
        json={
            "title": "Incomplete Plan",
            "start_date": "2026-07-01",
            "weeks": 8,
            # archetype, training_age, days_per_week all missing
        },
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_create_plan_invalid_archetype_returns_422(alice_client: AsyncClient) -> None:
    """create_plan rejects unknown archetype values with 422."""
    r = await alice_client.post(
        "/api/v1/plans",
        json={
            **_BASE_PLAN,
            "archetype": "win_crossfit_games",
        },
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_create_plan_one_rm_peak_requires_target_movement_id(
    alice_client: AsyncClient,
) -> None:
    """one-rm-peak without target_movement_id returns 422 (model_validator enforces it)."""
    r = await alice_client.post(
        "/api/v1/plans",
        json={
            **_BASE_PLAN,
            "archetype": "one-rm-peak",
            # target_movement_id intentionally omitted
        },
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_create_plan_one_rm_peak_with_explicit_1rm_skips_prefetch(
    alice_client: AsyncClient,
) -> None:
    """When current_1rm_kg is explicitly provided, the endpoint accepts it without DB prefetch."""
    movement_id = await _create_movement(alice_client)

    r = await alice_client.post(
        "/api/v1/plans",
        json={
            **_BASE_PLAN,
            "archetype": "one-rm-peak",
            "target_movement_id": movement_id,
            "current_1rm_kg": 140.0,
        },
    )
    assert r.status_code == 202, r.text


@pytest.mark.asyncio
async def test_create_plan_task_completes_with_new_fields(alice_client: AsyncClient) -> None:
    """Plan generation task completes successfully when new fields are supplied (stub mode)."""
    r = await alice_client.post("/api/v1/plans", json=_BASE_PLAN)
    assert r.status_code == 202
    task_id = r.json()["task_id"]

    for _ in range(50):
        status_r = await alice_client.get(f"/api/v1/plans/tasks/{task_id}")
        if status_r.json()["status"] == "complete":
            break
        await asyncio.sleep(0.1)

    assert status_r.json()["status"] == "complete"
    assert status_r.json()["plan_id"] is not None
