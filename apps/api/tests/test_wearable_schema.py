"""Tests for wearable schema: data_connections, metric_samples, derived_metrics."""

from __future__ import annotations

import datetime

import psycopg
import pytest

from tests.conftest import ALICE_ID, TEST_DB_DSN


@pytest.mark.asyncio
async def test_data_connections_unique_per_user_provider() -> None:
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as db:
        await db.execute(
            """
            INSERT INTO data_connections (user_id, provider, config)
            VALUES (%s, 'apple_health',
                    '{"ingest_token_hash":"sha256:abc","ingest_token_prefix":"fh_ah_abc"}')
            ON CONFLICT (user_id, provider) DO NOTHING
            """,
            [str(ALICE_ID)],
        )
        with pytest.raises(psycopg.errors.UniqueViolation):
            await db.execute(
                """
                INSERT INTO data_connections (user_id, provider, config)
                VALUES (%s, 'apple_health',
                        '{"ingest_token_hash":"sha256:xyz","ingest_token_prefix":"fh_ah_xyz"}')
                """,
                [str(ALICE_ID)],
            )

    # cleanup
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as db:
        await db.execute("DELETE FROM data_connections WHERE user_id = %s", [str(ALICE_ID)])


@pytest.mark.asyncio
async def test_apple_health_provider_null_access_token() -> None:
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as db:
        await db.execute(
            """
            INSERT INTO data_connections (user_id, provider, config, access_token_enc)
            VALUES (%s, 'apple_health', '{}', NULL)
            ON CONFLICT (user_id, provider) DO NOTHING
            """,
            [str(ALICE_ID)],
        )
        row = await db.execute(
            "SELECT access_token_enc FROM data_connections"
            " WHERE user_id=%s AND provider='apple_health'",
            [str(ALICE_ID)],
        )
        rec = await row.fetchone()
        assert rec is not None
        assert rec[0] is None

    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as db:
        await db.execute("DELETE FROM data_connections WHERE user_id = %s", [str(ALICE_ID)])


@pytest.mark.asyncio
async def test_metric_samples_dedup_same_source() -> None:
    ts = datetime.datetime(2026, 1, 1, 4, 0, tzinfo=datetime.UTC)
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as db:
        await db.execute(
            """
            INSERT INTO metric_samples
                (user_id, type, value, unit, source, source_priority, started_at)
            VALUES (%s, 'hrv_sdnn', 45, 'ms', 'apple_health', 3, %s)
            """,
            [str(ALICE_ID), ts],
        )
        with pytest.raises(psycopg.errors.UniqueViolation):
            await db.execute(
                """
                INSERT INTO metric_samples
                    (user_id, type, value, unit, source, source_priority, started_at)
                VALUES (%s, 'hrv_sdnn', 48, 'ms', 'apple_health', 3, %s)
                """,
                [str(ALICE_ID), ts],
            )

    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as db:
        await db.execute("DELETE FROM metric_samples WHERE user_id = %s", [str(ALICE_ID)])


@pytest.mark.asyncio
async def test_hrv_sdnn_and_rmssd_coexist() -> None:
    ts = datetime.datetime(2026, 1, 2, 4, 0, tzinfo=datetime.UTC)
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as db:
        await db.execute(
            """
            INSERT INTO metric_samples
                (user_id, type, value, unit, source, source_priority, started_at)
            VALUES
                (%s, 'hrv_sdnn',  45, 'ms', 'apple_health', 3, %s),
                (%s, 'hrv_rmssd', 38, 'ms', 'oura',         4, %s)
            """,
            [str(ALICE_ID), ts, str(ALICE_ID), ts],
        )
        row = await db.execute(
            "SELECT COUNT(*) FROM metric_samples"
            " WHERE user_id=%s AND type IN ('hrv_sdnn','hrv_rmssd')",
            [str(ALICE_ID)],
        )
        rec = await row.fetchone()
        assert rec is not None
        assert rec[0] == 2

    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as db:
        await db.execute("DELETE FROM metric_samples WHERE user_id = %s", [str(ALICE_ID)])


@pytest.mark.asyncio
async def test_derived_metrics_unique_per_user_date() -> None:
    today = datetime.date(2026, 1, 3)
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as db:
        await db.execute(
            "INSERT INTO derived_metrics (user_id, date, recovery_score) VALUES (%s, %s, 0.75)",
            [str(ALICE_ID), today],
        )
        with pytest.raises(psycopg.errors.UniqueViolation):
            await db.execute(
                "INSERT INTO derived_metrics (user_id, date, recovery_score) VALUES (%s, %s, 0.80)",
                [str(ALICE_ID), today],
            )

    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as db:
        await db.execute("DELETE FROM derived_metrics WHERE user_id = %s", [str(ALICE_ID)])
