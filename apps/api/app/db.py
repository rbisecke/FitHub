from __future__ import annotations

from collections.abc import AsyncGenerator

import psycopg
from psycopg_pool import AsyncConnectionPool

_pool: AsyncConnectionPool[psycopg.AsyncConnection[object]] | None = None


async def init_pool(dsn: str) -> None:
    global _pool
    _pool = AsyncConnectionPool(dsn, min_size=1, max_size=10, open=False)
    await _pool.open()


async def close_pool() -> None:
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


async def get_db() -> AsyncGenerator[psycopg.AsyncConnection[object]]:
    if _pool is None:
        raise RuntimeError("DB pool not initialised — did the lifespan run?")
    async with _pool.connection() as conn:
        yield conn
