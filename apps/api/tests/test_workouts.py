"""Integration tests for /api/v1/workouts."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

_WORKOUT = {"performed_at": "2024-06-01T08:00:00Z", "title": "Morning WOD"}


@pytest.mark.asyncio
async def test_list_workouts_requires_auth(anon_client: AsyncClient) -> None:
    r = await anon_client.get("/api/v1/workouts")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_create_workout_requires_auth(anon_client: AsyncClient) -> None:
    r = await anon_client.post("/api/v1/workouts", json=_WORKOUT)
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_create_workout_minimal(alice_client: AsyncClient) -> None:
    r = await alice_client.post("/api/v1/workouts", json=_WORKOUT)
    assert r.status_code == 201
    body = r.json()
    assert body["title"] == "Morning WOD"
    assert len(body["short_hash"]) == 8
    assert body["results"] == []


@pytest.mark.asyncio
async def test_create_workout_with_results(alice_client: AsyncClient) -> None:
    payload = {
        "performed_at": "2024-06-02T09:00:00Z",
        "results": [
            {
                "result_type": "weight",
                "load_kg": "100.0",
                "reps": 5,
                "order_index": 0,
            }
        ],
    }
    r = await alice_client.post("/api/v1/workouts", json=payload)
    assert r.status_code == 201
    body = r.json()
    assert len(body["results"]) == 1
    assert body["results"][0]["result_type"] == "weight"
    assert body["results"][0]["reps"] == 5


@pytest.mark.asyncio
async def test_get_workout(alice_client: AsyncClient) -> None:
    create = await alice_client.post("/api/v1/workouts", json=_WORKOUT)
    assert create.status_code == 201
    workout_id = create.json()["id"]

    r = await alice_client.get(f"/api/v1/workouts/{workout_id}")
    assert r.status_code == 200
    assert r.json()["id"] == workout_id


@pytest.mark.asyncio
async def test_get_workout_idor_returns_404(
    alice_client: AsyncClient, bob_client: AsyncClient
) -> None:
    """Bob cannot access Alice's workout — must return 404, not 403."""
    create = await alice_client.post("/api/v1/workouts", json=_WORKOUT)
    assert create.status_code == 201
    workout_id = create.json()["id"]

    r = await bob_client.get(f"/api/v1/workouts/{workout_id}")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_patch_workout(alice_client: AsyncClient) -> None:
    create = await alice_client.post("/api/v1/workouts", json=_WORKOUT)
    assert create.status_code == 201
    workout_id = create.json()["id"]

    r = await alice_client.patch(f"/api/v1/workouts/{workout_id}", json={"title": "Evening WOD"})
    assert r.status_code == 200
    assert r.json()["title"] == "Evening WOD"


@pytest.mark.asyncio
async def test_delete_workout(alice_client: AsyncClient) -> None:
    create = await alice_client.post("/api/v1/workouts", json=_WORKOUT)
    assert create.status_code == 201
    workout_id = create.json()["id"]

    r = await alice_client.delete(f"/api/v1/workouts/{workout_id}")
    assert r.status_code == 204

    r2 = await alice_client.get(f"/api/v1/workouts/{workout_id}")
    assert r2.status_code == 404
