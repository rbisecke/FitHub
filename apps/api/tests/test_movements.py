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


# ── /api/v1/movements/{movement_id}/last-result ───────────────────────────────

_MOVEMENT_BASE = {
    "base_movement": "Back Squat",
    "modality": "strength",
    "default_result_types": ["weight"],
}


def _movement_payload(uid: str) -> dict:
    return {"name": f"Back Squat {uid}", "slug": f"back-squat-{uid}", **_MOVEMENT_BASE}


@pytest.mark.asyncio
async def test_last_result_requires_auth(anon_client: AsyncClient) -> None:
    r = await anon_client.get(f"/api/v1/movements/{uuid.uuid4()}/last-result")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_last_result_404_when_no_history(alice_client: AsyncClient) -> None:
    uid = uuid.uuid4().hex[:8]
    mv = await alice_client.post("/api/v1/movements", json=_movement_payload(uid))
    assert mv.status_code == 201
    movement_id = mv.json()["id"]

    r = await alice_client.get(f"/api/v1/movements/{movement_id}/last-result")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_last_result_returns_most_recent(alice_client: AsyncClient) -> None:
    uid = uuid.uuid4().hex[:8]
    mv = await alice_client.post("/api/v1/movements", json=_movement_payload(uid))
    assert mv.status_code == 201
    movement_id = mv.json()["id"]

    # Older workout
    w1 = await alice_client.post(
        "/api/v1/workouts",
        json={
            "performed_at": "2026-01-01T08:00:00Z",
            "results": [
                {"movement_id": movement_id, "result_type": "weight", "load_kg": "80.0", "reps": 5}
            ],
        },
    )
    assert w1.status_code == 201

    # Newer workout — this is the one that should be returned
    w2 = await alice_client.post(
        "/api/v1/workouts",
        json={
            "performed_at": "2026-06-01T08:00:00Z",
            "results": [
                {"movement_id": movement_id, "result_type": "weight", "load_kg": "90.0", "reps": 3}
            ],
        },
    )
    assert w2.status_code == 201

    r = await alice_client.get(f"/api/v1/movements/{movement_id}/last-result")
    assert r.status_code == 200
    body = r.json()
    assert body["result_type"] == "weight"
    assert float(body["load_kg"]) == 90.0
    assert body["reps"] == 3
    assert body["performed_at"] == "2026-06-01"


@pytest.mark.asyncio
async def test_last_result_user_scoped(alice_client: AsyncClient, bob_client: AsyncClient) -> None:
    uid = uuid.uuid4().hex[:8]
    mv = await alice_client.post("/api/v1/movements", json=_movement_payload(uid))
    assert mv.status_code == 201
    movement_id = mv.json()["id"]

    # Alice logs a result for this movement
    w = await alice_client.post(
        "/api/v1/workouts",
        json={
            "performed_at": "2026-06-01T08:00:00Z",
            "results": [
                {"movement_id": movement_id, "result_type": "weight", "load_kg": "90.0", "reps": 5}
            ],
        },
    )
    assert w.status_code == 201

    # Bob has no history for that movement — must get 404, not Alice's data
    r = await bob_client.get(f"/api/v1/movements/{movement_id}/last-result")
    assert r.status_code == 404
