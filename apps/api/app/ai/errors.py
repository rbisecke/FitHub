"""Shared LLM error handler — normalises provider-specific failures to HTTP exceptions."""

from __future__ import annotations

import logging
from collections.abc import Awaitable
from typing import TypeVar

from fastapi import HTTPException

log = logging.getLogger(__name__)

T = TypeVar("T")  # noqa: UP046


async def call_llm(coro: Awaitable[T], *, context: str) -> T:  # noqa: UP047
    """Await an instructor coroutine and map known failure modes to HTTP errors.

    Args:
        coro: The instructor .create() coroutine to await.
        context: Short label used in log messages (e.g. "parse_log", "generate_plan").
    """
    try:
        return await coro
    except Exception as exc:  # noqa: BLE001
        _handle_llm_error(exc, context)
        raise  # unreachable — _handle_llm_error always raises


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
