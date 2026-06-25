"""Coach session + message persistence layer."""

from __future__ import annotations

import json
import uuid
from typing import Any

import psycopg
from psycopg.rows import dict_row

from app.models.coach import CoachSession, HistoryMessage, SessionMessagesResponse

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
) -> uuid.UUID:
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
    assert row is not None
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
                  AND created_at < (
                      SELECT created_at FROM public.coach_sessions WHERE id = %s
                  )
                ORDER BY created_at DESC LIMIT %s
                """,
                [user_id, before_id, limit],
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
