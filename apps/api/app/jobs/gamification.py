"""Scheduled job: nightly streak-at-risk notification (Domain 07 §I, BG-16).

Iterates every profile and reuses `get_streak_state()`
(app/repositories/streak.py) wholesale rather than building a cheaper,
separate "just check at_risk" path — that function already does freeze
reconciliation and milestone grants as a side effect of computing state, so
running it here means the nightly pass also reconciles any user who hasn't
opened the app in a while, instead of leaving their freeze/milestone state
stale until their next request.

For every `at_risk` user who hasn't opened the app yet today (see
`profiles.last_active_at`, touched by `app/auth.py`'s `require_invited` on
every authenticated request), inserts a `streak_at_risk` notification —
deduped to at most one per ISO week per user.
"""

from __future__ import annotations

import json
import logging
import uuid
from typing import Any

import psycopg

log = logging.getLogger("fithub.jobs")

_PAGE_SIZE = 500


async def _profile_ids_page(
    conn: psycopg.AsyncConnection[Any], *, after: uuid.UUID | None
) -> list[uuid.UUID]:
    async with conn.cursor() as cur:
        if after is None:
            await cur.execute("SELECT id FROM public.profiles ORDER BY id LIMIT %s", [_PAGE_SIZE])
        else:
            await cur.execute(
                "SELECT id FROM public.profiles WHERE id > %s ORDER BY id LIMIT %s",
                [after, _PAGE_SIZE],
            )
        rows = await cur.fetchall()
    return [r[0] for r in rows]


async def _active_earlier_today(conn: psycopg.AsyncConnection[Any], *, user_id: uuid.UUID) -> bool:
    """True if this user already opened the app earlier today (UTC calendar day)."""
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT 1 FROM public.profiles "
            "WHERE id = %s AND last_active_at >= DATE_TRUNC('day', now())",
            [user_id],
        )
        return await cur.fetchone() is not None


async def _already_notified_this_week(
    conn: psycopg.AsyncConnection[Any], *, user_id: uuid.UUID
) -> bool:
    """At most one `streak_at_risk` notification per user per ISO week."""
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT 1 FROM public.notifications "
            "WHERE user_id = %s AND type = 'streak_at_risk' "
            "AND DATE_TRUNC('week', created_at) = DATE_TRUNC('week', now()) "
            "LIMIT 1",
            [user_id],
        )
        return await cur.fetchone() is not None


async def _notify_streak_at_risk(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
    sessions_needed: int,
    current_streak: int,
) -> None:
    message = f"{sessions_needed} sessions left this week to keep your {current_streak}-week streak"
    async with conn.cursor() as cur:
        await cur.execute(
            "INSERT INTO public.notifications (user_id, type, payload) VALUES (%s, %s, %s)",
            [
                user_id,
                "streak_at_risk",
                json.dumps(
                    {
                        "sessions_needed": sessions_needed,
                        "current_streak": current_streak,
                        "message": message,
                    }
                ),
            ],
        )


async def _process_user(user_id: uuid.UUID) -> None:
    """Reconcile and (maybe) notify a single user, on its own pooled connection.

    A fresh connection per user — checked out and returned to the pool for
    each iteration — rather than one connection shared across the whole job.
    `get_streak_state()` demarcates its own transaction internally
    (`async with conn.transaction():`), and the pool's own `connection()`
    context manager already commits/rolls back automatically on exit; sharing
    one connection across hundreds of users without any explicit commit
    between them would leave every user's reads sitting inside the same
    ever-growing implicit transaction (non-autocommit connections open one on
    first statement and don't close it until something explicitly commits),
    which both risks a long-held transaction across a batch job and means one
    user's unhandled error could abort every later user sharing that
    connection. Checking out per user keeps each user's reconciliation fully
    isolated and atomic, at the cost of one extra pool round-trip per user —
    a fine trade for a once-a-day batch job against a small (invite-only) user
    base, and it matches the existing per-call connection idiom already used
    by app/jobs/infra_collectors.py and app/jobs/budget_check.py.
    """
    from app.db import pool_connection
    from app.repositories.streak import get_streak_state

    async with pool_connection().connection() as conn:
        if await _active_earlier_today(conn, user_id=user_id):
            return
        state = await get_streak_state(conn, user_id=user_id)
        if not state.at_risk:
            return
        if await _already_notified_this_week(conn, user_id=user_id):
            return
        sessions_needed = max(state.frequency_target - state.this_week_count, 1)
        await _notify_streak_at_risk(
            conn,
            user_id=user_id,
            sessions_needed=sessions_needed,
            current_streak=state.current_streak,
        )


async def check_streak_at_risk() -> None:
    """Nightly job: notify every at-risk user who hasn't opened the app today."""
    from app.db import pool_connection

    try:
        after: uuid.UUID | None = None
        while True:
            async with pool_connection().connection() as conn:
                user_ids = await _profile_ids_page(conn, after=after)
            if not user_ids:
                break
            for user_id in user_ids:
                try:
                    await _process_user(user_id)
                except Exception:
                    log.exception("check_streak_at_risk failed for user %s", user_id)
            after = user_ids[-1]
    except Exception:
        log.exception("check_streak_at_risk failed")
