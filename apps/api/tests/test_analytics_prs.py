"""Integration tests for personal-records and movement-trend endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

_SQUAT_RESULT = {
    "result_type": "weight",
    "load_kg": 100.0,
    "reps": 5,
    "order_index": 0,
    "pace_distance_m": 500,
    "is_pr": False,
}


async def _create_movement(client: AsyncClient, name: str = "Back Squat PR Test") -> str:
    import uuid as _uuid

    slug = name.lower().replace(" ", "-") + "-" + _uuid.uuid4().hex[:6]
    r = await client.post(
        "/api/v1/movements",
        json={"name": name, "slug": slug, "base_movement": name, "modality": "strength"},
    )
    assert r.status_code == 201, r.json()
    return r.json()["id"]


@pytest.mark.asyncio
async def test_prs_no_results(alice_client: AsyncClient) -> None:
    r = await alice_client.get("/api/v1/analytics/personal-records")
    assert r.status_code == 200
    assert r.json() == []


@pytest.mark.asyncio
async def test_prs_single_result(alice_client: AsyncClient) -> None:
    movement_id = await _create_movement(alice_client)
    result = {**_SQUAT_RESULT, "movement_id": movement_id}
    await alice_client.post(
        "/api/v1/workouts",
        json={"performed_at": "2024-01-10T12:00:00Z", "results": [result]},
    )

    r = await alice_client.get("/api/v1/analytics/personal-records")
    assert r.status_code == 200
    prs = r.json()
    assert len(prs) == 1
    assert prs[0]["movement_name"] == "Back Squat PR Test"
    assert prs[0]["best_1rm_kg"] > 0


@pytest.mark.asyncio
async def test_prs_returns_highest_e1rm(alice_client: AsyncClient) -> None:
    movement_id = await _create_movement(alice_client)
    low_result = {**_SQUAT_RESULT, "movement_id": movement_id, "load_kg": 80.0, "reps": 5}
    high_result = {**_SQUAT_RESULT, "movement_id": movement_id, "load_kg": 120.0, "reps": 5}

    await alice_client.post(
        "/api/v1/workouts",
        json={"performed_at": "2024-01-10T12:00:00Z", "results": [low_result]},
    )
    await alice_client.post(
        "/api/v1/workouts",
        json={"performed_at": "2024-01-20T12:00:00Z", "results": [high_result]},
    )

    r = await alice_client.get("/api/v1/analytics/personal-records")
    assert r.status_code == 200
    prs = r.json()
    assert len(prs) == 1
    # Epley for 120kg × 5 reps = 120 × (1 + 5/30) = 140
    assert prs[0]["best_1rm_kg"] == pytest.approx(140.0, rel=0.01)


@pytest.mark.asyncio
async def test_prs_two_movements(alice_client: AsyncClient) -> None:
    m1_id = await _create_movement(alice_client, "Deadlift PR Test")
    m2_id = await _create_movement(alice_client, "Press PR Test")

    await alice_client.post(
        "/api/v1/workouts",
        json={
            "performed_at": "2024-01-10T12:00:00Z",
            "results": [
                {**_SQUAT_RESULT, "movement_id": m1_id, "load_kg": 150.0},
                {**_SQUAT_RESULT, "movement_id": m2_id, "load_kg": 70.0, "order_index": 1},
            ],
        },
    )

    r = await alice_client.get("/api/v1/analytics/personal-records")
    assert r.status_code == 200
    assert len(r.json()) == 2


@pytest.mark.asyncio
async def test_movement_trend_ordered_asc(alice_client: AsyncClient) -> None:
    movement_id = await _create_movement(alice_client)
    for i, load in enumerate([80.0, 100.0, 110.0]):
        result = {**_SQUAT_RESULT, "movement_id": movement_id, "load_kg": load}
        await alice_client.post(
            "/api/v1/workouts",
            json={
                "performed_at": f"2024-0{i + 1}-10T12:00:00Z",
                "results": [result],
            },
        )

    r = await alice_client.get(f"/api/v1/analytics/movement-trend/{movement_id}")
    assert r.status_code == 200
    points = r.json()
    assert len(points) == 3
    e1rms = [p["estimated_1rm_kg"] for p in points]
    assert e1rms == sorted(e1rms)


@pytest.mark.asyncio
async def test_prs_requires_auth(anon_client: AsyncClient) -> None:
    r = await anon_client.get("/api/v1/analytics/personal-records")
    assert r.status_code == 401
