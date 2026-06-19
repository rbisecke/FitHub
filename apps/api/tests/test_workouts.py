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


@pytest.mark.asyncio
async def test_create_workout_computes_perceived_load(alice_client: AsyncClient) -> None:
    """perceived_load_au = round(session_rpe × duration_s / 60)."""
    payload = {
        "performed_at": "2024-06-03T08:00:00Z",
        "session_rpe": "8.0",
        "duration_s": 3600,  # 60 minutes → 8 × 60 = 480
    }
    r = await alice_client.post("/api/v1/workouts", json=payload)
    assert r.status_code == 201
    body = r.json()
    assert body["session_rpe"] == "8.0"
    assert body["duration_s"] == 3600
    assert body["perceived_load_au"] == 480


@pytest.mark.asyncio
async def test_create_workout_computes_volume_and_e1rm(alice_client: AsyncClient) -> None:
    """volume_load_kg = Σ(load×reps); estimated_1rm_kg = Epley formula per set."""
    payload = {
        "performed_at": "2024-06-04T08:00:00Z",
        "results": [
            {"result_type": "weight", "load_kg": "100.0", "reps": 5, "order_index": 0},
            {"result_type": "weight", "load_kg": "110.0", "reps": 3, "order_index": 1},
        ],
    }
    r = await alice_client.post("/api/v1/workouts", json=payload)
    assert r.status_code == 201
    body = r.json()

    # volume = 100×5 + 110×3 = 500 + 330 = 830
    assert body["volume_load_kg"] is not None
    assert float(body["volume_load_kg"]) == pytest.approx(830.0)

    # Epley: 100 × (1 + 5/30) ≈ 116.667; 110 × (1 + 3/30) = 121.0
    r1, r2 = body["results"][0], body["results"][1]
    assert r1["estimated_1rm_kg"] is not None
    assert float(r1["estimated_1rm_kg"]) == pytest.approx(116.667, rel=1e-3)
    assert r2["estimated_1rm_kg"] is not None
    assert float(r2["estimated_1rm_kg"]) == pytest.approx(121.0, rel=1e-3)


@pytest.mark.asyncio
async def test_patch_workout_recomputes_perceived_load_partial(alice_client: AsyncClient) -> None:
    """Patching only session_rpe merges with the stored duration_s via COALESCE."""
    create_payload = {
        "performed_at": "2024-06-05T08:00:00Z",
        "session_rpe": "7.0",
        "duration_s": 1800,  # 30 min → 7 × 30 = 210
    }
    cr = await alice_client.post("/api/v1/workouts", json=create_payload)
    assert cr.status_code == 201
    assert cr.json()["perceived_load_au"] == 210
    workout_id = cr.json()["id"]

    # Patch only rpe; duration_s stays 1800 → 9 × 30 = 270
    r = await alice_client.patch(f"/api/v1/workouts/{workout_id}", json={"session_rpe": "9.0"})
    assert r.status_code == 200
    body = r.json()
    assert body["session_rpe"] == "9.0"
    assert body["duration_s"] == 1800
    assert body["perceived_load_au"] == 270
