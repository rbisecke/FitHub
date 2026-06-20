"""Integration tests for GET /api/v1/analytics/volume-trend."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient


def _workout(days_ago: int, session_type: str = "strength") -> dict:
    dt = datetime.now(UTC) - timedelta(days=days_ago)
    return {
        "performed_at": dt.strftime("%Y-%m-%dT12:00:00Z"),
        "session_type": session_type,
        "session_rpe": 5.0,
        "duration_s": 3600,
    }


@pytest.mark.asyncio
async def test_volume_no_workouts(alice_client: AsyncClient) -> None:
    r = await alice_client.get("/api/v1/analytics/volume-trend?weeks=12")
    assert r.status_code == 200
    body = r.json()
    assert body["weeks"] == []


@pytest.mark.asyncio
async def test_volume_two_session_types(alice_client: AsyncClient) -> None:
    # 2 workouts this week, different session types
    for session_type in ("strength", "metcon"):
        resp = await alice_client.post("/api/v1/workouts", json=_workout(1, session_type))
        assert resp.status_code == 201

    r = await alice_client.get("/api/v1/analytics/volume-trend?weeks=4")
    assert r.status_code == 200
    weeks = r.json()["weeks"]
    assert len(weeks) >= 1
    types = {w["session_type"] for w in weeks}
    assert "strength" in types
    assert "metcon" in types


@pytest.mark.asyncio
async def test_volume_weeks_filter(alice_client: AsyncClient) -> None:
    # 1 workout 2 weeks ago, 1 workout today
    await alice_client.post("/api/v1/workouts", json=_workout(14))
    await alice_client.post("/api/v1/workouts", json=_workout(0))

    r_wide = await alice_client.get("/api/v1/analytics/volume-trend?weeks=4")
    r_narrow = await alice_client.get("/api/v1/analytics/volume-trend?weeks=1")
    assert r_wide.status_code == 200
    assert r_narrow.status_code == 200
    # Narrow window should have fewer or equal rows than wide
    assert len(r_narrow.json()["weeks"]) <= len(r_wide.json()["weeks"])


@pytest.mark.asyncio
async def test_volume_requires_auth(anon_client: AsyncClient) -> None:
    r = await anon_client.get("/api/v1/analytics/volume-trend")
    assert r.status_code == 401
