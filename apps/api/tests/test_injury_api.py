"""Integration tests for the injuries API."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_report_injury_no_red_flags(alice_client: AsyncClient) -> None:
    r = await alice_client.post(
        "/api/v1/injuries",
        json={
            "body_region": "knee",
            "pain_level": 4,
            "mechanism": "overuse",
            "notes": "aches on squats",
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["requires_referral"] is False
    assert data["body_region"] == "knee"
    assert data["pain_level"] == 4


@pytest.mark.asyncio
async def test_report_injury_red_flag_pain(alice_client: AsyncClient) -> None:
    r = await alice_client.post(
        "/api/v1/injuries",
        json={"body_region": "shoulder", "pain_level": 9, "notes": None},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["requires_referral"] is True
    assert data["substitutions"] == []


@pytest.mark.asyncio
async def test_report_injury_red_flag_keyword(alice_client: AsyncClient) -> None:
    r = await alice_client.post(
        "/api/v1/injuries",
        json={"body_region": "knee", "pain_level": 5, "notes": "heard a pop and it locked up"},
    )
    assert r.status_code == 200
    assert r.json()["requires_referral"] is True


@pytest.mark.asyncio
async def test_report_injury_has_substitutions(alice_client: AsyncClient) -> None:
    r = await alice_client.post(
        "/api/v1/injuries",
        json={"body_region": "knee", "pain_level": 3, "notes": "mild ache"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["requires_referral"] is False
    assert isinstance(data["substitutions"], list)
    assert isinstance(data["contraindicated"], list)
    assert len(data["contraindicated"]) > 0


@pytest.mark.asyncio
async def test_list_injuries(alice_client: AsyncClient) -> None:
    await alice_client.post(
        "/api/v1/injuries",
        json={"body_region": "wrist", "pain_level": 3, "notes": None},
    )
    r = await alice_client.get("/api/v1/injuries")
    assert r.status_code == 200
    assert len(r.json()) >= 1


@pytest.mark.asyncio
async def test_injury_requires_auth(anon_client: AsyncClient) -> None:
    r = await anon_client.post(
        "/api/v1/injuries",
        json={"body_region": "knee", "pain_level": 3},
    )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_injury_invalid_region(alice_client: AsyncClient) -> None:
    r = await alice_client.post(
        "/api/v1/injuries",
        json={"body_region": "toe", "pain_level": 3},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_injury_pain_level_out_of_range(alice_client: AsyncClient) -> None:
    r = await alice_client.post(
        "/api/v1/injuries",
        json={"body_region": "knee", "pain_level": 11},
    )
    assert r.status_code == 422
