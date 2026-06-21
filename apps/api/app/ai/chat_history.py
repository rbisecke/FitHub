"""Chat history fetch, sanitise, and token-budget trim."""

from __future__ import annotations

import psycopg
import psycopg.rows

MAX_HISTORY_TURNS = 10
MAX_HISTORY_TOKENS = 5_000
SHORT_QUESTION_WORDS = 5


def _estimate_tokens(text: str) -> int:
    return max(1, len(text) // 4)


async def fetch_session_history(
    session_id: str,
    db: psycopg.AsyncConnection[object],
) -> list[dict[str, str]]:
    """Return alternating user/assistant dicts, capped and token-trimmed."""
    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            """SELECT role, content FROM coach_interactions
               WHERE session_id = %s AND role IN ('user', 'assistant')
               ORDER BY created_at ASC LIMIT %s""",
            [session_id, MAX_HISTORY_TURNS * 2],
        )
        rows = await cur.fetchall()

    # Sanitise: ensure strictly alternating roles
    sanitized: list[dict[str, str]] = []
    last_role: str | None = None
    for row in rows:
        role = str(row["role"])
        if role != last_role:
            sanitized.append({"role": role, "content": str(row["content"])})
            last_role = role

    # History must not end with user — that's the current turn
    while sanitized and sanitized[-1]["role"] == "user":
        sanitized.pop()

    # Token-budget trim from oldest end (in pairs)
    total_tokens = sum(_estimate_tokens(m["content"]) for m in sanitized)
    while sanitized and total_tokens > MAX_HISTORY_TOKENS:
        dropped = sanitized.pop(0)
        total_tokens -= _estimate_tokens(dropped["content"])
        if sanitized:
            dropped2 = sanitized.pop(0)
            total_tokens -= _estimate_tokens(dropped2["content"])

    return sanitized


def rag_query_text(question: str, history: list[dict[str, str]]) -> str:
    """Use current question for RAG; fall back to last substantive turn for short queries."""
    if len(question.split()) >= SHORT_QUESTION_WORDS:
        return question
    for msg in reversed(history):
        if msg["role"] == "user" and len(msg["content"].split()) >= SHORT_QUESTION_WORDS:
            return msg["content"]
    return question
