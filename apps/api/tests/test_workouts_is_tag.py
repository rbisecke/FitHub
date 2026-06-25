"""Integration tests for is_tag field on workouts."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


def _workout(is_tag: bool = False) -> dict:
    return {
        "performed_at": "2026-06-25T10:00:00Z",
        "is_tag": is_tag,
    }


@pytest.mark.asyncio
async def test_is_tag_defaults_false(alice_client: AsyncClient) -> None:
    r = await alice_client.post("/api/v1/workouts", json={"performed_at": "2026-06-25T10:00:00Z"})
    assert r.status_code == 201
    assert r.json()["is_tag"] is False


@pytest.mark.asyncio
async def test_is_tag_true_roundtrips(alice_client: AsyncClient) -> None:
    r = await alice_client.post("/api/v1/workouts", json=_workout(is_tag=True))
    assert r.status_code == 201
    assert r.json()["is_tag"] is True


@pytest.mark.asyncio
async def test_is_tag_present_in_list(alice_client: AsyncClient) -> None:
    await alice_client.post("/api/v1/workouts", json=_workout(is_tag=True))
    await alice_client.post("/api/v1/workouts", json=_workout(is_tag=False))

    r = await alice_client.get("/api/v1/workouts")
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) == 2
    tag_flags = {item["is_tag"] for item in items}
    assert tag_flags == {True, False}


@pytest.mark.asyncio
async def test_is_tag_present_in_detail(alice_client: AsyncClient) -> None:
    create_r = await alice_client.post("/api/v1/workouts", json=_workout(is_tag=True))
    workout_id = create_r.json()["id"]

    r = await alice_client.get(f"/api/v1/workouts/{workout_id}")
    assert r.status_code == 200
    assert r.json()["is_tag"] is True


@pytest.mark.asyncio
async def test_is_tag_false_is_not_a_tag(alice_client: AsyncClient) -> None:
    r = await alice_client.post("/api/v1/workouts", json=_workout(is_tag=False))
    assert r.status_code == 201
    assert r.json()["is_tag"] is False
