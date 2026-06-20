"""Integration tests for GET /api/v1/analytics/readiness."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient

VALID_LABELS = {"optimal", "high_load", "fresh", "fatigued", "insufficient_data"}


@pytest.mark.asyncio
async def test_readiness_no_data(alice_client: AsyncClient) -> None:
    r = await alice_client.get("/api/v1/analytics/readiness")
    assert r.status_code == 200
    body = r.json()
    assert body["label"] == "insufficient_data"
    assert body["score"] == pytest.approx(0.5, abs=0.01)
    assert body["acwr"] is None


@pytest.mark.asyncio
async def test_readiness_with_training_data(alice_client: AsyncClient) -> None:
    # Seed 7 days of training
    for i in range(7):
        dt = datetime.now(UTC) - timedelta(days=i)
        await alice_client.post(
            "/api/v1/workouts",
            json={
                "performed_at": dt.strftime("%Y-%m-%dT12:00:00Z"),
                "session_type": "strength",
                "session_rpe": 5.0,
                "duration_s": 3600,
            },
        )

    r = await alice_client.get("/api/v1/analytics/readiness")
    assert r.status_code == 200
    body = r.json()
    assert body["label"] in VALID_LABELS
    assert 0.0 <= body["score"] <= 1.0
    assert isinstance(body["tsb"], float)


@pytest.mark.asyncio
async def test_readiness_requires_auth(anon_client: AsyncClient) -> None:
    r = await anon_client.get("/api/v1/analytics/readiness")
    assert r.status_code == 401
