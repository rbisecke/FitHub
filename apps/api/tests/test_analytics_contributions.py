"""Integration tests for GET /api/v1/analytics/contributions."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient


def _workout(days_ago: int) -> dict:
    dt = datetime.now(UTC) - timedelta(days=days_ago)
    return {
        "performed_at": dt.strftime("%Y-%m-%dT12:00:00Z"),
        "session_type": "strength",
        "session_rpe": 6.0,
        "duration_s": 3600,
    }


@pytest.mark.asyncio
async def test_contributions_unauthenticated(anon_client: AsyncClient) -> None:
    r = await anon_client.get("/api/v1/analytics/contributions")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_contributions_empty(alice_client: AsyncClient) -> None:
    r = await alice_client.get("/api/v1/analytics/contributions")
    assert r.status_code == 200
    body = r.json()
    assert body["days"] == []
    assert body["total_workouts"] == 0


@pytest.mark.asyncio
async def test_contributions_counts_workouts(alice_client: AsyncClient) -> None:
    await alice_client.post("/api/v1/workouts", json=_workout(days_ago=1))
    await alice_client.post("/api/v1/workouts", json=_workout(days_ago=3))

    r = await alice_client.get("/api/v1/analytics/contributions")
    assert r.status_code == 200
    body = r.json()
    assert body["total_workouts"] == 2
    assert len(body["days"]) == 2
    for pt in body["days"]:
        assert pt["count"] >= 1
        assert pt["load_au"] >= 0.0


@pytest.mark.asyncio
async def test_contributions_isolated_from_other_user(
    alice_client: AsyncClient, bob_client: AsyncClient
) -> None:
    await alice_client.post("/api/v1/workouts", json=_workout(days_ago=1))

    r = await bob_client.get("/api/v1/analytics/contributions")
    assert r.status_code == 200
    assert r.json()["total_workouts"] == 0
