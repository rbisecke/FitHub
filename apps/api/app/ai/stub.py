"""Stub layer: when STUB_LLM=true, decorated functions return a fixture instead of calling LLM."""

from __future__ import annotations

import copy
import functools
import os
from collections.abc import Awaitable, Callable


def is_stubbed() -> bool:
    return os.environ.get("STUB_LLM", "false").lower() in ("1", "true", "yes")


def stubbed[T](
    fixture: T,
) -> Callable[[Callable[..., Awaitable[T]]], Callable[..., Awaitable[T]]]:
    """Return a deep copy of `fixture` immediately when STUB_LLM=true; otherwise call fn.

    Returns a copy, never the fixture object itself — callers (e.g. plan correction)
    mutate the object they get back, and a shared fixture would accumulate corruption
    across requests/tests (see C2).
    """

    def decorator(fn: Callable[..., Awaitable[T]]) -> Callable[..., Awaitable[T]]:
        @functools.wraps(fn)
        async def wrapper(*args: object, **kwargs: object) -> T:
            if is_stubbed():
                return copy.deepcopy(fixture)
            return await fn(*args, **kwargs)

        return wrapper

    return decorator
