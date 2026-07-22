"""Integration tests for team sessions API."""

from __future__ import annotations

import uuid
from typing import Any

import pytest
from httpx import AsyncClient

from tests.conftest import ALICE_ID, BOB_ID

_PERFORMED_AT = "2026-06-19T09:00:00Z"
_TS_BASE = {"performed_at": _PERFORMED_AT, "name": "Partner Helen"}


async def _display_name(client: AsyncClient) -> str:
    """Fetch the caller's current display_name — used instead of a hardcoded
    literal so notification-payload assertions aren't coupled to whatever
    display_name happens to be seeded in the local dev DB."""
    r = await client.get("/api/v1/profile")
    assert r.status_code == 200
    return r.json()["display_name"]  # type: ignore[no-any-return]


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
    assert body["status"] == "active"
    assert body["team_size"] == 2
    # Creator is auto-added as participant
    assert len(body["participants"]) == 1
    assert body["participants"][0]["user_id"] == str(ALICE_ID)


@pytest.mark.asyncio
async def test_create_explicit_status_completed_honored(alice_client: AsyncClient) -> None:
    """BG-10: status defaults to active, but an explicit override is honored —
    'completed' remains reachable for an after-the-fact record."""
    payload = {**_TS_BASE, "status": "completed"}
    r = await alice_client.post("/api/v1/team-sessions", json=payload)
    assert r.status_code == 201
    assert r.json()["status"] == "completed"


@pytest.mark.asyncio
async def test_create_with_guest(alice_client: AsyncClient) -> None:
    payload = {**_TS_BASE, "participants": [{"guest_name": "  Charlie  "}]}
    r = await alice_client.post("/api/v1/team-sessions", json=payload)
    assert r.status_code == 201
    guests = [p for p in r.json()["participants"] if p["guest_name"]]
    assert guests[0]["guest_name"] == "charlie"  # normalised lower().strip()


@pytest.mark.asyncio
async def test_create_with_multiple_guests(alice_client: AsyncClient) -> None:
    """A session can hold more than one guest — all guests share user_id=NULL,
    so the old UNIQUE NULLS NOT DISTINCT (team_session_id, user_id) constraint
    silently capped every session at exactly one guest (0083 fix)."""
    payload = {
        **_TS_BASE,
        "participants": [{"guest_name": "Charlie"}, {"guest_name": "Dana"}],
    }
    r = await alice_client.post("/api/v1/team-sessions", json=payload)
    assert r.status_code == 201
    guest_names = sorted(p["guest_name"] for p in r.json()["participants"] if p["guest_name"])
    assert guest_names == ["charlie", "dana"]


@pytest.mark.asyncio
async def test_create_participant_workout_already_linked_elsewhere_moves_it(
    alice_client: AsyncClient, bob_client: AsyncClient
) -> None:
    """Creating a session with a participant whose workout_id is already linked
    to another session must move the link (clear-then-attach), not 500 with a
    raw UniqueViolation — the creator's own workout_id path already had this
    fix; the bulk req.participants path did not."""
    w = await bob_client.post(
        "/api/v1/workouts", json={"performed_at": "2026-06-01T09:00:00Z", "results": []}
    )
    assert w.status_code == 201
    workout_id = w.json()["id"]

    first = await alice_client.post(
        "/api/v1/team-sessions",
        json={**_TS_BASE, "participants": [{"user_id": str(BOB_ID), "workout_id": workout_id}]},
    )
    assert first.status_code == 201
    first_pid = _pid(first.json(), user_id=BOB_ID)

    second = await alice_client.post(
        "/api/v1/team-sessions",
        json={
            **_TS_BASE,
            "name": "Second Session",
            "participants": [{"user_id": str(BOB_ID), "workout_id": workout_id}],
        },
    )
    assert second.status_code == 201
    second_pid = _pid(second.json(), user_id=BOB_ID)

    # The first session's participant row must now show no linked workout —
    # the reference moved, it wasn't left dangling.
    refetched_first = await alice_client.get(f"/api/v1/team-sessions/{first.json()['id']}")
    assert refetched_first.status_code == 200
    first_participant = next(
        p for p in refetched_first.json()["participants"] if p["id"] == first_pid
    )
    assert first_participant["workout_id"] is None

    second_participant = next(p for p in second.json()["participants"] if p["id"] == second_pid)
    assert second_participant["workout_id"] == workout_id


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

    # BG-06/BG-14: payload must carry all four keys with real values — the
    # frontend renders "{actor_name} {verb} '{session_name}'" and must never
    # fall back to "Someone".
    notif = next(n for n in notifs.json() if n["type"] == "workout_link_pending")
    assert notif["payload"]["team_session_id"] is not None
    assert notif["payload"]["session_name"] == "Partner Helen"
    assert notif["payload"]["actor_user_id"] == str(ALICE_ID)
    assert notif["payload"]["actor_name"] == await _display_name(alice_client)


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


@pytest.mark.asyncio
async def test_list_logged_count(alice_client: AsyncClient, bob_client: AsyncClient) -> None:
    """BG-13: the list endpoint returns logged_count (N) alongside
    participant_count (M) — 2 of 3 participants have a linked workout_id."""
    alice_workout = (
        await alice_client.post(
            "/api/v1/workouts",
            json={"performed_at": _PERFORMED_AT, "session_type": "metcon"},
        )
    ).json()
    bob_workout = (
        await bob_client.post(
            "/api/v1/workouts",
            json={"performed_at": _PERFORMED_AT, "session_type": "metcon"},
        )
    ).json()

    payload = {
        **_TS_BASE,
        "workout_id": alice_workout["id"],
        "participants": [
            {"user_id": str(BOB_ID), "workout_id": bob_workout["id"]},
            {"guest_name": "Charlie"},
        ],
    }
    await alice_client.post("/api/v1/team-sessions", json=payload)

    r = await alice_client.get("/api/v1/team-sessions")
    assert r.status_code == 200
    item = r.json()["items"][0]
    assert item["participant_count"] == 3
    assert item["logged_count"] == 2


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
async def test_add_participant_notification_payload_shape(
    alice_client: AsyncClient, bob_client: AsyncClient
) -> None:
    """BG-06/BG-14: add_participant's payload previously carried neither
    session_name nor actor_name — now both are always populated."""
    ts_id = (await alice_client.post("/api/v1/team-sessions", json=_TS_BASE)).json()["id"]
    r = await alice_client.post(
        f"/api/v1/team-sessions/{ts_id}/participants",
        json={"user_id": str(BOB_ID)},
    )
    assert r.status_code == 200

    notifs_r = await bob_client.get("/api/v1/notifications")
    notif = next(n for n in notifs_r.json() if n["type"] == "workout_link_pending")
    assert notif["payload"]["team_session_id"] == ts_id
    assert notif["payload"]["session_name"] == "Partner Helen"
    assert notif["payload"]["actor_user_id"] == str(ALICE_ID)
    assert notif["payload"]["actor_name"] == await _display_name(alice_client)


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


@pytest.mark.asyncio
async def test_remove_training_partner_success(alice_client: AsyncClient) -> None:
    """BG-08: DELETE removes the caller's own training_partners row."""
    add_r = await alice_client.post("/api/v1/training-partners", json={"email": "bob@test.local"})
    assert add_r.status_code == 201

    r = await alice_client.delete(f"/api/v1/training-partners/{BOB_ID}")
    assert r.status_code == 204


@pytest.mark.asyncio
async def test_remove_training_partner_not_found_404(alice_client: AsyncClient) -> None:
    """Never having added the partner (or already removed) 404s."""
    r = await alice_client.delete(f"/api/v1/training-partners/{BOB_ID}")
    assert r.status_code == 404


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

    # BG-06/BG-14: the later-link path previously had no payload at all.
    notif = next(n for n in notifs_r.json() if n["type"] == "team_session_linked")
    assert notif["payload"]["team_session_id"] == ts_id
    assert notif["payload"]["session_name"] == "Partner Helen"
    assert notif["payload"]["actor_user_id"] == str(ALICE_ID)
    assert notif["payload"]["actor_name"] == await _display_name(alice_client)


@pytest.mark.asyncio
async def test_patch_team_session_notifies_other_participants_not_actor(
    alice_client: AsyncClient, bob_client: AsyncClient
) -> None:
    """BG-07: team_session_updated has no insert site anywhere — patching a
    session must fire it to every OTHER participant with a real user_id, and
    never to the actor themselves. This also covers the Finalize flow, since
    finalize is just PATCH .../status."""
    payload = {**_TS_BASE, "participants": [{"user_id": str(BOB_ID)}]}
    ts_id = (await alice_client.post("/api/v1/team-sessions", json=payload)).json()["id"]

    r = await alice_client.patch(f"/api/v1/team-sessions/{ts_id}", json={"name": "Updated Name"})
    assert r.status_code == 200

    bob_notifs = (await bob_client.get("/api/v1/notifications")).json()
    updated = [n for n in bob_notifs if n["type"] == "team_session_updated"]
    assert len(updated) == 1
    assert updated[0]["payload"]["team_session_id"] == ts_id
    assert updated[0]["payload"]["session_name"] == "Updated Name"
    assert updated[0]["payload"]["actor_user_id"] == str(ALICE_ID)
    assert updated[0]["payload"]["actor_name"] == await _display_name(alice_client)

    # The actor (Alice, the creator who made the change) never notifies herself.
    alice_notifs = (await alice_client.get("/api/v1/notifications")).json()
    assert "team_session_updated" not in [n["type"] for n in alice_notifs]


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


# ── Leaderboard (BG-12) ────────────────────────────────────────────────────────


def _by_key(ts: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Index a TeamSession's participants by user_id (str) or guest_name."""
    return {(p["user_id"] or p["guest_name"]): p for p in ts["participants"]}


async def _make_workout(
    client: AsyncClient,
    *,
    duration_s: int | None = None,
    results: list[dict[str, Any]] | None = None,
) -> str:
    body: dict[str, Any] = {"performed_at": _PERFORMED_AT, "session_type": "metcon"}
    if duration_s is not None:
        body["duration_s"] = duration_s
    if results is not None:
        body["results"] = results
    r = await client.post("/api/v1/workouts", json=body)
    assert r.status_code == 201
    return r.json()["id"]  # type: ignore[no-any-return]


async def _link_guest(
    alice_client: AsyncClient, ts_id: str, guest_pid: str, workout_id: str
) -> dict[str, Any]:
    r = await alice_client.patch(
        f"/api/v1/team-sessions/{ts_id}/participants/{guest_pid}",
        json={"workout_id": workout_id},
    )
    assert r.status_code == 200
    return r.json()  # type: ignore[no-any-return]


@pytest.mark.asyncio
async def test_leaderboard_for_time_ranks_ascending(
    alice_client: AsyncClient, bob_client: AsyncClient
) -> None:
    """Fastest (lowest duration_s) wins — rank 1."""
    alice_workout = await _make_workout(alice_client, duration_s=300)  # 5:00
    bob_workout = await _make_workout(bob_client, duration_s=200)  # 3:20
    guest_workout = await _make_workout(alice_client, duration_s=400)  # 6:40

    payload = {
        **_TS_BASE,
        "scoring_type": "for_time",
        "workout_id": alice_workout,
        "participants": [
            {"user_id": str(BOB_ID), "workout_id": bob_workout},
            {"guest_name": "Charlie"},
        ],
    }
    ts = (await alice_client.post("/api/v1/team-sessions", json=payload)).json()
    guest_pid = _pid(ts, guest_name="charlie")
    ts_final = await _link_guest(alice_client, ts["id"], guest_pid, guest_workout)

    by = _by_key(ts_final)
    assert by[str(BOB_ID)]["rank"] == 1
    assert by[str(BOB_ID)]["score"] == "3:20"
    assert by[str(ALICE_ID)]["rank"] == 2
    assert by[str(ALICE_ID)]["score"] == "5:00"
    assert by["charlie"]["rank"] == 3
    assert by["charlie"]["score"] == "6:40"


@pytest.mark.asyncio
async def test_leaderboard_slowest_finisher_ranks_descending(
    alice_client: AsyncClient, bob_client: AsyncClient
) -> None:
    """The slowest (highest duration_s) is the determinant — rank 1."""
    alice_workout = await _make_workout(alice_client, duration_s=300)
    bob_workout = await _make_workout(bob_client, duration_s=200)
    guest_workout = await _make_workout(alice_client, duration_s=400)

    payload = {
        **_TS_BASE,
        "scoring_type": "slowest_finisher",
        "workout_id": alice_workout,
        "participants": [
            {"user_id": str(BOB_ID), "workout_id": bob_workout},
            {"guest_name": "Charlie"},
        ],
    }
    ts = (await alice_client.post("/api/v1/team-sessions", json=payload)).json()
    guest_pid = _pid(ts, guest_name="charlie")
    ts_final = await _link_guest(alice_client, ts["id"], guest_pid, guest_workout)

    by = _by_key(ts_final)
    assert by["charlie"]["rank"] == 1
    assert by[str(ALICE_ID)]["rank"] == 2
    assert by[str(BOB_ID)]["rank"] == 3


@pytest.mark.asyncio
async def test_leaderboard_amrap_ranks_rounds_then_partial_reps_descending(
    alice_client: AsyncClient, bob_client: AsyncClient
) -> None:
    """Most work wins: SUM(rounds) desc, then SUM(partial_reps) desc as the
    within-equal-rounds tiebreak."""
    alice_workout = await _make_workout(
        alice_client,
        results=[{"result_type": "rounds_reps", "rounds": 5, "partial_reps": 10, "order_index": 0}],
    )
    bob_workout = await _make_workout(
        bob_client,
        results=[{"result_type": "rounds_reps", "rounds": 5, "partial_reps": 20, "order_index": 0}],
    )
    guest_workout = await _make_workout(
        alice_client,
        results=[{"result_type": "rounds_reps", "rounds": 6, "partial_reps": 0, "order_index": 0}],
    )

    payload = {
        **_TS_BASE,
        "scoring_type": "amrap",
        "workout_id": alice_workout,
        "participants": [
            {"user_id": str(BOB_ID), "workout_id": bob_workout},
            {"guest_name": "Charlie"},
        ],
    }
    ts = (await alice_client.post("/api/v1/team-sessions", json=payload)).json()
    guest_pid = _pid(ts, guest_name="charlie")
    ts_final = await _link_guest(alice_client, ts["id"], guest_pid, guest_workout)

    by = _by_key(ts_final)
    assert by["charlie"]["rank"] == 1
    assert by["charlie"]["score"] == "6 rounds"
    assert by[str(BOB_ID)]["rank"] == 2
    assert by[str(BOB_ID)]["score"] == "5 rounds + 20 reps"
    assert by[str(ALICE_ID)]["rank"] == 3
    assert by[str(ALICE_ID)]["score"] == "5 rounds + 10 reps"


@pytest.mark.asyncio
async def test_leaderboard_total_reps_ranks_descending(
    alice_client: AsyncClient, bob_client: AsyncClient
) -> None:
    alice_workout = await _make_workout(
        alice_client, results=[{"result_type": "reps", "reps": 30, "order_index": 0}]
    )
    bob_workout = await _make_workout(
        bob_client, results=[{"result_type": "reps", "reps": 50, "order_index": 0}]
    )
    guest_workout = await _make_workout(
        alice_client, results=[{"result_type": "reps", "reps": 40, "order_index": 0}]
    )

    payload = {
        **_TS_BASE,
        "scoring_type": "total_reps",
        "workout_id": alice_workout,
        "participants": [
            {"user_id": str(BOB_ID), "workout_id": bob_workout},
            {"guest_name": "Charlie"},
        ],
    }
    ts = (await alice_client.post("/api/v1/team-sessions", json=payload)).json()
    guest_pid = _pid(ts, guest_name="charlie")
    ts_final = await _link_guest(alice_client, ts["id"], guest_pid, guest_workout)

    by = _by_key(ts_final)
    assert by[str(BOB_ID)]["rank"] == 1
    assert by[str(BOB_ID)]["score"] == "50 reps"
    assert by["charlie"]["rank"] == 2
    assert by[str(ALICE_ID)]["rank"] == 3


@pytest.mark.asyncio
async def test_leaderboard_max_load_ranks_descending(
    alice_client: AsyncClient, bob_client: AsyncClient
) -> None:
    alice_workout = await _make_workout(
        alice_client,
        results=[{"result_type": "weight", "load_kg": "100.0", "reps": 1, "order_index": 0}],
    )
    bob_workout = await _make_workout(
        bob_client,
        results=[{"result_type": "weight", "load_kg": "120.5", "reps": 1, "order_index": 0}],
    )
    guest_workout = await _make_workout(
        alice_client,
        results=[{"result_type": "weight", "load_kg": "90.0", "reps": 1, "order_index": 0}],
    )

    payload = {
        **_TS_BASE,
        "scoring_type": "max_load",
        "workout_id": alice_workout,
        "participants": [
            {"user_id": str(BOB_ID), "workout_id": bob_workout},
            {"guest_name": "Charlie"},
        ],
    }
    ts = (await alice_client.post("/api/v1/team-sessions", json=payload)).json()
    guest_pid = _pid(ts, guest_name="charlie")
    ts_final = await _link_guest(alice_client, ts["id"], guest_pid, guest_workout)

    by = _by_key(ts_final)
    assert by[str(BOB_ID)]["rank"] == 1
    assert by[str(BOB_ID)]["score"] == "120.5 kg"
    assert by[str(ALICE_ID)]["rank"] == 2
    assert by[str(ALICE_ID)]["score"] == "100 kg"
    assert by["charlie"]["rank"] == 3
    assert by["charlie"]["score"] == "90 kg"


@pytest.mark.asyncio
async def test_leaderboard_tie_shares_rank(
    alice_client: AsyncClient, bob_client: AsyncClient
) -> None:
    """Standard competition ranking: equal scores share a rank (1, 1, 3), not
    (1, 1, 2)."""
    alice_workout = await _make_workout(alice_client, duration_s=300)
    bob_workout = await _make_workout(bob_client, duration_s=300)  # tied with Alice
    guest_workout = await _make_workout(alice_client, duration_s=400)

    payload = {
        **_TS_BASE,
        "scoring_type": "for_time",
        "workout_id": alice_workout,
        "participants": [
            {"user_id": str(BOB_ID), "workout_id": bob_workout},
            {"guest_name": "Charlie"},
        ],
    }
    ts = (await alice_client.post("/api/v1/team-sessions", json=payload)).json()
    guest_pid = _pid(ts, guest_name="charlie")
    ts_final = await _link_guest(alice_client, ts["id"], guest_pid, guest_workout)

    by = _by_key(ts_final)
    assert by[str(ALICE_ID)]["rank"] == 1
    assert by[str(BOB_ID)]["rank"] == 1
    assert by["charlie"]["rank"] == 3  # skips 2 — competition ranking


@pytest.mark.asyncio
async def test_leaderboard_relay_suppresses_rank_and_score(
    alice_client: AsyncClient, bob_client: AsyncClient
) -> None:
    """relay is a team-aggregate type — no per-person rank, ever."""
    alice_workout = await _make_workout(alice_client, duration_s=300)
    bob_workout = await _make_workout(bob_client, duration_s=200)

    payload = {
        **_TS_BASE,
        "scoring_type": "relay",
        "team_score_s": 500,
        "workout_id": alice_workout,
        "participants": [{"user_id": str(BOB_ID), "workout_id": bob_workout}],
    }
    ts = (await alice_client.post("/api/v1/team-sessions", json=payload)).json()

    for p in ts["participants"]:
        assert p["rank"] is None
        assert p["score"] is None


@pytest.mark.asyncio
async def test_leaderboard_unlinked_participant_has_null_score_and_rank(
    alice_client: AsyncClient,
) -> None:
    """An unlinked participant (no workout_id) never breaks the leaderboard
    query — it just sits out with null score/rank."""
    alice_workout = await _make_workout(alice_client, duration_s=300)

    payload = {
        **_TS_BASE,
        "scoring_type": "for_time",
        "workout_id": alice_workout,
        "participants": [{"guest_name": "Charlie"}],  # never linked
    }
    ts = (await alice_client.post("/api/v1/team-sessions", json=payload)).json()

    by = _by_key(ts)
    assert by[str(ALICE_ID)]["rank"] == 1
    assert by[str(ALICE_ID)]["score"] == "5:00"
    assert by["charlie"]["rank"] is None
    assert by["charlie"]["score"] is None
