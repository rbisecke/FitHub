"""Shared LLM error handler — normalises provider-specific failures to HTTP exceptions."""

from __future__ import annotations

import logging
import time
import uuid
from collections.abc import Awaitable
from typing import TypeVar

import psycopg
from fastapi import HTTPException

log = logging.getLogger(__name__)

T = TypeVar("T")  # noqa: UP046


async def call_llm(  # noqa: UP047
    coro: Awaitable[T],
    *,
    context: str,
    user_id: uuid.UUID | None = None,
    db: psycopg.AsyncConnection[object] | None = None,
) -> T:
    """Await an instructor coroutine and map known failure modes to HTTP errors.

    If user_id and db are provided, writes an llm_usage row on success.

    Args:
        coro: The instructor .create() coroutine to await.
        context: Short label used in log messages and stored as endpoint name.
        user_id: If provided (with db), usage is recorded to llm_usage.
        db: Active DB connection for the usage write.
    """
    t0 = time.perf_counter()
    try:
        result = await coro
    except Exception as exc:  # noqa: BLE001
        _handle_llm_error(exc, context)
        raise  # unreachable — _handle_llm_error always raises

    if user_id is not None and db is not None:
        try:
            raw = getattr(result, "_raw_response", None)
            if raw is not None:
                usage = raw.usage
                from app.ai.usage import write_llm_usage

                await write_llm_usage(
                    db,
                    user_id=user_id,
                    session_id=None,
                    endpoint=context,
                    model=getattr(raw, "model", "unknown"),
                    input_tokens=usage.input_tokens,
                    output_tokens=usage.output_tokens,
                    cache_read_tokens=getattr(usage, "cache_read_input_tokens", 0),
                    cache_write_tokens=getattr(usage, "cache_creation_input_tokens", 0),
                    duration_ms=round((time.perf_counter() - t0) * 1000),
                )
        except Exception:
            log.debug("Failed to capture LLM usage for context=%s", context, exc_info=True)

    return result


def _handle_llm_error(exc: Exception, context: str) -> None:
    # instructor retry exhaustion
    try:
        from instructor.core import InstructorRetryException

        if isinstance(exc, InstructorRetryException):
            log.warning("LLM schema validation failed after retries [%s]: %s", context, exc)
            raise HTTPException(
                status_code=502, detail="LLM returned invalid output after retries"
            ) from exc
    except ImportError:
        pass

    exc_str = str(exc).lower()

    # Timeout — httpx raises TimeoutException; openai raises APITimeoutError
    if "timeout" in exc_str or "timed out" in exc_str:
        log.warning("LLM timeout [%s]: %s", context, exc)
        raise HTTPException(status_code=504, detail="LLM request timed out") from exc

    # Billing / credit exhaustion (Anthropic returns 400 with "credit balance" message)
    if any(k in exc_str for k in ("credit balance", "billing", "insufficient_quota")):
        log.warning("LLM billing error [%s]: %s", context, exc)
        raise HTTPException(
            status_code=503,
            detail="AI coaching is temporarily unavailable. Please try again later.",
        ) from exc

    # Rate limit / quota exhaustion
    if any(k in exc_str for k in ("rate", "429", "quota", "too many")):
        log.warning("LLM rate limited [%s]: %s", context, exc)
        raise HTTPException(status_code=503, detail="LLM rate limited — retry shortly") from exc

    # Connection errors (Ollama not running, network issue)
    if any(k in exc_str for k in ("connection", "refused", "unreachable", "connect")):
        log.error("LLM connection error [%s]: %s", context, exc)
        raise HTTPException(
            status_code=503, detail="LLM backend unreachable — check server is running"
        ) from exc

    log.exception("Unexpected LLM error [%s]", context)
    raise HTTPException(status_code=500, detail="LLM call failed") from exc
