"""Tests for the LLM budget alerting job."""

from __future__ import annotations

from collections.abc import AsyncGenerator

import psycopg
import pytest

from tests.conftest import ALICE_ID, TEST_DB_DSN


@pytest.fixture(autouse=True)
async def _clean_llm_usage() -> AsyncGenerator[None]:
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn:
        await conn.execute("DELETE FROM llm_usage WHERE user_id = %s", [str(ALICE_ID)])
    yield
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn:
        await conn.execute("DELETE FROM llm_usage WHERE user_id = %s", [str(ALICE_ID)])


async def _insert_usage(conn: psycopg.AsyncConnection[object], input_tokens: int) -> None:
    await conn.execute(
        """
        INSERT INTO llm_usage (user_id, endpoint, model, input_tokens, output_tokens, stub)
        VALUES (%s, 'chat_stream', 'claude-haiku-4-5-20251001', %s, 0, false)
        """,
        [str(ALICE_ID), input_tokens],
    )


@pytest.mark.asyncio
async def test_budget_warning_logged(caplog: pytest.LogCaptureFixture) -> None:
    """80% of a $5 budget == $4 spend. Input at $1/Mtok → 4_000_000 tokens."""
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn:
        await _insert_usage(conn, 4_000_000)

    import logging

    with caplog.at_level(logging.WARNING, logger="fithub.jobs"):
        from app.jobs.budget_check import check_llm_budget

        await check_llm_budget()

    assert any(
        "budget at" in r.message.lower() for r in caplog.records if r.levelno == logging.WARNING
    )


@pytest.mark.asyncio
async def test_budget_error_logged(caplog: pytest.LogCaptureFixture) -> None:
    """100% of a $5 budget == $5 spend. Input at $1/Mtok → 5_000_000 tokens."""
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn:
        await _insert_usage(conn, 5_000_000)

    import logging

    with caplog.at_level(logging.ERROR, logger="fithub.jobs"):
        from app.jobs.budget_check import check_llm_budget

        await check_llm_budget()

    assert any(
        "exhausted" in r.message.lower() for r in caplog.records if r.levelno == logging.ERROR
    )
