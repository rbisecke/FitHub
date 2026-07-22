"""Integration tests for team sessions API."""

from __future__ import annotations

import uuid
from typing import Any

import pytest
from httpx import AsyncClient

from tests.conftest import ALICE_ID, BOB_ID

_PERFORMED_AT = "2026-06-19T09:00:00Z"
_TS_BASE = {"performed_at": _PERFORMED_AT, "name": "Partner Helen"}


def _pid(
    ts: dict[str, Any], *, user_id: uuid.UUID | None = None, guest_name: str | None = None
) -> str:
    """Find a participant row's surrogate id in a TeamSession JSON response."""
    for p in ts["participants"]:
        if user_id is not None and p["user_id"] == str(user_id):
            return p["id"]  # type: ignore[no-any-return]
        if guest_name is not None and p["guest_name"] == guest_name:
            return p["id"]  # type: ignore[no-any-return]
    raise AssertionError("participant not found in team session response")


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
    ts = (await alice_client.post("/api/v1/team-sessions", json=payload)).json()
    ts_id = ts["id"]
    bob_pid = _pid(ts, user_id=BOB_ID)

    r = await bob_client.delete(f"/api/v1/team-sessions/{ts_id}/participants/{bob_pid}")
    assert r.status_code == 204

    ts2 = (await alice_client.get(f"/api/v1/team-sessions/{ts_id}")).json()
    user_ids = [p["user_id"] for p in ts2["participants"] if p["user_id"]]
    assert str(BOB_ID) not in user_ids


@pytest.mark.asyncio
async def test_non_creator_removes_other_403(
    alice_client: AsyncClient, bob_client: AsyncClient
) -> None:
    payload = {**_TS_BASE, "participants": [{"user_id": str(BOB_ID)}]}
    ts = (await alice_client.post("/api/v1/team-sessions", json=payload)).json()
    ts_id = ts["id"]
    alice_pid = _pid(ts, user_id=ALICE_ID)

    # Bob tries to remove Alice (the creator) — should 403
    r = await bob_client.delete(f"/api/v1/team-sessions/{ts_id}/participants/{alice_pid}")
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
    ts = (await alice_client.post("/api/v1/team-sessions", json=payload)).json()
    ts_id = ts["id"]
    bob_pid = _pid(ts, user_id=BOB_ID)

    # Bob links own workout
    r = await bob_client.patch(
        f"/api/v1/team-sessions/{ts_id}/participants/{bob_pid}",
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
    ts = (await alice_client.post("/api/v1/team-sessions", json=payload)).json()
    ts_id = ts["id"]
    alice_pid = _pid(ts, user_id=ALICE_ID)

    # Bob tries to patch Alice's participant row — should 403
    r = await bob_client.patch(
        f"/api/v1/team-sessions/{ts_id}/participants/{alice_pid}",
        json={"role": "hacker"},
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_patch_participant_unknown_id_404(alice_client: AsyncClient) -> None:
    """A participant_id that doesn't exist in this session 404s, not 403 — IDOR
    prevention: existence of a participant row is never revealed to a caller
    without access to it."""
    ts_id = (await alice_client.post("/api/v1/team-sessions", json=_TS_BASE)).json()["id"]
    r = await alice_client.patch(
        f"/api/v1/team-sessions/{ts_id}/participants/{uuid.uuid4()}",
        json={"role": "anchor"},
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_patch_guest_participant_by_creator(alice_client: AsyncClient) -> None:
    """A guest participant (user_id IS NULL) has no user_id to key requests by —
    only the creator can address it, and only via its surrogate participant_id."""
    payload = {**_TS_BASE, "participants": [{"guest_name": "Charlie"}]}
    ts = (await alice_client.post("/api/v1/team-sessions", json=payload)).json()
    ts_id = ts["id"]
    guest_pid = _pid(ts, guest_name="charlie")

    r = await alice_client.patch(
        f"/api/v1/team-sessions/{ts_id}/participants/{guest_pid}",
        json={"role": "anchor"},
    )
    assert r.status_code == 200
    guest = next(p for p in r.json()["participants"] if p["id"] == guest_pid)
    assert guest["role"] == "anchor"


@pytest.mark.asyncio
async def test_remove_guest_participant_by_creator(alice_client: AsyncClient) -> None:
    payload = {**_TS_BASE, "participants": [{"guest_name": "Charlie"}]}
    ts = (await alice_client.post("/api/v1/team-sessions", json=payload)).json()
    ts_id = ts["id"]
    guest_pid = _pid(ts, guest_name="charlie")

    r = await alice_client.delete(f"/api/v1/team-sessions/{ts_id}/participants/{guest_pid}")
    assert r.status_code == 204

    ts2 = (await alice_client.get(f"/api/v1/team-sessions/{ts_id}")).json()
    remaining_ids = [p["id"] for p in ts2["participants"]]
    assert guest_pid not in remaining_ids


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
    ts = ts_r.json()
    ts_id = ts["id"]
    alice_pid = _pid(ts, user_id=ALICE_ID)

    # Link Alice's workout to her participant row
    await alice_client.patch(
        f"/api/v1/team-sessions/{ts_id}/participants/{alice_pid}",
        json={"workout_id": workout_id},
    )

    r = await alice_client.get(f"/api/v1/workouts/{workout_id}/team-session")
    assert r.status_code == 404  # workout.team_session_id not set yet — expected


@pytest.mark.asyncio
async def test_relink_workout_clears_stale_participant_reference(
    alice_client: AsyncClient, bob_client: AsyncClient
) -> None:
    """A workout can only be linked to one participant row at a time (BG-09).

    Linking it to a second session's participant row must clear the first
    session's stale reference in the same transaction as the new link — never
    leaving both rows pointing at the same workout.
    """
    workout_r = await bob_client.post(
        "/api/v1/workouts",
        json={"performed_at": _PERFORMED_AT, "session_type": "metcon"},
    )
    assert workout_r.status_code == 201
    workout_id = workout_r.json()["id"]

    # Session A: Bob links his workout to his own participant row.
    payload_a = {**_TS_BASE, "participants": [{"user_id": str(BOB_ID)}]}
    ts_a = (await alice_client.post("/api/v1/team-sessions", json=payload_a)).json()
    ts_a_id = ts_a["id"]
    bob_pid_a = _pid(ts_a, user_id=BOB_ID)
    link_a = await bob_client.patch(
        f"/api/v1/team-sessions/{ts_a_id}/participants/{bob_pid_a}",
        json={"workout_id": workout_id},
    )
    assert link_a.status_code == 200

    # Session B: Bob links the SAME workout to a different participant row.
    payload_b = {**_TS_BASE, "participants": [{"user_id": str(BOB_ID)}]}
    ts_b = (await alice_client.post("/api/v1/team-sessions", json=payload_b)).json()
    ts_b_id = ts_b["id"]
    bob_pid_b = _pid(ts_b, user_id=BOB_ID)
    link_b = await bob_client.patch(
        f"/api/v1/team-sessions/{ts_b_id}/participants/{bob_pid_b}",
        json={"workout_id": workout_id},
    )
    assert link_b.status_code == 200
    bob_b = next(p for p in link_b.json()["participants"] if p["id"] == bob_pid_b)
    assert bob_b["workout_id"] == workout_id

    # Session A's participant row must now show workout_id: null — the stale
    # reference was actually cleared, not left dangling.
    ts_a_after = (await alice_client.get(f"/api/v1/team-sessions/{ts_a_id}")).json()
    bob_a_after = next(p for p in ts_a_after["participants"] if p["id"] == bob_pid_a)
    assert bob_a_after["workout_id"] is None


@pytest.mark.asyncio
async def test_create_with_creator_workout_id_links_workout(alice_client: AsyncClient) -> None:
    """Creating a team session with workout_id stamps workouts.team_session_id."""
    workout_r = await alice_client.post(
        "/api/v1/workouts",
        json={"performed_at": _PERFORMED_AT, "session_type": "metcon"},
    )
    assert workout_r.status_code == 201
    workout_id = workout_r.json()["id"]

    ts_r = await alice_client.post(
        "/api/v1/team-sessions",
        json={**_TS_BASE, "workout_id": workout_id},
    )
    assert ts_r.status_code == 201
    ts_id = ts_r.json()["id"]

    # The workout should now be linked — get_workout_team_session returns the session
    r = await alice_client.get(f"/api/v1/workouts/{workout_id}/team-session")
    assert r.status_code == 200
    assert r.json()["id"] == ts_id


@pytest.mark.asyncio
async def test_participants_include_display_name(
    alice_client: AsyncClient, bob_client: AsyncClient
) -> None:
    """TeamSessionParticipant objects now include display_name from profiles."""
    payload = {**_TS_BASE, "participants": [{"user_id": str(BOB_ID)}, {"guest_name": "Charlie"}]}
    r = await alice_client.post("/api/v1/team-sessions", json=payload)
    assert r.status_code == 201
    ts_id = r.json()["id"]

    r2 = await alice_client.get(f"/api/v1/team-sessions/{ts_id}")
    assert r2.status_code == 200
    participants = r2.json()["participants"]
    # Every participant should have display_name set
    for p in participants:
        assert "display_name" in p
    # Guest participant's display_name matches guest_name
    guest = next(p for p in participants if p["guest_name"] is not None)
    assert guest["display_name"] == "charlie"  # normalised


@pytest.mark.asyncio
async def test_workout_summary_includes_team_session_id(alice_client: AsyncClient) -> None:
    """WorkoutSummary now exposes team_session_id so the history card can show the team icon."""
    workout_r = await alice_client.post(
        "/api/v1/workouts",
        json={"performed_at": _PERFORMED_AT, "session_type": "metcon"},
    )
    workout_id = workout_r.json()["id"]

    # Before linking: team_session_id is null in the list
    list_r = await alice_client.get("/api/v1/workouts")
    assert list_r.status_code == 200
    summary = next(w for w in list_r.json()["items"] if w["id"] == workout_id)
    assert summary["team_session_id"] is None

    # Create team session and link creator's workout
    ts_r = await alice_client.post(
        "/api/v1/team-sessions",
        json={**_TS_BASE, "workout_id": workout_id},
    )
    ts_id = ts_r.json()["id"]

    # After linking: team_session_id is set in the list
    list_r2 = await alice_client.get("/api/v1/workouts")
    summary2 = next(w for w in list_r2.json()["items"] if w["id"] == workout_id)
    assert summary2["team_session_id"] == ts_id


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


@pytest.mark.asyncio
async def test_patch_participant_notifies_on_later_link_by_other_actor(
    alice_client: AsyncClient, bob_client: AsyncClient
) -> None:
    """BG-15: linking a workout onto someone else's participant row via PATCH
    (not at creation/add time) must fire team_session_linked for them."""
    workout_r = await bob_client.post(
        "/api/v1/workouts",
        json={"performed_at": _PERFORMED_AT, "session_type": "metcon"},
    )
    workout_id = workout_r.json()["id"]

    payload = {**_TS_BASE, "participants": [{"user_id": str(BOB_ID)}]}
    ts = (await alice_client.post("/api/v1/team-sessions", json=payload)).json()
    ts_id = ts["id"]
    bob_pid = _pid(ts, user_id=BOB_ID)

    # Alice (creator, not Bob) links Bob's workout on his behalf.
    r = await alice_client.patch(
        f"/api/v1/team-sessions/{ts_id}/participants/{bob_pid}",
        json={"workout_id": workout_id},
    )
    assert r.status_code == 200

    notifs_r = await bob_client.get("/api/v1/notifications")
    assert notifs_r.status_code == 200
    types = [n["type"] for n in notifs_r.json()]
    assert "team_session_linked" in types


@pytest.mark.asyncio
async def test_patch_participant_self_link_does_not_notify(
    alice_client: AsyncClient, bob_client: AsyncClient
) -> None:
    """Self-links never generate a notification — only someone else's action
    touching your session data should notify you."""
    workout_r = await bob_client.post(
        "/api/v1/workouts",
        json={"performed_at": _PERFORMED_AT, "session_type": "metcon"},
    )
    workout_id = workout_r.json()["id"]

    payload = {**_TS_BASE, "participants": [{"user_id": str(BOB_ID)}]}
    ts = (await alice_client.post("/api/v1/team-sessions", json=payload)).json()
    ts_id = ts["id"]
    bob_pid = _pid(ts, user_id=BOB_ID)

    # Bob links his own workout to his own participant row.
    r = await bob_client.patch(
        f"/api/v1/team-sessions/{ts_id}/participants/{bob_pid}",
        json={"workout_id": workout_id},
    )
    assert r.status_code == 200

    notifs_r = await bob_client.get("/api/v1/notifications")
    assert notifs_r.status_code == 200
    types = [n["type"] for n in notifs_r.json()]
    assert "team_session_linked" not in types


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
