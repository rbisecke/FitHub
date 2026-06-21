"""Stub layer: when STUB_LLM=true, decorated functions return a fixture instead of calling LLM."""

from __future__ import annotations

import functools
import os
from collections.abc import Awaitable, Callable


def is_stubbed() -> bool:
    return os.environ.get("STUB_LLM", "false").lower() in ("1", "true", "yes")


def stubbed[T](
    fixture: T,
) -> Callable[[Callable[..., Awaitable[T]]], Callable[..., Awaitable[T]]]:
    """Return `fixture` immediately when STUB_LLM=true; otherwise call the real async function."""

    def decorator(fn: Callable[..., Awaitable[T]]) -> Callable[..., Awaitable[T]]:
        @functools.wraps(fn)
        async def wrapper(*args: object, **kwargs: object) -> T:
            if is_stubbed():
                return fixture
            return await fn(*args, **kwargs)

        return wrapper

    return decorator
