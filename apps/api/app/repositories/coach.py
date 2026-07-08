"""Coach session + message persistence layer."""

from __future__ import annotations

import json
import uuid
from datetime import date
from typing import Any

import psycopg
from psycopg.rows import dict_row

from app.models.coach import (
    CoachSession,
    HistoryMessage,
    PlannedItem,
    SessionMessagesResponse,
    TodaySessionContext,
)

MAX_HISTORY_TURNS = 10
MAX_HISTORY_TOKENS = 5_000
_TOKEN_CHARS = 4


def _estimate_tokens(text: str) -> int:
    return max(1, len(text) // _TOKEN_CHARS)


async def create_session(
    db: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
    title: str,
    session_id: uuid.UUID | None = None,
) -> uuid.UUID:
    """Create a new coach session, optionally with a caller-provided UUID.

    Passing ``session_id`` preserves backward compatibility for the non-streaming
    /chat endpoint, which accepted client-side session UUIDs before this table
    existed. The caller must first confirm the ID is not already owned by another
    user via ``get_session``.
    """
    if session_id is not None:
        async with db.cursor(row_factory=dict_row) as cur:
            await cur.execute(
                """
                INSERT INTO public.coach_sessions (id, user_id, title)
                VALUES (%s, %s, %s)
                RETURNING id
                """,
                [session_id, user_id, title],
            )
            row = await cur.fetchone()
        if row is None:
            raise RuntimeError("Coach session INSERT returned no row")
        return uuid.UUID(str(row["id"]))
    async with db.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            INSERT INTO public.coach_sessions (user_id, title)
            VALUES (%s, %s)
            RETURNING id
            """,
            [user_id, title],
        )
        row = await cur.fetchone()
    if row is None:
        raise RuntimeError("Coach session INSERT returned no row")
    return uuid.UUID(str(row["id"]))


async def get_session(
    db: psycopg.AsyncConnection[Any],
    session_id: uuid.UUID,
    user_id: uuid.UUID,
) -> dict[str, Any] | None:
    async with db.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            SELECT id, user_id, title, created_at
            FROM public.coach_sessions
            WHERE id = %s AND user_id = %s
            """,
            [session_id, user_id],
        )
        return await cur.fetchone()


async def list_sessions(
    db: psycopg.AsyncConnection[Any],
    user_id: uuid.UUID,
    limit: int = 20,
    before_id: uuid.UUID | None = None,
) -> list[CoachSession]:
    async with db.cursor(row_factory=dict_row) as cur:
        if before_id is not None:
            await cur.execute(
                """
                SELECT id, title, created_at
                FROM public.coach_sessions
                WHERE user_id = %s
                  AND (created_at, id) < (
                      SELECT created_at, id FROM public.coach_sessions
                      WHERE id = %s AND user_id = %s
                  )
                ORDER BY created_at DESC, id DESC LIMIT %s
                """,
                [user_id, before_id, user_id, limit],
            )
        else:
            await cur.execute(
                """
                SELECT id, title, created_at
                FROM public.coach_sessions
                WHERE user_id = %s
                ORDER BY created_at DESC LIMIT %s
                """,
                [user_id, limit],
            )
        rows = await cur.fetchall()
    return [CoachSession(**r) for r in rows]


async def write_message(
    db: psycopg.AsyncConnection[Any],
    session_id: uuid.UUID,
    role: str,
    content: str,
    *,
    safety_tier: str | None = None,
    citations: list[dict[str, Any]] | None = None,
    stub: bool = False,
) -> None:
    await db.execute(
        """
        INSERT INTO public.coach_messages
            (session_id, role, content, safety_tier, citations, stub)
        VALUES (%s, %s, %s, %s, %s::jsonb, %s)
        """,
        [
            session_id,
            role,
            content,
            safety_tier,
            json.dumps(citations or []),
            stub,
        ],
    )
    await db.execute(
        "UPDATE public.coach_sessions SET updated_at = now() WHERE id = %s",
        [session_id],
    )


async def list_messages(
    db: psycopg.AsyncConnection[Any],
    session_id: uuid.UUID,
    user_id: uuid.UUID,
    limit: int = 50,
) -> SessionMessagesResponse:
    row = await get_session(db, session_id, user_id)
    if row is None:
        return SessionMessagesResponse(messages=[], has_more=False)

    async with db.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            SELECT role, content, created_at
            FROM public.coach_messages
            WHERE session_id = %s
            ORDER BY created_at ASC
            LIMIT %s
            """,
            [session_id, limit + 1],
        )
        rows = await cur.fetchall()

    has_more = len(rows) > limit
    messages = [HistoryMessage(**r) for r in rows[:limit]]
    return SessionMessagesResponse(messages=messages, has_more=has_more)


async def fetch_session_messages_history(
    db: psycopg.AsyncConnection[Any],
    session_id: uuid.UUID,
) -> list[dict[str, str]]:
    """Return message dicts for LLM context, sanitized and token-budget trimmed."""
    async with db.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            SELECT role, content
            FROM public.coach_messages
            WHERE session_id = %s AND role IN ('user', 'assistant')
            ORDER BY created_at ASC LIMIT %s
            """,
            [session_id, MAX_HISTORY_TURNS * 2],
        )
        rows = await cur.fetchall()

    sanitized: list[dict[str, str]] = []
    last_role: str | None = None
    for row in rows:
        role = str(row["role"])
        if role != last_role:
            sanitized.append({"role": role, "content": str(row["content"])})
            last_role = role

    while sanitized and sanitized[-1]["role"] == "user":
        sanitized.pop()

    total_tokens = sum(_estimate_tokens(m["content"]) for m in sanitized)
    while sanitized and total_tokens > MAX_HISTORY_TOKENS:
        dropped = sanitized.pop(0)
        total_tokens -= _estimate_tokens(dropped["content"])
        if sanitized:
            dropped2 = sanitized.pop(0)
            total_tokens -= _estimate_tokens(dropped2["content"])

    return sanitized


async def get_workout_with_items(
    workout_id: uuid.UUID,
    user_id: uuid.UUID,
    db: psycopg.AsyncConnection[Any],
) -> tuple[dict[str, Any], list[dict[str, Any]]] | None:
    """Fetch (session_row, items) for ownership check before modification.

    Returns None when the session does not exist or belongs to a different user.
    """
    async with db.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            SELECT ps.id
            FROM planned_sessions ps
            JOIN plans p ON p.id = ps.plan_id
            WHERE ps.id = %s AND p.user_id = %s
            """,
            [workout_id, user_id],
        )
        session_row = await cur.fetchone()

    if session_row is None:
        return None

    async with db.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            SELECT movement_name
            FROM planned_items
            WHERE session_id = %s
            ORDER BY item_order
            """,
            [workout_id],
        )
        item_rows = await cur.fetchall()

    return dict(session_row), list(item_rows)


async def get_session_injuries(
    user_id: uuid.UUID,
    db: psycopg.AsyncConnection[Any],
) -> list[dict[str, Any]]:
    """Return active injury rows (body_region, requires_referral) for a user."""
    async with db.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            SELECT body_region, requires_referral
            FROM injuries
            WHERE user_id = %s AND active = true
            ORDER BY reported_at DESC
            """,
            [user_id],
        )
        return list(await cur.fetchall())


async def fetch_today_session(
    db: psycopg.AsyncConnection[Any],
    user_id: uuid.UUID,
    today: date,
) -> TodaySessionContext | None:
    """Return today's planned session with its items, or None if none scheduled."""
    async with db.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            SELECT
                ps.session_type,
                ps.title,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'movement_name', pi.movement_name,
                            'sets', pi.sets,
                            'reps', pi.reps,
                            'load_kg', pi.load_kg::float,
                            'load_pct_1rm', pi.load_pct_1rm::float
                        ) ORDER BY pi.item_order
                    ) FILTER (WHERE pi.id IS NOT NULL),
                    '[]'::json
                ) AS items
            FROM planned_sessions ps
            JOIN plans p ON p.id = ps.plan_id
            LEFT JOIN planned_items pi ON pi.session_id = ps.id
            WHERE p.user_id = %s AND ps.scheduled_date = %s
            GROUP BY ps.id, ps.session_type, ps.title
            ORDER BY (p.status = 'active') DESC, ps.scheduled_date
            LIMIT 1
            """,
            [user_id, today],
        )
        row = await cur.fetchone()

    if row is None:
        return None

    raw_items: list[dict[str, Any]] = row["items"] or []
    items = [
        PlannedItem(
            movement_name=str(it["movement_name"]),
            sets=it["sets"],
            reps=str(it["reps"]) if it["reps"] else None,
            load_kg=float(it["load_kg"]) if it["load_kg"] is not None else None,
            load_pct_1rm=float(it["load_pct_1rm"]) if it["load_pct_1rm"] is not None else None,
        )
        for it in raw_items
    ]
    return TodaySessionContext(
        session_type=str(row["session_type"]),
        title=str(row["title"]),
        items=items,
    )
