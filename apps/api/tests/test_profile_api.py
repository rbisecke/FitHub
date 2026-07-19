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
async def test_get_profile_exposes_goal_and_equipment_fields(
    alice_client: AsyncClient,
) -> None:
    """New onboarding/AI-input fields are present (null for a fresh profile)."""
    r = await alice_client.get("/api/v1/profile")
    assert r.status_code == 200
    body = r.json()
    assert "primary_goal" in body
    assert "equipment_access" in body


@pytest.mark.asyncio
async def test_patch_profile_primary_goal(alice_client: AsyncClient) -> None:
    r = await alice_client.patch("/api/v1/profile", json={"primary_goal": "build_strength"})
    assert r.status_code == 200
    assert r.json()["primary_goal"] == "build_strength"

    r2 = await alice_client.get("/api/v1/profile")
    assert r2.json()["primary_goal"] == "build_strength"


@pytest.mark.asyncio
async def test_patch_profile_rejects_unknown_goal(alice_client: AsyncClient) -> None:
    r = await alice_client.patch("/api/v1/profile", json={"primary_goal": "get_swole"})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_patch_profile_equipment_access(alice_client: AsyncClient) -> None:
    r = await alice_client.patch(
        "/api/v1/profile", json={"equipment_access": ["barbell", "dumbbells"]}
    )
    assert r.status_code == 200
    assert r.json()["equipment_access"] == ["barbell", "dumbbells"]

    r2 = await alice_client.get("/api/v1/profile")
    assert r2.json()["equipment_access"] == ["barbell", "dumbbells"]


@pytest.mark.asyncio
async def test_patch_profile_equipment_none_is_exclusive(alice_client: AsyncClient) -> None:
    """'none' (bodyweight only) cannot be combined with real equipment."""
    r = await alice_client.patch("/api/v1/profile", json={"equipment_access": ["none", "barbell"]})
    assert r.status_code == 422

    # 'none' alone is valid.
    r2 = await alice_client.patch("/api/v1/profile", json={"equipment_access": ["none"]})
    assert r2.status_code == 200
    assert r2.json()["equipment_access"] == ["none"]


@pytest.mark.asyncio
async def test_patch_profile_equipment_empty_rejected(alice_client: AsyncClient) -> None:
    """An empty array is not a valid answer — NULL means unanswered instead."""
    r = await alice_client.patch("/api/v1/profile", json={"equipment_access": []})
    assert r.status_code == 422


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


@pytest.mark.asyncio
async def test_search_users_requires_auth(anon_client: AsyncClient) -> None:
    r = await anon_client.get("/api/v1/profile/search?q=alice")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_search_users_returns_list(alice_client: AsyncClient) -> None:
    r = await alice_client.get("/api/v1/profile/search?q=bob")
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body, list)
    # Each result has the expected fields (email is not returned, by design)
    for item in body:
        assert "user_id" in item
        assert "display_name" in item
        assert "email" not in item


@pytest.mark.asyncio
async def test_search_users_min_length(alice_client: AsyncClient) -> None:
    """Query shorter than 2 chars should be rejected with 422."""
    r = await alice_client.get("/api/v1/profile/search?q=a")
    assert r.status_code == 422
