"""Scheduled jobs: LLM budget alerting and error_events retention cleanup."""

from __future__ import annotations

import logging

log = logging.getLogger("fithub.jobs")

# Anthropic claude-haiku-4-5 pricing (USD per million tokens)
_INPUT_PER_MTOK = 1.00
_OUTPUT_PER_MTOK = 5.00
_CACHE_READ_PER_MTOK = 0.10
_CACHE_WRITE_PER_MTOK = 1.25

_SPEND_SQL = """
    SELECT
        COALESCE(SUM(
            input_tokens        * %(input)s  / 1e6
            + output_tokens     * %(output)s / 1e6
            + cache_read_tokens * %(cr)s     / 1e6
            + cache_write_tokens * %(cw)s    / 1e6
        ), 0) AS spend_usd
    FROM llm_usage
    WHERE created_at > now() - interval '30 days'
      AND stub = false
"""


async def check_llm_budget() -> None:
    """Query rolling 30-day LLM spend and log a warning or error if near/over budget."""
    from app.config import get_settings
    from app.db import pool_connection

    try:
        settings = get_settings()
        budget = settings.anthropic_monthly_budget_usd
        async with pool_connection().connection() as db, db.cursor() as cur:
            await cur.execute(
                _SPEND_SQL,
                {
                    "input": _INPUT_PER_MTOK,
                    "output": _OUTPUT_PER_MTOK,
                    "cr": _CACHE_READ_PER_MTOK,
                    "cw": _CACHE_WRITE_PER_MTOK,
                },
            )
            row = await cur.fetchone()
        spend = float(row[0]) if row else 0.0  # type: ignore[index]
        pct = spend / budget * 100 if budget else 0.0
        if spend >= budget:
            log.error(
                "LLM budget exhausted: $%.4f of $%.2f monthly budget spent (rolling 30 days)",
                spend,
                budget,
            )
        elif spend >= budget * 0.8:
            log.warning(
                "LLM budget at %.0f%%: $%.4f of $%.2f spent (rolling 30 days)",
                pct,
                spend,
                budget,
            )
    except Exception:
        log.exception("check_llm_budget failed")


async def cleanup_old_error_events() -> None:
    """Delete error_events rows older than 30 days."""
    from app.db import pool_connection

    try:
        async with pool_connection().connection() as db:
            await db.execute(
                "DELETE FROM error_events WHERE created_at < now() - interval '30 days'"
            )
    except Exception:
        log.exception("cleanup_old_error_events failed")
