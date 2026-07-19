"""Integration tests for the scaled boolean on results (BG-25)."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


def _weight_result(scaled: bool | None) -> dict:
    result: dict = {"result_type": "weight", "load_kg": "100.0", "reps": 5, "order_index": 0}
    if scaled is not None:
        result["scaled"] = scaled
    return result


@pytest.mark.asyncio
async def test_scaled_defaults_false(alice_client: AsyncClient) -> None:
    r = await alice_client.post(
        "/api/v1/workouts",
        json={"performed_at": "2026-06-25T10:00:00Z", "results": [_weight_result(None)]},
    )
    assert r.status_code == 201
    assert r.json()["results"][0]["scaled"] is False


@pytest.mark.asyncio
async def test_scaled_true_roundtrips_through_detail(alice_client: AsyncClient) -> None:
    create = await alice_client.post(
        "/api/v1/workouts",
        json={"performed_at": "2026-06-25T10:00:00Z", "results": [_weight_result(True)]},
    )
    assert create.status_code == 201
    assert create.json()["results"][0]["scaled"] is True

    workout_id = create.json()["id"]
    detail = await alice_client.get(f"/api/v1/workouts/{workout_id}")
    assert detail.status_code == 200
    assert detail.json()["results"][0]["scaled"] is True
