"""Integration tests for /api/v1/profile and /api/v1/training-partners (POST)."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_profile_requires_auth(anon_client: AsyncClient) -> None:
    r = await anon_client.get("/api/v1/profile")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_get_profile_returns_profile(alice_client: AsyncClient) -> None:
    r = await alice_client.get("/api/v1/profile")
    assert r.status_code == 200
    body = r.json()
    assert "weight_unit" in body
    assert body["weight_unit"] in ("kg", "lb")
    assert "frequency_target_days" in body
    assert "graph_colour_mode" in body
    assert "checkin_enabled" in body
    assert "timezone" in body


@pytest.mark.asyncio
async def test_get_profile_stats_requires_auth(anon_client: AsyncClient) -> None:
    r = await anon_client.get("/api/v1/profile/stats")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_get_profile_stats_returns_stats(alice_client: AsyncClient) -> None:
    r = await alice_client.get("/api/v1/profile/stats")
    assert r.status_code == 200
    body = r.json()
    assert "total_workouts" in body
    assert "total_prs" in body
    assert "best_streak_weeks" in body
    assert "movements_tracked" in body
    assert body["total_workouts"] >= 0
    assert body["best_streak_weeks"] >= 0


@pytest.mark.asyncio
async def test_patch_profile_requires_auth(anon_client: AsyncClient) -> None:
    r = await anon_client.patch("/api/v1/profile", json={"frequency_target_days": 4})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_patch_profile_frequency_target(alice_client: AsyncClient) -> None:
    r = await alice_client.patch("/api/v1/profile", json={"frequency_target_days": 5})
    assert r.status_code == 200
    assert r.json()["frequency_target_days"] == 5

    # Verify persisted
    r2 = await alice_client.get("/api/v1/profile")
    assert r2.status_code == 200
    assert r2.json()["frequency_target_days"] == 5


@pytest.mark.asyncio
async def test_patch_profile_weight_unit(alice_client: AsyncClient) -> None:
    r = await alice_client.patch("/api/v1/profile", json={"weight_unit": "lb"})
    assert r.status_code == 200
    assert r.json()["weight_unit"] == "lb"

    r2 = await alice_client.get("/api/v1/profile")
    assert r2.json()["weight_unit"] == "lb"


@pytest.mark.asyncio
async def test_patch_profile_no_fields_is_noop(alice_client: AsyncClient) -> None:
    r_before = await alice_client.get("/api/v1/profile")
    assert r_before.status_code == 200
    before = r_before.json()

    r = await alice_client.patch("/api/v1/profile", json={})
    assert r.status_code == 200
    # All fields unchanged
    assert r.json()["frequency_target_days"] == before["frequency_target_days"]
    assert r.json()["weight_unit"] == before["weight_unit"]


@pytest.mark.asyncio
async def test_add_training_partner_requires_auth(anon_client: AsyncClient) -> None:
    r = await anon_client.post("/api/v1/training-partners", json={"email": "bob@test.local"})
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_add_training_partner_not_found(alice_client: AsyncClient) -> None:
    r = await alice_client.post(
        "/api/v1/training-partners", json={"email": "nobody@nowhere.invalid"}
    )
    assert r.status_code == 404
