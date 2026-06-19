"""Integration tests for team sessions API."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from tests.conftest import ALICE_ID, BOB_ID

_PERFORMED_AT = "2026-06-19T09:00:00Z"
_TS_BASE = {"performed_at": _PERFORMED_AT, "name": "Partner Helen"}


# ── Auth ───────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_requires_auth(anon_client: AsyncClient) -> None:
    r = await anon_client.post("/api/v1/team-sessions", json=_TS_BASE)
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_list_requires_auth(anon_client: AsyncClient) -> None:
    r = await anon_client.get("/api/v1/team-sessions")
    assert r.status_code == 401


# ── Create ─────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_minimal(alice_client: AsyncClient) -> None:
    r = await alice_client.post("/api/v1/team-sessions", json=_TS_BASE)
    assert r.status_code == 201
    body = r.json()
    assert body["name"] == "Partner Helen"
    assert body["status"] == "completed"
    assert body["team_size"] == 2
    # Creator is auto-added as participant
    assert len(body["participants"]) == 1
    assert body["participants"][0]["user_id"] == str(ALICE_ID)


@pytest.mark.asyncio
async def test_create_with_guest(alice_client: AsyncClient) -> None:
    payload = {**_TS_BASE, "participants": [{"guest_name": "  Charlie  "}]}
    r = await alice_client.post("/api/v1/team-sessions", json=payload)
    assert r.status_code == 201
    guests = [p for p in r.json()["participants"] if p["guest_name"]]
    assert guests[0]["guest_name"] == "charlie"  # normalised lower().strip()


@pytest.mark.asyncio
async def test_create_sends_notification(
    alice_client: AsyncClient, bob_client: AsyncClient
) -> None:
    payload = {**_TS_BASE, "participants": [{"user_id": str(BOB_ID)}]}
    r = await alice_client.post("/api/v1/team-sessions", json=payload)
    assert r.status_code == 201

    notifs = await bob_client.get("/api/v1/notifications")
    assert notifs.status_code == 200
    types = [n["type"] for n in notifs.json()]
    assert "workout_link_pending" in types


@pytest.mark.asyncio
async def test_create_participant_without_identity_422(alice_client: AsyncClient) -> None:
    payload = {**_TS_BASE, "participants": [{"role": "anchor"}]}
    r = await alice_client.post("/api/v1/team-sessions", json=payload)
    assert r.status_code == 422


# ── List ───────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_as_creator(alice_client: AsyncClient) -> None:
    await alice_client.post("/api/v1/team-sessions", json=_TS_BASE)
    r = await alice_client.get("/api/v1/team-sessions")
    assert r.status_code == 200
    assert len(r.json()["items"]) == 1


@pytest.mark.asyncio
async def test_list_as_participant(alice_client: AsyncClient, bob_client: AsyncClient) -> None:
    payload = {**_TS_BASE, "participants": [{"user_id": str(BOB_ID)}]}
    await alice_client.post("/api/v1/team-sessions", json=payload)

    r = await bob_client.get("/api/v1/team-sessions")
    assert r.status_code == 200
    assert len(r.json()["items"]) == 1


# ── Get ────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_session(alice_client: AsyncClient) -> None:
    created = (await alice_client.post("/api/v1/team-sessions", json=_TS_BASE)).json()
    r = await alice_client.get(f"/api/v1/team-sessions/{created['id']}")
    assert r.status_code == 200
    assert r.json()["id"] == created["id"]


@pytest.mark.asyncio
async def test_get_session_idor_404(alice_client: AsyncClient, bob_client: AsyncClient) -> None:
    created = (await alice_client.post("/api/v1/team-sessions", json=_TS_BASE)).json()
    r = await bob_client.get(f"/api/v1/team-sessions/{created['id']}")
    assert r.status_code == 404  # not 403 — IDOR prevention


# ── Patch session ──────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_patch_session(alice_client: AsyncClient) -> None:
    ts_id = (await alice_client.post("/api/v1/team-sessions", json=_TS_BASE)).json()["id"]
    r = await alice_client.patch(f"/api/v1/team-sessions/{ts_id}", json={"name": "Updated Name"})
    assert r.status_code == 200
    assert r.json()["name"] == "Updated Name"


@pytest.mark.asyncio
async def test_patch_non_creator_404(alice_client: AsyncClient, bob_client: AsyncClient) -> None:
    ts_id = (await alice_client.post("/api/v1/team-sessions", json=_TS_BASE)).json()["id"]
    r = await bob_client.patch(f"/api/v1/team-sessions/{ts_id}", json={"name": "Hacked"})
    assert r.status_code == 404


# ── Delete session ─────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_delete_session(alice_client: AsyncClient) -> None:
    ts_id = (await alice_client.post("/api/v1/team-sessions", json=_TS_BASE)).json()["id"]
    r = await alice_client.delete(f"/api/v1/team-sessions/{ts_id}")
    assert r.status_code == 204
    r2 = await alice_client.get(f"/api/v1/team-sessions/{ts_id}")
    assert r2.status_code == 404


# ── Participants ───────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_add_participant(alice_client: AsyncClient) -> None:
    ts_id = (await alice_client.post("/api/v1/team-sessions", json=_TS_BASE)).json()["id"]
    r = await alice_client.post(
        f"/api/v1/team-sessions/{ts_id}/participants",
        json={"user_id": str(BOB_ID)},
    )
    assert r.status_code == 200
    user_ids = [p["user_id"] for p in r.json()["participants"]]
    assert str(BOB_ID) in user_ids


@pytest.mark.asyncio
async def test_add_participant_duplicate_409(alice_client: AsyncClient) -> None:
    ts_id = (await alice_client.post("/api/v1/team-sessions", json=_TS_BASE)).json()["id"]
    payload = {"user_id": str(BOB_ID)}
    await alice_client.post(f"/api/v1/team-sessions/{ts_id}/participants", json=payload)
    r = await alice_client.post(f"/api/v1/team-sessions/{ts_id}/participants", json=payload)
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_participant_opt_out(alice_client: AsyncClient, bob_client: AsyncClient) -> None:
    payload = {**_TS_BASE, "participants": [{"user_id": str(BOB_ID)}]}
    ts_id = (await alice_client.post("/api/v1/team-sessions", json=payload)).json()["id"]

    r = await bob_client.delete(f"/api/v1/team-sessions/{ts_id}/participants/{BOB_ID}")
    assert r.status_code == 204

    ts = (await alice_client.get(f"/api/v1/team-sessions/{ts_id}")).json()
    user_ids = [p["user_id"] for p in ts["participants"] if p["user_id"]]
    assert str(BOB_ID) not in user_ids


@pytest.mark.asyncio
async def test_non_creator_removes_other_403(
    alice_client: AsyncClient, bob_client: AsyncClient
) -> None:
    payload = {**_TS_BASE, "participants": [{"user_id": str(BOB_ID)}]}
    ts_id = (await alice_client.post("/api/v1/team-sessions", json=payload)).json()["id"]

    # Bob tries to remove Alice (the creator) — should 403
    r = await bob_client.delete(f"/api/v1/team-sessions/{ts_id}/participants/{ALICE_ID}")
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_patch_participant_link_workout(
    alice_client: AsyncClient, bob_client: AsyncClient
) -> None:
    # Bob creates a workout
    workout_r = await bob_client.post(
        "/api/v1/workouts",
        json={"performed_at": _PERFORMED_AT, "session_type": "metcon"},
    )
    assert workout_r.status_code == 201
    workout_id = workout_r.json()["id"]

    payload = {**_TS_BASE, "participants": [{"user_id": str(BOB_ID)}]}
    ts_id = (await alice_client.post("/api/v1/team-sessions", json=payload)).json()["id"]

    # Bob links own workout
    r = await bob_client.patch(
        f"/api/v1/team-sessions/{ts_id}/participants/{BOB_ID}",
        json={"workout_id": workout_id},
    )
    assert r.status_code == 200
    bob_part = next(p for p in r.json()["participants"] if p["user_id"] == str(BOB_ID))
    assert bob_part["workout_id"] == workout_id


@pytest.mark.asyncio
async def test_patch_participant_cross_user_403(
    alice_client: AsyncClient, bob_client: AsyncClient
) -> None:
    payload = {**_TS_BASE, "participants": [{"user_id": str(BOB_ID)}]}
    ts_id = (await alice_client.post("/api/v1/team-sessions", json=payload)).json()["id"]

    # Bob tries to patch Alice's participant row — should 403
    r = await bob_client.patch(
        f"/api/v1/team-sessions/{ts_id}/participants/{ALICE_ID}",
        json={"role": "hacker"},
    )
    assert r.status_code == 403


# ── Workout → team-session ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_workout_team_session(alice_client: AsyncClient) -> None:
    workout_r = await alice_client.post(
        "/api/v1/workouts",
        json={"performed_at": _PERFORMED_AT, "session_type": "metcon"},
    )
    assert workout_r.status_code == 201
    workout_id = workout_r.json()["id"]

    ts_r = await alice_client.post(
        "/api/v1/team-sessions",
        json={**_TS_BASE, "participants": [{"user_id": str(ALICE_ID), "workout_id": workout_id}]},
    )
    assert ts_r.status_code == 201
    ts_id = ts_r.json()["id"]

    # Link Alice's workout to her participant row
    await alice_client.patch(
        f"/api/v1/team-sessions/{ts_id}/participants/{ALICE_ID}",
        json={"workout_id": workout_id},
    )

    r = await alice_client.get(f"/api/v1/workouts/{workout_id}/team-session")
    assert r.status_code == 404  # workout.team_session_id not set yet — expected


# ── Training partners ──────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_training_partners_guest(alice_client: AsyncClient) -> None:
    for i in range(3):
        await alice_client.post(
            "/api/v1/team-sessions",
            json={
                "performed_at": f"2026-06-{10 + i:02d}T09:00:00Z",
                "participants": [{"guest_name": "charlie"}],
            },
        )
    r = await alice_client.get("/api/v1/training-partners")
    assert r.status_code == 200
    partners = r.json()
    charlie = next((p for p in partners if p["guest_name"] == "charlie"), None)
    assert charlie is not None
    assert charlie["session_count"] == 3


# ── Notifications ──────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_mark_notification_read(alice_client: AsyncClient, bob_client: AsyncClient) -> None:
    payload = {**_TS_BASE, "participants": [{"user_id": str(BOB_ID)}]}
    await alice_client.post("/api/v1/team-sessions", json=payload)

    notifs_r = await bob_client.get("/api/v1/notifications")
    assert notifs_r.status_code == 200
    notifs = notifs_r.json()
    assert len(notifs) > 0
    notif_id = notifs[0]["id"]
    assert notifs[0]["read_at"] is None

    r = await bob_client.post(f"/api/v1/notifications/{notif_id}/read")
    assert r.status_code == 200
    assert r.json()["read_at"] is not None


# ── Role suggestions ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_role_suggestions_empty(alice_client: AsyncClient) -> None:
    r = await alice_client.get("/api/v1/team-sessions/role-suggestions")
    assert r.status_code == 200
    assert r.json()["suggestions"] == []


@pytest.mark.asyncio
async def test_role_suggestions_populated(alice_client: AsyncClient) -> None:
    for i in range(2):
        await alice_client.post(
            "/api/v1/team-sessions",
            json={
                "performed_at": f"2026-06-{10 + i:02d}T09:00:00Z",
                "participants": [{"guest_name": "partner", "role": "anchor"}],
            },
        )
    r = await alice_client.get("/api/v1/team-sessions/role-suggestions")
    assert r.status_code == 200
    assert "anchor" in r.json()["suggestions"]
