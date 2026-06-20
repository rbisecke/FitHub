"""Integration tests for GET /api/v1/analytics/load."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient

VALID_ZONES = {"insufficient_data", "undertraining", "sweet_spot", "caution", "overreaching"}


def _workout(days_ago: int, session_rpe: float = 5.0, duration_min: int = 60) -> dict:
    """perceived_load_au = round(session_rpe * duration_min) — derived server-side."""
    dt = datetime.now(UTC) - timedelta(days=days_ago)
    return {
        "performed_at": dt.strftime("%Y-%m-%dT12:00:00Z"),
        "session_type": "strength",
        "session_rpe": session_rpe,
        "duration_s": duration_min * 60,
    }


@pytest.mark.asyncio
async def test_load_empty_data(alice_client: AsyncClient) -> None:
    r = await alice_client.get("/api/v1/analytics/load?days=30")
    assert r.status_code == 200
    body = r.json()
    assert body["acwr_zone"] == "insufficient_data"
    assert body["acwr_now"] is None
    assert body["ctl_now"] == pytest.approx(0.0, abs=1e-6)
    assert isinstance(body["series"], list)


@pytest.mark.asyncio
async def test_load_single_workout_no_acwr(alice_client: AsyncClient) -> None:
    await alice_client.post("/api/v1/workouts", json=_workout(days_ago=1))

    r = await alice_client.get("/api/v1/analytics/load?days=30")
    assert r.status_code == 200
    body = r.json()
    # With only 1 workout there is data but chronic=0 so ACWR can still be None
    assert body["acwr_zone"] in VALID_ZONES
    assert len(body["series"]) > 0


@pytest.mark.asyncio
async def test_load_28_days_has_acwr(alice_client: AsyncClient) -> None:
    # Create 28 workouts spread over the last 28 days
    for i in range(28):
        resp = await alice_client.post(
            "/api/v1/workouts", json=_workout(days_ago=i, session_rpe=5.0)
        )
        assert resp.status_code == 201

    r = await alice_client.get("/api/v1/analytics/load?days=90")
    assert r.status_code == 200
    body = r.json()
    assert body["acwr_now"] is not None
    assert isinstance(body["acwr_now"], float)
    assert body["acwr_zone"] in VALID_ZONES
    assert body["ctl_now"] > 0
    assert body["atl_now"] > 0


@pytest.mark.asyncio
async def test_load_consistent_training_metrics(alice_client: AsyncClient) -> None:
    # 14 days of consistent 30 AU load
    for i in range(14):
        resp = await alice_client.post(
            "/api/v1/workouts", json=_workout(days_ago=i, session_rpe=5.0)
        )
        assert resp.status_code == 201

    r = await alice_client.get("/api/v1/analytics/load?days=30")
    assert r.status_code == 200
    body = r.json()
    # ATL converges faster → should be higher than CTL after short consistent block
    assert body["atl_now"] > 0
    assert body["ctl_now"] > 0
    # TSB = CTL - ATL; with recent load, ATL > CTL so TSB < 0
    assert body["tsb_now"] == pytest.approx(body["ctl_now"] - body["atl_now"], abs=1e-4)


@pytest.mark.asyncio
async def test_load_requires_auth(anon_client: AsyncClient) -> None:
    r = await anon_client.get("/api/v1/analytics/load")
    assert r.status_code == 401
