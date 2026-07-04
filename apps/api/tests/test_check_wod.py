"""Tests for POST /api/v1/coach/check-wod."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_check_wod_no_injuries_all_safe(alice_client: AsyncClient) -> None:
    r = await alice_client.post(
        "/api/v1/coach/check-wod",
        json={"wod_text": "21-15-9 thrusters and pull-ups"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["any_referral_required"] is False
    assert data["referral_regions"] == []
    # At least one movement should be detected
    assert len(data["movements_found"]) > 0
    for result in data["results"]:
        assert result["safe"] is True


@pytest.mark.asyncio
async def test_check_wod_with_knee_injury_flags_contraindicated(alice_client: AsyncClient) -> None:
    # Report a knee injury first
    await alice_client.post(
        "/api/v1/injuries",
        json={"body_region": "knee", "pain_level": 5, "notes": "sore"},
    )
    r = await alice_client.post(
        "/api/v1/coach/check-wod",
        json={"wod_text": "5 rounds: 10 thrusters, 20 double unders, 400m run"},
    )
    assert r.status_code == 200
    data = r.json()
    unsafe_names = {res["movement"] for res in data["results"] if not res["safe"]}
    assert len(unsafe_names) > 0
    # At least one of the knee-contraindicated movements should be flagged
    assert any(m in unsafe_names for m in ("thruster", "double_under", "running"))


@pytest.mark.asyncio
async def test_check_wod_requires_auth(anon_client: AsyncClient) -> None:
    r = await anon_client.post(
        "/api/v1/coach/check-wod",
        json={"wod_text": "21-15-9 thrusters"},
    )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_check_wod_empty_text_rejected(alice_client: AsyncClient) -> None:
    r = await alice_client.post(
        "/api/v1/coach/check-wod",
        json={"wod_text": ""},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_check_wod_unknown_movements_returns_empty_found(alice_client: AsyncClient) -> None:
    r = await alice_client.post(
        "/api/v1/coach/check-wod",
        json={"wod_text": "10 rounds of yoga and pilates"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["movements_found"] == []
    assert data["results"] == []
