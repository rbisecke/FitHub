"""Tests for error_events DB writes triggered by 5xx middleware."""

from __future__ import annotations

import uuid

import psycopg
import pytest

from tests.conftest import TEST_DB_DSN


@pytest.mark.asyncio
async def test_error_events_table_exists() -> None:
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN) as db, db.cursor() as cur:
        await cur.execute(
            """
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'error_events'
                """
        )
        row = await cur.fetchone()
    assert row is not None, "error_events table must exist"


@pytest.mark.asyncio
async def test_write_error_event_inserts_row() -> None:
    from app.middleware.logging import _write_error_event

    request_id = str(uuid.uuid4())

    await _write_error_event(
        user_id=None,
        path="/api/v1/test-error",
        method="GET",
        status_code=500,
        request_id=request_id,
        duration_ms=123,
    )

    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN) as db, db.cursor() as cur:
        await cur.execute(
            "SELECT path, method, status_code, duration_ms FROM error_events WHERE request_id = %s",
            [request_id],
        )
        row = await cur.fetchone()

    assert row is not None, "error_event row should be inserted"
    path, method, status_code, duration_ms = row
    assert path == "/api/v1/test-error"
    assert method == "GET"
    assert status_code == 500
    assert duration_ms == 123
