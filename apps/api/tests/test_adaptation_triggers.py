"""Unit tests for adaptation trigger detection."""

from __future__ import annotations

from datetime import date, timedelta

import psycopg
import pytest

from tests.conftest import ALICE_ID, TEST_DB_DSN


@pytest.mark.asyncio
async def test_detect_no_triggers_when_healthy() -> None:
    from app.engine.adaptation_triggers import detect_triggers

    # Create a plan so detect_triggers can find it
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN) as db:
        async with db.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO plans (user_id, goal, title, start_date, end_date, branch_name, weeks)
                VALUES (%s, 'general_fitness', 'Trigger Test', current_date, current_date + 56,
                        'plan/trigger-test', 8)
                RETURNING id::text
                """,
                [str(ALICE_ID)],
            )
            row = await cur.fetchone()
        await db.commit()
        plan_id = row[0]  # type: ignore[index]

        triggers = await detect_triggers(str(ALICE_ID), plan_id, db)

    assert isinstance(triggers, list)


@pytest.mark.asyncio
async def test_detect_low_readiness_trigger() -> None:
    from app.engine.adaptation_triggers import detect_triggers

    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN) as db:
        async with db.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO plans (user_id, goal, title, start_date, end_date, branch_name, weeks)
                VALUES (%s, 'general_fitness', 'Readiness Test', current_date, current_date + 56,
                        'plan/readiness-test', 8)
                RETURNING id::text
                """,
                [str(ALICE_ID)],
            )
            row = await cur.fetchone()
        plan_id = row[0]  # type: ignore[index]

        for i in range(4):
            d = date.today() - timedelta(days=i)
            await db.execute(
                """
                INSERT INTO derived_metrics
                    (user_id, date, recovery_score, coverage, confidence_tier, baseline_days)
                VALUES (%s, %s, 0.3, 0.4, 'standard', 30)
                ON CONFLICT (user_id, date) DO UPDATE SET recovery_score = 0.3
                """,
                [str(ALICE_ID), d],
            )
        await db.commit()

        triggers = await detect_triggers(str(ALICE_ID), plan_id, db)

    types = [t["type"] for t in triggers]
    assert "low_readiness" in types
    lr = next(t for t in triggers if t["type"] == "low_readiness")
    assert isinstance(lr["data"], dict)
    assert lr["data"]["streak_days"] >= 3  # type: ignore[index]


@pytest.mark.asyncio
async def test_acwr_helper_returns_none_with_no_data() -> None:
    from app.engine.adaptation_triggers import _compute_acwr

    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN) as db:
        result = await _compute_acwr(str(ALICE_ID), db)

    assert result is None
