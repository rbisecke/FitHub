"""Integration tests for ME-10: variant_annotation column on results.

Verifies that variant_annotation is persisted to the DB via CreateResultRequest
and returned in the Result response, replacing the retired variant:* notes encoding.
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_variant_annotation_round_trips(alice_client: AsyncClient) -> None:
    """variant_annotation sent on create is returned on the result."""
    payload = {
        "performed_at": "2024-07-01T10:00:00Z",
        "results": [
            {
                "result_type": "weight",
                "load_kg": "80.0",
                "reps": 3,
                "order_index": 0,
                "variant_annotation": "hang,power",
            }
        ],
    }
    r = await alice_client.post("/api/v1/workouts", json=payload)
    assert r.status_code == 201
    result = r.json()["results"][0]
    assert result["variant_annotation"] == "hang,power"


@pytest.mark.asyncio
async def test_variant_annotation_none_when_not_sent(alice_client: AsyncClient) -> None:
    """variant_annotation is null when not included in the request."""
    payload = {
        "performed_at": "2024-07-02T10:00:00Z",
        "results": [
            {
                "result_type": "weight",
                "load_kg": "60.0",
                "reps": 5,
                "order_index": 0,
            }
        ],
    }
    r = await alice_client.post("/api/v1/workouts", json=payload)
    assert r.status_code == 201
    result = r.json()["results"][0]
    assert result["variant_annotation"] is None


@pytest.mark.asyncio
async def test_variant_annotation_persists_on_get(alice_client: AsyncClient) -> None:
    """variant_annotation is returned when fetching the workout by ID."""
    payload = {
        "performed_at": "2024-07-03T10:00:00Z",
        "results": [
            {
                "result_type": "weight",
                "load_kg": "100.0",
                "reps": 1,
                "order_index": 0,
                "variant_annotation": "squat",
            }
        ],
    }
    create_r = await alice_client.post("/api/v1/workouts", json=payload)
    assert create_r.status_code == 201
    workout_id = create_r.json()["id"]

    get_r = await alice_client.get(f"/api/v1/workouts/{workout_id}")
    assert get_r.status_code == 200
    result = get_r.json()["results"][0]
    assert result["variant_annotation"] == "squat"
