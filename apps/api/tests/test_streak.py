"""Integration tests for the server-side streak / streak-freeze endpoint.

`GET /api/v1/profile/streak` reconciles freeze consumption and milestone
grants lazily as a side effect of the read (see
`app/repositories/streak.py`). Since that reconciliation can only ever
"discover" a freeze that was already sitting in inventory *before* the walk
starts (a freeze earned mid-walk, from a milestone crossed by that same
walk, can never bridge a more-recent week in the same call — see the
module docstring), several tests below seed `streak_state.freezes_remaining`
directly via SQL to simulate "a freeze already earned in an earlier,
real-world week" — the same kind of raw-SQL test fixture setup
`tests/conftest.py`'s `_seed_users` already uses for seeding profiles.
"""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime, timedelta

import psycopg
import pytest
from httpx import AsyncClient

from tests.conftest import ALICE_ID, TEST_DB_DSN

# ── Week-math helpers ────────────────────────────────────────────────────────
# Mirrors the server's Monday-start ISO week convention
# (`DATE_TRUNC('week', ...)` in app/repositories/streak.py).


def _monday_of(d: date) -> date:
    return d - timedelta(days=d.weekday())


def _current_monday() -> date:
    return _monday_of(datetime.now(UTC).date())


def _week_start(n: int) -> date:
    """n=1 -> the most recent COMPLETE week (the server's `previous_week_start`);
    n=2 -> one week before that; etc. Never n=0 (the current, still-open week)."""
    prev_monday = _current_monday() - timedelta(days=7)
    return prev_monday - timedelta(days=7 * (n - 1))


async def _log_workout(client: AsyncClient, d: date) -> None:
    r = await client.post(
        "/api/v1/workouts",
        json={"performed_at": f"{d.isoformat()}T12:00:00Z", "results": []},
    )
    assert r.status_code == 201


async def _log_workout_at(client: AsyncClient, dt: datetime) -> None:
    r = await client.post(
        "/api/v1/workouts",
        json={"performed_at": dt.strftime("%Y-%m-%dT%H:%M:%SZ"), "results": []},
    )
    assert r.status_code == 201


async def _set_target(client: AsyncClient, target: int = 1) -> None:
    r = await client.patch("/api/v1/profile", json={"frequency_target_days": target})
    assert r.status_code == 200


async def _seed_freezes(user_id: uuid.UUID, n: int) -> None:
    """Seed `streak_state.freezes_remaining` directly — see module docstring
    for why this can't be done through the API for these tests."""
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn:
        await conn.execute(
            "INSERT INTO public.streak_state (user_id, freezes_remaining) VALUES (%s, %s) "
            "ON CONFLICT (user_id) DO UPDATE SET freezes_remaining = EXCLUDED.freezes_remaining",
            [user_id, n],
        )


async def _notifications(client: AsyncClient, notif_type: str) -> list[dict[str, object]]:
    r = await client.get("/api/v1/notifications", params={"include_read": True})
    assert r.status_code == 200
    return [n for n in r.json() if n["type"] == notif_type]


# ── Auth ─────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_streak_requires_auth(anon_client: AsyncClient) -> None:
    r = await anon_client.get("/api/v1/profile/streak")
    assert r.status_code == 401


# ── New user / zero state ───────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_new_user_zero_state(alice_client: AsyncClient) -> None:
    r = await alice_client.get("/api/v1/profile/streak")
    assert r.status_code == 200
    body = r.json()
    assert body["current_streak"] == 0
    assert body["personal_best"] == 0
    assert body["this_week_count"] == 0
    assert body["at_risk"] is False
    assert body["is_comeback"] is False
    assert body["freezes_remaining"] == 0
    assert body["freeze_consumed_this_week"] is False


# ── Clean streak, no gaps ────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_clean_streak_no_gaps(alice_client: AsyncClient) -> None:
    await _set_target(alice_client, 1)
    # 3 consecutive qualifying weeks — kept below the 4-week milestone so this
    # test stays isolated from freeze-granting behavior (see test_milestone_*).
    for n in (1, 2, 3):
        await _log_workout(alice_client, _week_start(n) + timedelta(days=2))

    r = await alice_client.get("/api/v1/profile/streak")
    assert r.status_code == 200
    body = r.json()
    assert body["current_streak"] == 3
    assert body["personal_best"] == 3
    assert body["freezes_remaining"] == 0
    assert body["freeze_consumed_this_week"] is False


# ── Single gap covered by an available freeze ───────────────────────────────


@pytest.mark.asyncio
async def test_single_gap_covered_by_freeze(alice_client: AsyncClient) -> None:
    await _set_target(alice_client, 1)
    await _seed_freezes(ALICE_ID, 1)
    # Week 1 (most recent complete week) is a gap; week 2 qualifies so the
    # walk has somewhere to continue to once week 1 is bridged.
    await _log_workout(alice_client, _week_start(2) + timedelta(days=2))

    r1 = await alice_client.get("/api/v1/profile/streak")
    assert r1.status_code == 200
    body1 = r1.json()
    assert body1["current_streak"] == 2  # week 1 (bridged) + week 2 (qualifying)
    assert body1["freezes_remaining"] == 0  # decremented from 1
    assert body1["freeze_consumed_this_week"] is True

    freeze_notifs = await _notifications(alice_client, "freeze_consumed")
    assert len(freeze_notifs) == 1
    assert freeze_notifs[0]["payload"]["freezes_remaining"] == 0
    assert (
        freeze_notifs[0]["payload"]["message"] == "A streak freeze covered last week — 0 remaining"
    )

    # Calling again must not double-consume: no freeze left, but the already-
    # recorded ledger event still counts as bridged, so the streak is unchanged.
    r2 = await alice_client.get("/api/v1/profile/streak")
    assert r2.status_code == 200
    body2 = r2.json()
    assert body2["current_streak"] == body1["current_streak"]
    assert body2["freezes_remaining"] == body1["freezes_remaining"]
    assert body2["freeze_consumed_this_week"] is True

    freeze_notifs_after = await _notifications(alice_client, "freeze_consumed")
    assert len(freeze_notifs_after) == 1  # not duplicated


# ── Two consecutive missed weeks ────────────────────────────────────────────


@pytest.mark.asyncio
async def test_two_consecutive_missed_weeks_bridges_at_most_one(
    alice_client: AsyncClient,
) -> None:
    """A freeze covers one week only: with 2 freezes available and weeks 1
    and 2 both genuine misses, week 1 (the more recent) may be bridged, but
    week 2 — immediately adjacent to an already-bridged week — must end the
    walk without spending a second freeze, regardless of freezes remaining
    (Domain 07 §E "b-note"). Using 2 freezes (not 1) here is deliberate: it's
    the only way to distinguish "stopped because of the adjacency rule" from
    "stopped because it ran out of freezes" — both look identical at 0
    remaining, but only one is correct.
    """
    await _set_target(alice_client, 1)
    await _seed_freezes(ALICE_ID, 2)
    # Week 3 qualifies but must never be reached — the walk should stop at
    # week 2 before getting there.
    await _log_workout(alice_client, _week_start(3) + timedelta(days=2))

    r = await alice_client.get("/api/v1/profile/streak")
    assert r.status_code == 200
    body = r.json()
    assert body["current_streak"] == 1  # only week 1 bridged
    assert body["freezes_remaining"] == 1  # exactly one freeze spent, not two

    freeze_notifs = await _notifications(alice_client, "freeze_consumed")
    assert len(freeze_notifs) == 1


# ── Milestone crossing ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_milestone_grants_freeze(alice_client: AsyncClient) -> None:
    await _set_target(alice_client, 1)
    for n in (1, 2, 3, 4):
        await _log_workout(alice_client, _week_start(n) + timedelta(days=2))

    r = await alice_client.get("/api/v1/profile/streak")
    assert r.status_code == 200
    body = r.json()
    assert body["current_streak"] == 4
    assert body["freezes_remaining"] == 1  # granted by crossing the 4-week milestone

    milestone_notifs = await _notifications(alice_client, "streak_milestone")
    assert len(milestone_notifs) == 1
    payload = milestone_notifs[0]["payload"]
    assert payload["milestone"] == 4
    assert payload["freezes_remaining"] == 1
    assert payload["at_cap"] is False
    assert payload["message"] == "4-week streak reached — freeze restocked (1/2)"


@pytest.mark.asyncio
async def test_milestone_at_cap_does_not_over_grant(alice_client: AsyncClient) -> None:
    """Cross 4, 8, and 12 in one clean (gap-free) 12-week streak so the cap is
    reached purely through real milestone grants (4: 0->1, 8: 1->2, 12:
    already at cap)."""
    await _set_target(alice_client, 1)
    for n in range(1, 13):
        await _log_workout(alice_client, _week_start(n) + timedelta(days=2))

    r1 = await alice_client.get("/api/v1/profile/streak")
    assert r1.status_code == 200
    body1 = r1.json()
    assert body1["current_streak"] == 12
    assert body1["freezes_remaining"] == 2  # capped, not 3

    milestone_notifs = await _notifications(alice_client, "streak_milestone")
    assert len(milestone_notifs) == 3
    by_milestone = {n["payload"]["milestone"]: n["payload"] for n in milestone_notifs}
    assert by_milestone[4]["at_cap"] is False
    assert by_milestone[8]["at_cap"] is False
    assert by_milestone[12]["at_cap"] is True
    assert by_milestone[12]["message"] == "12-week streak reached — freezes already full (2/2)"

    # The grant event is recorded even though the inventory didn't change, so
    # milestone 12 itself is never re-evaluated — a second call must not fire
    # a duplicate streak_milestone notification for it, and must not spend the
    # freeze on a phantom pre-history week either (see
    # test_freeze_not_phantom_consumed_before_earliest_workout).
    r2 = await alice_client.get("/api/v1/profile/streak")
    assert r2.status_code == 200
    assert r2.json()["freezes_remaining"] == 2
    milestone_notifs_after = await _notifications(alice_client, "streak_milestone")
    assert len(milestone_notifs_after) == 3


@pytest.mark.asyncio
async def test_freeze_not_phantom_consumed_before_earliest_workout(
    alice_client: AsyncClient,
) -> None:
    """A week before the user's first-ever logged workout has no real history
    to have missed. Seed a freeze directly (simulating one already earned)
    for a user whose logged history starts at week 4 — the walk must stop at
    that boundary rather than treating every earlier, data-free week as a
    genuine miss and silently spending the freeze on it.

    The clean 4-week streak itself also crosses the 4-week milestone and
    grants a second freeze (1 seeded + 1 granted = 2) — that's expected and
    orthogonal to this test; what matters is that neither freeze gets spent
    on a phantom pre-history week."""
    await _set_target(alice_client, 1)
    for n in (1, 2, 3, 4):
        await _log_workout(alice_client, _week_start(n) + timedelta(days=2))
    await _seed_freezes(ALICE_ID, 1)

    r = await alice_client.get("/api/v1/profile/streak")
    assert r.status_code == 200
    body = r.json()
    assert body["current_streak"] == 4
    assert body["freezes_remaining"] == 2  # 1 seeded + 1 milestone grant, neither spent
    assert body["freeze_consumed_this_week"] is False
    assert await _notifications(alice_client, "freeze_consumed") == []

    # A second call must not phantom-bridge and spend one of them either.
    r2 = await alice_client.get("/api/v1/profile/streak")
    assert r2.status_code == 200
    assert r2.json()["freezes_remaining"] == 2


# ── at_risk / is_comeback boundaries ─────────────────────────────────────────


@pytest.mark.asyncio
async def test_at_risk_matches_days_remaining_in_week(alice_client: AsyncClient) -> None:
    """at_risk requires current_streak > 0, this_week_count < target, and
    <=3 days left in the ISO week (Thu/Fri/Sat/Sun). The day-of-week
    component can't be mocked against the real DB clock, so this test
    computes the expected boundary from the real day at run time instead of
    hardcoding a day — it is correct on every day of the week, not just the
    day it happened to be written on.
    """
    await _set_target(alice_client, 1)
    await _log_workout(alice_client, _week_start(1) + timedelta(days=2))  # streak > 0

    r = await alice_client.get("/api/v1/profile/streak")
    assert r.status_code == 200
    body = r.json()
    assert body["current_streak"] > 0
    assert body["this_week_count"] < body["frequency_target"]

    isodow = datetime.now(UTC).isoweekday()  # 1=Mon .. 7=Sun
    expected_at_risk = (7 - isodow) <= 3
    assert body["at_risk"] == expected_at_risk


@pytest.mark.asyncio
async def test_is_comeback_true_at_14_days(alice_client: AsyncClient) -> None:
    await _log_workout_at(alice_client, datetime.now(UTC) - timedelta(days=14))
    r = await alice_client.get("/api/v1/profile/streak")
    assert r.status_code == 200
    assert r.json()["is_comeback"] is True


@pytest.mark.asyncio
async def test_is_comeback_false_at_13_days(alice_client: AsyncClient) -> None:
    await _log_workout_at(alice_client, datetime.now(UTC) - timedelta(days=13))
    r = await alice_client.get("/api/v1/profile/streak")
    assert r.status_code == 200
    assert r.json()["is_comeback"] is False


# ── Personal best counts freeze-covered weeks ───────────────────────────────


@pytest.mark.asyncio
async def test_personal_best_counts_freeze_covered_week(alice_client: AsyncClient) -> None:
    await _set_target(alice_client, 1)
    await _seed_freezes(ALICE_ID, 1)
    # Week 1 is a gap (bridged by the seeded freeze); weeks 2-4 qualify, so
    # the completed run is 1-2-3-4 = 4 consecutive weeks.
    for n in (2, 3, 4):
        await _log_workout(alice_client, _week_start(n) + timedelta(days=2))

    r = await alice_client.get("/api/v1/profile/streak")
    assert r.status_code == 200
    body = r.json()
    assert body["current_streak"] == 4
    assert body["personal_best"] == 4
    assert body["freeze_consumed_this_week"] is True


# ── Cross-user isolation ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_cross_user_isolation(alice_client: AsyncClient, bob_client: AsyncClient) -> None:
    await _set_target(alice_client, 1)
    for n in (1, 2, 3, 4):
        await _log_workout(alice_client, _week_start(n) + timedelta(days=2))
    alice_r = await alice_client.get("/api/v1/profile/streak")
    assert alice_r.status_code == 200
    alice_body = alice_r.json()
    assert alice_body["current_streak"] == 4
    assert alice_body["freezes_remaining"] == 1  # milestone-4 grant

    bob_r = await bob_client.get("/api/v1/profile/streak")
    assert bob_r.status_code == 200
    bob_body = bob_r.json()
    assert bob_body["current_streak"] == 0
    assert bob_body["personal_best"] == 0
    assert bob_body["freezes_remaining"] == 0
    assert bob_body["freeze_consumed_this_week"] is False

    bob_freeze_notifs = await _notifications(bob_client, "freeze_consumed")
    bob_milestone_notifs = await _notifications(bob_client, "streak_milestone")
    assert bob_freeze_notifs == []
    assert bob_milestone_notifs == []
