"""Write llm_usage rows after each real LLM interaction."""

from __future__ import annotations

import logging
import uuid

import psycopg

log = logging.getLogger("fithub.coach")


async def write_llm_usage(
    db: psycopg.AsyncConnection[object],
    *,
    user_id: uuid.UUID,
    session_id: uuid.UUID | None,
    endpoint: str,
    model: str,
    input_tokens: int,
    output_tokens: int,
    cache_read_tokens: int = 0,
    cache_write_tokens: int = 0,
    rag_chunks_used: int | None = None,
    max_rrf_score: float | None = None,
    ttft_ms: int | None = None,
    duration_ms: int | None = None,
    error_code: str | None = None,
    error_msg: str | None = None,
    stub: bool = False,
) -> None:
    """Insert one llm_usage row. Errors are logged and swallowed so they never
    break the chat response."""
    try:
        await db.execute(
            """
            INSERT INTO llm_usage (
                user_id, session_id, endpoint, model,
                input_tokens, output_tokens, cache_read_tokens, cache_write_tokens,
                rag_chunks_used, max_rrf_score, ttft_ms, duration_ms,
                error_code, error_msg, stub
            ) VALUES (
                %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, %s
            )
            """,
            [
                str(user_id),
                str(session_id) if session_id is not None else None,
                endpoint,
                model,
                input_tokens,
                output_tokens,
                cache_read_tokens,
                cache_write_tokens,
                rag_chunks_used,
                max_rrf_score,
                ttft_ms,
                duration_ms,
                error_code,
                error_msg,
                stub,
            ],
        )
    except Exception:
        log.exception("Failed to write llm_usage row")
