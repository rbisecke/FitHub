"""Integration tests for POST /api/v1/wellness/checkin and GET today."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_checkin_unauthenticated(anon_client: AsyncClient) -> None:
    r = await anon_client.post(
        "/api/v1/wellness/checkin",
        json={"sleep": 3, "stress": 3, "fatigue": 3, "soreness": 3},
    )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_checkin_today_unauthenticated(anon_client: AsyncClient) -> None:
    r = await anon_client.get("/api/v1/wellness/checkin/today")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_checkin_invalid_range(alice_client: AsyncClient) -> None:
    r = await alice_client.post(
        "/api/v1/wellness/checkin",
        json={"sleep": 0, "stress": 3, "fatigue": 3, "soreness": 3},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_checkin_and_retrieve_today(alice_client: AsyncClient) -> None:
    body = {"sleep": 2, "stress": 4, "fatigue": 5, "soreness": 3}
    r = await alice_client.post("/api/v1/wellness/checkin", json=body)
    assert r.status_code == 200
    data = r.json()
    assert data["sleep"] == 2
    assert data["stress"] == 4
    assert data["fatigue"] == 5
    assert data["soreness"] == 3
    assert data["hooper_index"] == 14  # 2+4+5+3

    # Retrieve today
    r2 = await alice_client.get("/api/v1/wellness/checkin/today")
    assert r2.status_code == 200
    today_data = r2.json()
    assert today_data["submitted"] is True
    assert today_data["checkin"]["hooper_index"] == 14


@pytest.mark.asyncio
async def test_checkin_today_not_submitted(alice_client: AsyncClient) -> None:
    r = await alice_client.get("/api/v1/wellness/checkin/today")
    assert r.status_code == 200
    data = r.json()
    assert data["submitted"] is False
    assert data["checkin"] is None


@pytest.mark.asyncio
async def test_checkin_upserts_same_day(alice_client: AsyncClient) -> None:
    await alice_client.post(
        "/api/v1/wellness/checkin",
        json={"sleep": 3, "stress": 3, "fatigue": 3, "soreness": 3},
    )
    r2 = await alice_client.post(
        "/api/v1/wellness/checkin",
        json={"sleep": 5, "stress": 5, "fatigue": 5, "soreness": 5},
    )
    assert r2.status_code == 200
    assert r2.json()["hooper_index"] == 20

    r3 = await alice_client.get("/api/v1/wellness/checkin/today")
    assert r3.json()["checkin"]["hooper_index"] == 20


@pytest.mark.asyncio
async def test_checkin_isolated_per_user(
    alice_client: AsyncClient, bob_client: AsyncClient
) -> None:
    """Alice's check-in should not appear in Bob's today response."""
    await alice_client.post(
        "/api/v1/wellness/checkin",
        json={"sleep": 2, "stress": 2, "fatigue": 2, "soreness": 2},
    )
    r = await bob_client.get("/api/v1/wellness/checkin/today")
    assert r.json()["submitted"] is False


@pytest.mark.asyncio
async def test_hooper_index_formula(alice_client: AsyncClient) -> None:
    """Verify hooper_index is the sum of all four values."""
    r = await alice_client.post(
        "/api/v1/wellness/checkin",
        json={"sleep": 1, "stress": 7, "fatigue": 4, "soreness": 6},
    )
    assert r.json()["hooper_index"] == 18  # 1+7+4+6
