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


# infra_current is a global table (not scoped by user_id), so reset any rows the
# critical-infra tests touch back to their seeded/empty state, same pattern as
# tests/test_infra_collectors.py.
@pytest.fixture(autouse=True)
async def _reset_infra_current() -> AsyncGenerator[None]:
    yield
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn:
        await conn.execute(
            "UPDATE public.infra_current SET status = 'unknown', metrics = '{}'::jsonb"
        )


async def _set_infra_status(
    conn: psycopg.AsyncConnection[object], source: str, status: str, age_interval: str
) -> None:
    """Set infra_current row for `source` to `status`, checked `age_interval` ago.

    `age_interval` is a Postgres interval literal, e.g. '30 minutes'.
    """
    await conn.execute(
        "UPDATE public.infra_current SET status = %s, checked_at = now() - %s::interval "
        "WHERE source = %s",
        [status, age_interval, source],
    )


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


# ── Critical infra alerting ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_critical_infra_sources_returns_recent_critical() -> None:
    from app.jobs.budget_check import _critical_infra_sources

    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn:
        await _set_infra_status(conn, "railway", "critical", "5 minutes")

    result = await _critical_infra_sources()

    assert result == ["railway"]


@pytest.mark.asyncio
async def test_critical_infra_sources_excludes_stale_critical() -> None:
    """A critical row last checked more than 2 hours ago is treated as stale, not alerted."""
    from app.jobs.budget_check import _critical_infra_sources

    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn:
        await _set_infra_status(conn, "railway", "critical", "3 hours")

    result = await _critical_infra_sources()

    assert result == []


@pytest.mark.asyncio
async def test_critical_infra_sources_excludes_non_critical() -> None:
    from app.jobs.budget_check import _critical_infra_sources

    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn:
        await _set_infra_status(conn, "railway", "degraded", "5 minutes")

    result = await _critical_infra_sources()

    assert result == []


@pytest.mark.asyncio
async def test_check_llm_budget_logs_error_for_critical_infra(
    caplog: pytest.LogCaptureFixture,
) -> None:
    import logging

    from app.jobs.budget_check import check_llm_budget

    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn:
        await _set_infra_status(conn, "vercel", "critical", "5 minutes")

    with caplog.at_level(logging.ERROR, logger="fithub.jobs"):
        await check_llm_budget()

    assert any(
        "infra critical alert" in r.message.lower() and "vercel" in r.message.lower()
        for r in caplog.records
        if r.levelno == logging.ERROR
    )


@pytest.mark.asyncio
async def test_check_llm_budget_no_infra_alert_when_healthy(
    caplog: pytest.LogCaptureFixture,
) -> None:
    import logging

    from app.jobs.budget_check import check_llm_budget

    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn:
        await _set_infra_status(conn, "vercel", "healthy", "5 minutes")

    with caplog.at_level(logging.ERROR, logger="fithub.jobs"):
        await check_llm_budget()

    assert not any("infra critical alert" in r.message.lower() for r in caplog.records)
