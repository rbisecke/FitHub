"""Integration tests for the 28-day baseline engine."""

from __future__ import annotations

import datetime

import psycopg
import pytest

from app.engine.baselines import compute_today_recovery, get_baseline
from tests.conftest import ALICE_ID, TEST_DB_DSN

TODAY = datetime.date.today()
TODAY_TS = datetime.datetime.combine(TODAY, datetime.time(6, 0), tzinfo=datetime.UTC)


# ── Helpers ────────────────────────────────────────────────────────────────────


async def _insert_hrv(db: psycopg.AsyncConnection[object], days_ago: int, value: float) -> None:
    ts = TODAY_TS - datetime.timedelta(days=days_ago)
    await db.execute(
        """
        INSERT INTO metric_samples
            (user_id, type, value, unit, source, source_priority, started_at)
        VALUES (%s, 'hrv_sdnn', %s, 'ms', 'apple_health', 3, %s)
        ON CONFLICT (user_id, type, source, started_at) DO UPDATE SET value = EXCLUDED.value
        """,
        [str(ALICE_ID), value, ts],
    )


async def _insert_rhr(db: psycopg.AsyncConnection[object], days_ago: int, value: float) -> None:
    ts = TODAY_TS - datetime.timedelta(days=days_ago)
    await db.execute(
        """
        INSERT INTO metric_samples
            (user_id, type, value, unit, source, source_priority, started_at)
        VALUES (%s, 'rhr', %s, 'count/min', 'apple_health', 3, %s)
        ON CONFLICT (user_id, type, source, started_at) DO UPDATE SET value = EXCLUDED.value
        """,
        [str(ALICE_ID), value, ts],
    )


async def _cleanup(db: psycopg.AsyncConnection[object]) -> None:
    await db.execute("DELETE FROM derived_metrics WHERE user_id = %s", [str(ALICE_ID)])
    await db.execute("DELETE FROM metric_samples WHERE user_id = %s", [str(ALICE_ID)])


# ── get_baseline ───────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_baseline_empty_returns_none() -> None:
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as db:
        mean, sd, n = await get_baseline(str(ALICE_ID), "hrv_sdnn", db)
    assert mean is None
    assert sd is None
    assert n == 0


@pytest.mark.asyncio
async def test_baseline_excludes_today() -> None:
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as db:
        await _insert_hrv(db, days_ago=0, value=99.0)  # today → must be excluded
        mean, sd, n = await get_baseline(str(ALICE_ID), "hrv_sdnn", db)
        await _cleanup(db)

    assert mean is None
    assert n == 0


@pytest.mark.asyncio
async def test_baseline_computes_mean_sd() -> None:
    values = [40.0, 44.0, 48.0, 52.0]
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as db:
        for i, v in enumerate(values, start=1):
            await _insert_hrv(db, days_ago=i, value=v)

        mean, sd, n = await get_baseline(str(ALICE_ID), "hrv_sdnn", db)
        await _cleanup(db)

    assert mean is not None
    assert abs(mean - 46.0) < 0.1
    assert sd is not None and sd > 0
    assert n == 4


@pytest.mark.asyncio
async def test_baseline_single_value_sd_none() -> None:
    """STDDEV_SAMP of a single value is NULL in Postgres."""
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as db:
        await _insert_hrv(db, days_ago=3, value=45.0)
        mean, sd, n = await get_baseline(str(ALICE_ID), "hrv_sdnn", db)
        await _cleanup(db)

    assert mean is not None
    assert sd is None
    assert n == 1


@pytest.mark.asyncio
async def test_baseline_28_day_window() -> None:
    """Values older than 28 days are excluded."""
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as db:
        await _insert_hrv(db, days_ago=7, value=45.0)
        await _insert_hrv(db, days_ago=29, value=999.0)  # outside window

        _, _, n = await get_baseline(str(ALICE_ID), "hrv_sdnn", db)
        await _cleanup(db)

    assert n == 1  # only the 7-day-ago sample


# ── compute_today_recovery ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_compute_today_recovery_no_data_returns_low_coverage() -> None:
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as db:
        result = await compute_today_recovery(str(ALICE_ID), db)
        await _cleanup(db)

    assert result["coverage"] is not None
    assert float(str(result["coverage"])) == 0.0


@pytest.mark.asyncio
async def test_compute_today_recovery_upserts_derived_metrics() -> None:
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as db:
        # Insert 20 days of baseline HRV to get standard confidence
        for i in range(1, 21):
            await _insert_hrv(db, days_ago=i, value=45.0 + float(i % 5))
        # Today's reading
        await _insert_hrv(db, days_ago=0, value=47.0)

        result = await compute_today_recovery(str(ALICE_ID), db)

        row = await db.execute(
            "SELECT recovery_score, coverage, confidence_tier"
            " FROM derived_metrics WHERE user_id=%s AND date=%s",
            [str(ALICE_ID), TODAY],
        )
        rec = await row.fetchone()
        await _cleanup(db)

    assert rec is not None
    assert rec[0] is not None  # recovery_score
    assert result["hrv_type"] == "hrv_sdnn"


@pytest.mark.asyncio
async def test_compute_today_recovery_idempotent() -> None:
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as db:
        await _insert_hrv(db, days_ago=1, value=45.0)
        await _insert_hrv(db, days_ago=0, value=47.0)

        r1 = await compute_today_recovery(str(ALICE_ID), db)
        r2 = await compute_today_recovery(str(ALICE_ID), db)

        row = await db.execute(
            "SELECT COUNT(*) FROM derived_metrics WHERE user_id=%s AND date=%s",
            [str(ALICE_ID), TODAY],
        )
        rec = await row.fetchone()
        await _cleanup(db)

    assert rec is not None
    assert rec[0] == 1  # exactly one row (upserted, not doubled)
    assert r1["recovery_score"] == r2["recovery_score"]


@pytest.mark.asyncio
async def test_compute_today_recovery_falls_back_to_rmssd() -> None:
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as db:
        ts = TODAY_TS
        await db.execute(
            """
            INSERT INTO metric_samples
                (user_id, type, value, unit, source, source_priority, started_at)
            VALUES (%s, 'hrv_rmssd', 38.0, 'ms', 'oura', 4, %s)
            ON CONFLICT (user_id, type, source, started_at) DO UPDATE SET value = EXCLUDED.value
            """,
            [str(ALICE_ID), ts],
        )
        result = await compute_today_recovery(str(ALICE_ID), db)
        await _cleanup(db)

    assert result["hrv_type"] == "hrv_rmssd"


@pytest.mark.asyncio
async def test_confidence_tier_calibrating_under_14_days() -> None:
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as db:
        for i in range(1, 7):
            await _insert_hrv(db, days_ago=i, value=45.0)
        await _insert_hrv(db, days_ago=0, value=47.0)

        result = await compute_today_recovery(str(ALICE_ID), db)
        await _cleanup(db)

    assert result["confidence_tier"] == "calibrating_14d"


@pytest.mark.asyncio
async def test_confidence_tier_standard_28_plus_days() -> None:
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as db:
        for i in range(1, 29):
            await _insert_hrv(db, days_ago=i, value=45.0 + float(i % 4))
        await _insert_hrv(db, days_ago=0, value=47.0)

        result = await compute_today_recovery(str(ALICE_ID), db)
        await _cleanup(db)

    assert result["confidence_tier"] == "standard"
