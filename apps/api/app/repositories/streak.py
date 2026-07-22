"""Server-side streak computation and streak-freeze reconciliation (Domain 07 §D/§E).

The canonical, single-source-of-truth streak: current streak (grace-aware
weekly walk, freeze-covered weeks bridge the gap), personal best, this-week
progress, at-risk/comeback flags, and the bounded (0-2) streak-freeze
inventory.

Freeze consumption is **lazy**: there is no scheduled job that fires at
week-close. Instead, every call to `get_streak_state` walks the user's
weekly history backward and, on finding an unbridged miss, reconciles it on
the spot — consuming a freeze if one is available and recording a durable
ledger event (`streak_freeze_events`). The ledger's unique constraints make
this safe to call repeatedly for the same historical week without
double-consuming or double-granting (see migration 0085's docstring).
"""

from __future__ import annotations

import json
import uuid
from datetime import date, timedelta
from typing import Any

import psycopg
from psycopg.rows import dict_row

from app.models.profile import StreakState
from app.repositories.profile import compute_best_streak_weeks

# Streak-freeze replenishment ladder (Domain 07 §E) — ascending so a first-time
# computation for a long-time user grants every milestone already crossed, not
# just the highest.
_MILESTONES: tuple[int, ...] = (4, 8, 12, 26, 52)

_FREEZE_CAP = 2


async def _consume_freeze_for_week(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
    week_key: str,
) -> int | None:
    """Atomically decrement the freeze inventory, record the ledger event, and
    fire the `freeze_consumed` notification — all in one transaction (a
    nested savepoint under the caller's outer transaction), so a crash can
    never leave a decrement without its ledger row or vice versa.

    Returns the post-decrement `freezes_remaining`, or `None` if this week was
    already reconciled by a concurrent call (the ledger INSERT's unique
    constraint raises `UniqueViolation`, which rolls back the decrement too —
    the caller should treat this as "no freeze available right now" and stop
    bridging further back).
    """
    try:
        async with conn.transaction(), conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                """
                UPDATE public.streak_state
                SET freezes_remaining = freezes_remaining - 1
                WHERE user_id = %s AND freezes_remaining > 0
                RETURNING freezes_remaining
                """,
                [user_id],
            )
            row = await cur.fetchone()
            if row is None:
                return None
            freezes_after = int(row["freezes_remaining"])
            await cur.execute(
                """
                INSERT INTO public.streak_freeze_events (user_id, event_type, week_key)
                VALUES (%s, 'consumed', %s)
                """,
                [user_id, week_key],
            )
            message = f"A streak freeze covered last week — {freezes_after} remaining"
            await cur.execute(
                "INSERT INTO public.notifications (user_id, type, payload) VALUES (%s, %s, %s)",
                [
                    user_id,
                    "freeze_consumed",
                    json.dumps(
                        {
                            "week_key": week_key,
                            "freezes_remaining": freezes_after,
                            "message": message,
                        }
                    ),
                ],
            )
        return freezes_after
    except psycopg.errors.UniqueViolation:
        return None


async def _grant_milestone(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
    week_key: str,
    milestone: int,
) -> tuple[int, bool] | None:
    """Record a milestone grant (idempotent via the `(user_id, milestone)`
    unique constraint) and fire the `streak_milestone` notification — all in
    one nested transaction, mirroring `_consume_freeze_for_week`.

    The freeze inventory is incremented by 1, capped at `_FREEZE_CAP`; if
    already at cap the grant event is still recorded (so it's never
    re-evaluated on a later call) but the inventory doesn't change.

    Returns `(freezes_remaining_after, was_at_cap)`, or `None` if this
    milestone was already granted by a concurrent call.
    """
    try:
        async with conn.transaction(), conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                """
                INSERT INTO public.streak_freeze_events (user_id, event_type, week_key, milestone)
                VALUES (%s, 'granted', %s, %s)
                """,
                [user_id, week_key, milestone],
            )
            await cur.execute(
                "SELECT freezes_remaining FROM public.streak_state WHERE user_id = %s FOR UPDATE",
                [user_id],
            )
            row = await cur.fetchone()
            pre = int(row["freezes_remaining"]) if row else 0
            was_at_cap = pre >= _FREEZE_CAP
            post = pre if was_at_cap else pre + 1
            if not was_at_cap:
                await cur.execute(
                    "UPDATE public.streak_state SET freezes_remaining = %s WHERE user_id = %s",
                    [post, user_id],
                )
            if was_at_cap:
                message = (
                    f"{milestone}-week streak reached — freezes already full ({post}/{_FREEZE_CAP})"
                )
            else:
                message = (
                    f"{milestone}-week streak reached — freeze restocked ({post}/{_FREEZE_CAP})"
                )
            await cur.execute(
                "INSERT INTO public.notifications (user_id, type, payload) VALUES (%s, %s, %s)",
                [
                    user_id,
                    "streak_milestone",
                    json.dumps(
                        {
                            "milestone": milestone,
                            "freezes_remaining": post,
                            "at_cap": was_at_cap,
                            "message": message,
                        }
                    ),
                ],
            )
        return post, was_at_cap
    except psycopg.errors.UniqueViolation:
        return None


async def get_streak_state(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
) -> StreakState:
    """Compute the canonical streak object, reconciling any newly-discovered
    freeze consumption and milestone grants along the way (see module
    docstring). The whole computation — reads, the lazy `streak_state`
    upsert, and any reconciliation writes — runs in one transaction so a
    concurrent request either sees the fully-reconciled result or none of it.
    """
    async with conn.transaction():
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                """
                SELECT
                    COALESCE(p.frequency_target_days, 3)::int AS frequency_target,
                    DATE_TRUNC('week', now())::date           AS current_week_start,
                    EXTRACT(ISODOW FROM now())::int           AS isodow,
                    (SELECT COUNT(DISTINCT performed_at::date) FROM public.workouts
                     WHERE user_id = %s
                       AND DATE_TRUNC('week', performed_at) = DATE_TRUNC('week', now()))::int
                        AS this_week_count,
                    (SELECT MAX(performed_at) FROM public.workouts WHERE user_id = %s)
                        AS most_recent_workout,
                    (SELECT DATE_TRUNC('week', MIN(performed_at))::date
                     FROM public.workouts WHERE user_id = %s)
                        AS earliest_week_start,
                    now() AS db_now
                FROM public.profiles p
                WHERE p.id = %s
                """,
                [user_id, user_id, user_id, user_id],
            )
            ctx = await cur.fetchone()
        if ctx is None:
            raise ValueError("profile not found")

        frequency_target: int = ctx["frequency_target"]
        current_week_start: date = ctx["current_week_start"]
        isodow: int = ctx["isodow"]
        this_week_count: int = ctx["this_week_count"]
        most_recent_workout = ctx["most_recent_workout"]
        # None for a user with zero logged workouts — the walk below never
        # runs in that case anyway (qualifying_weeks/consumed_weeks are both
        # empty and the very first iteration hits the boundary check).
        earliest_week_start: date | None = ctx["earliest_week_start"]
        db_now = ctx["db_now"]

        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                """
                SELECT DATE_TRUNC('week', performed_at)::date AS week_start,
                       COUNT(DISTINCT performed_at::date)::int AS days
                FROM public.workouts
                WHERE user_id = %s
                GROUP BY 1
                """,
                [user_id],
            )
            weekly_rows = await cur.fetchall()
        qualifying_weeks: set[date] = {
            r["week_start"] for r in weekly_rows if r["days"] >= frequency_target
        }

        # Lazily create the freeze-inventory row on first read.
        async with conn.cursor() as cur:
            await cur.execute(
                "INSERT INTO public.streak_state (user_id) VALUES (%s) "
                "ON CONFLICT (user_id) DO NOTHING",
                [user_id],
            )

        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                "SELECT event_type, week_key, milestone FROM public.streak_freeze_events "
                "WHERE user_id = %s",
                [user_id],
            )
            events = await cur.fetchall()
        consumed_weeks: set[date] = {
            date.fromisoformat(e["week_key"]) for e in events if e["event_type"] == "consumed"
        }
        granted_milestones: set[int] = {
            e["milestone"]
            for e in events
            if e["event_type"] == "granted" and e["milestone"] is not None
        }

        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                "SELECT freezes_remaining FROM public.streak_state WHERE user_id = %s",
                [user_id],
            )
            row = await cur.fetchone()
        freezes_remaining: int = int(row["freezes_remaining"]) if row else 0

        # ── Walk backward from the most recent COMPLETE week ────────────────
        previous_week_start = current_week_start - timedelta(days=7)
        week_cursor = previous_week_start
        current_streak = 0
        prev_was_bridged = False

        while True:
            # A week before the user's first-ever logged workout has no real
            # history to have missed — stop cleanly rather than treating it
            # as a genuine miss (which would otherwise silently spend a
            # freshly-granted freeze on a "phantom" pre-history week the
            # instant a user crosses their first milestone).
            if earliest_week_start is None or week_cursor < earliest_week_start:
                break
            if week_cursor in qualifying_weeks:
                current_streak += 1
                prev_was_bridged = False
                week_cursor -= timedelta(days=7)
                continue
            if week_cursor in consumed_weeks:
                current_streak += 1
                prev_was_bridged = True
                week_cursor -= timedelta(days=7)
                continue
            # Genuine miss, not yet recorded as consumed.
            if prev_was_bridged:
                # Two consecutive un-qualifying, un-covered weeks — a freeze
                # covers one week only, so the walk always ends here even if
                # freezes remain.
                break
            if freezes_remaining <= 0:
                break
            week_key = week_cursor.isoformat()
            result = await _consume_freeze_for_week(conn, user_id=user_id, week_key=week_key)
            if result is None:
                # Lost a race to a concurrent reconciliation of this same
                # week — treat conservatively as unbridged for this response.
                break
            freezes_remaining = result
            consumed_weeks.add(week_cursor)
            current_streak += 1
            prev_was_bridged = True
            week_cursor -= timedelta(days=7)

        freeze_consumed_this_week = previous_week_start in consumed_weeks

        # ── Milestone ladder — grant every crossed-but-ungranted milestone ──
        for milestone in _MILESTONES:
            if milestone > current_streak:
                break  # ladder is ascending; none higher can qualify either
            if milestone in granted_milestones:
                continue
            grant_result = await _grant_milestone(
                conn,
                user_id=user_id,
                week_key=previous_week_start.isoformat(),
                milestone=milestone,
            )
            if grant_result is None:
                continue  # already granted by a concurrent call
            freezes_remaining, _was_at_cap = grant_result

        personal_best = await compute_best_streak_weeks(conn, user_id=user_id)

        remaining_days_in_week = 7 - isodow
        at_risk = (
            current_streak > 0
            and this_week_count < frequency_target
            and remaining_days_in_week <= 3
        )
        is_comeback = most_recent_workout is not None and (
            db_now - most_recent_workout
        ) >= timedelta(days=14)

        return StreakState(
            current_streak=current_streak,
            personal_best=personal_best,
            this_week_count=this_week_count,
            frequency_target=frequency_target,
            at_risk=at_risk,
            is_comeback=is_comeback,
            freezes_remaining=freezes_remaining,
            freeze_consumed_this_week=freeze_consumed_this_week,
        )
