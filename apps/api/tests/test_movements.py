"""Integration tests for /api/v1/movements."""

from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_movements_requires_auth(anon_client: AsyncClient) -> None:
    r = await anon_client.get("/api/v1/movements")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_list_movements_returns_list(alice_client: AsyncClient) -> None:
    r = await alice_client.get("/api/v1/movements")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


@pytest.mark.asyncio
async def test_create_movement_requires_auth(anon_client: AsyncClient) -> None:
    r = await anon_client.post(
        "/api/v1/movements",
        json={"name": "Test", "slug": "test", "base_movement": "Test", "modality": "strength"},
    )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_create_custom_movement(alice_client: AsyncClient) -> None:
    uid = uuid.uuid4().hex[:8]
    payload = {
        "name": f"Custom Move {uid}",
        "slug": f"custom-move-{uid}",
        "base_movement": "Custom Move",
        "modality": "strength",
        "default_result_types": ["weight", "reps"],
    }
    r = await alice_client.post("/api/v1/movements", json=payload)
    assert r.status_code == 201
    body = r.json()
    assert body["name"] == payload["name"]
    assert body["slug"] == payload["slug"]
    assert body["is_official"] is False
    assert body["default_result_types"] == ["weight", "reps"]


@pytest.mark.asyncio
async def test_create_movement_with_new_fields(alice_client: AsyncClient) -> None:
    """New Phase 2 fields (tempo, pause_position, execution_style, etc.) round-trip correctly."""
    uid = uuid.uuid4().hex[:8]
    payload = {
        "name": f"Tempo Pause Squat {uid}",
        "slug": f"tempo-pause-squat-{uid}",
        "base_movement": "Back Squat",
        "modality": "strength",
        "pause_position": "bottom",
        "tempo": "5310",
        "execution_style": "strict",
        "movement_pattern": "squat",
        "limb_style": "bilateral",
    }
    r = await alice_client.post("/api/v1/movements", json=payload)
    assert r.status_code == 201
    body = r.json()
    assert body["pause_position"] == "bottom"
    assert body["tempo"] == "5310"
    assert body["execution_style"] == "strict"
    assert body["movement_pattern"] == "squat"
    assert body["limb_style"] == "bilateral"


@pytest.mark.asyncio
async def test_create_movement_invalid_tempo_rejected(alice_client: AsyncClient) -> None:
    """Tempo must match Poliquin 4-digit pattern; invalid values are rejected at the API."""
    uid = uuid.uuid4().hex[:8]
    payload = {
        "name": f"Bad Tempo Move {uid}",
        "slug": f"bad-tempo-{uid}",
        "base_movement": "Squat",
        "modality": "strength",
        "tempo": "FAST",  # not a valid Poliquin tempo
    }
    r = await alice_client.post("/api/v1/movements", json=payload)
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_create_movement_duplicate_slug_is_conflict(alice_client: AsyncClient) -> None:
    uid = uuid.uuid4().hex[:8]
    payload = {
        "name": f"Move {uid}",
        "slug": f"move-{uid}",
        "base_movement": "Move",
        "modality": "gymnastics",
    }
    r1 = await alice_client.post("/api/v1/movements", json=payload)
    assert r1.status_code == 201

    payload["name"] = f"Move Dupe {uid}"  # different name, same slug
    r2 = await alice_client.post("/api/v1/movements", json=payload)
    assert r2.status_code == 409
