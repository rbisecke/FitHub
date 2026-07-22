"""Tests for the nightly streak-at-risk notification job (Domain 07 §I, BG-16).

`check_streak_at_risk` depends on `get_streak_state`'s `at_risk` flag, which in
turn depends on the real day of the ISO week (`remaining_days_in_week <= 3`)
via the DB's `now()` — see `test_at_risk_matches_days_remaining_in_week` in
tests/test_streak.py, which handles the same non-mockable dependency by
computing the expected value dynamically rather than asserting a fixed
boolean. `get_streak_state` itself is already exhaustively covered there, so
these tests instead monkeypatch it to return a controlled `StreakState` —
isolating the job's own logic (dedup, active-today skip, message formatting)
from the real calendar, which this job's tests have no reason to depend on.
Any user_id not given a controlled state falls through to the real
`get_streak_state`, so untouched profiles (e.g. Bob, in most of these tests)
are still exercised for real rather than silently skipped.
"""

from __future__ import annotations

import uuid
from typing import Any

import psycopg
import pytest
from psycopg.rows import dict_row

import app.repositories.streak as streak_module
from app.models.profile import StreakState
from tests.conftest import ALICE_ID, TEST_DB_DSN

# last_active_at is reset for ALICE_ID/BOB_ID by conftest.py's autouse
# `_clean_data` fixture after every test, so no local reset fixture is needed
# here.


def _make_state(**overrides: object) -> StreakState:
    base: dict[str, Any] = {
        "current_streak": 12,
        "personal_best": 12,
        "this_week_count": 1,
        "frequency_target": 3,
        "at_risk": True,
        "is_comeback": False,
        "freezes_remaining": 0,
        "freeze_consumed_this_week": False,
    }
    base.update(overrides)
    return StreakState(**base)


def _mock_get_streak_state(
    monkeypatch: pytest.MonkeyPatch,
    states: dict[uuid.UUID, StreakState],
    calls: list[uuid.UUID] | None = None,
) -> None:
    """Replace app.repositories.streak.get_streak_state for user_ids in `states`;
    any other user_id falls through to the real implementation."""
    real_get_streak_state = streak_module.get_streak_state

    async def _fake(conn: psycopg.AsyncConnection[Any], *, user_id: uuid.UUID) -> StreakState:
        if calls is not None:
            calls.append(user_id)
        if user_id in states:
            return states[user_id]
        return await real_get_streak_state(conn, user_id=user_id)

    monkeypatch.setattr(streak_module, "get_streak_state", _fake)


async def _notifications(user_id: uuid.UUID, notif_type: str) -> list[dict[str, Any]]:
    async with await psycopg.AsyncConnection.connect(
        TEST_DB_DSN, autocommit=True, row_factory=dict_row
    ) as conn:
        cur = await conn.execute(
            "SELECT * FROM public.notifications WHERE user_id = %s AND type = %s",
            [user_id, notif_type],
        )
        return await cur.fetchall()


@pytest.mark.asyncio
async def test_at_risk_user_gets_notified(monkeypatch: pytest.MonkeyPatch) -> None:
    _mock_get_streak_state(
        monkeypatch,
        {
            ALICE_ID: _make_state(
                current_streak=12, this_week_count=1, frequency_target=3, at_risk=True
            )
        },
    )

    from app.jobs.gamification import check_streak_at_risk

    await check_streak_at_risk()

    notifs = await _notifications(ALICE_ID, "streak_at_risk")
    assert len(notifs) == 1
    payload = notifs[0]["payload"]
    assert payload["sessions_needed"] == 2  # frequency_target(3) - this_week_count(1)
    assert payload["current_streak"] == 12
    assert payload["message"] == "2 sessions left this week to keep your 12-week streak"


@pytest.mark.asyncio
async def test_not_at_risk_user_gets_nothing(monkeypatch: pytest.MonkeyPatch) -> None:
    _mock_get_streak_state(monkeypatch, {ALICE_ID: _make_state(at_risk=False)})

    from app.jobs.gamification import check_streak_at_risk

    await check_streak_at_risk()

    assert await _notifications(ALICE_ID, "streak_at_risk") == []


@pytest.mark.asyncio
async def test_already_notified_this_week_not_duplicated(monkeypatch: pytest.MonkeyPatch) -> None:
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn:
        await conn.execute(
            "INSERT INTO public.notifications (user_id, type, payload) "
            "VALUES (%s, 'streak_at_risk', %s)",
            [
                str(ALICE_ID),
                '{"sessions_needed": 1, "current_streak": 5, "message": "already sent"}',
            ],
        )

    _mock_get_streak_state(
        monkeypatch,
        {
            ALICE_ID: _make_state(
                current_streak=5, this_week_count=0, frequency_target=1, at_risk=True
            )
        },
    )

    from app.jobs.gamification import check_streak_at_risk

    await check_streak_at_risk()

    notifs = await _notifications(ALICE_ID, "streak_at_risk")
    assert len(notifs) == 1  # still just the pre-seeded one, no duplicate
    assert notifs[0]["payload"]["message"] == "already sent"


@pytest.mark.asyncio
async def test_active_earlier_today_is_skipped(monkeypatch: pytest.MonkeyPatch) -> None:
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn:
        await conn.execute(
            "UPDATE public.profiles SET last_active_at = now() WHERE id = %s", [str(ALICE_ID)]
        )

    calls: list[uuid.UUID] = []
    _mock_get_streak_state(monkeypatch, {ALICE_ID: _make_state(at_risk=True)}, calls=calls)

    from app.jobs.gamification import check_streak_at_risk

    await check_streak_at_risk()

    assert ALICE_ID not in calls  # short-circuited before get_streak_state was ever called
    assert await _notifications(ALICE_ID, "streak_at_risk") == []
