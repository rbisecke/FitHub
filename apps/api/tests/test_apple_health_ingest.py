"""Tests for Apple Health ingest endpoint and parsing logic."""

from __future__ import annotations

import datetime

import psycopg
import pytest
from httpx import AsyncClient

from app.integrations.apple_health import _parse_hae_timestamp, compute_sleep_score
from tests.conftest import ALICE_ID, TEST_DB_DSN

HAE_PAYLOAD = {
    "data": {
        "metrics": [
            {
                "name": "heart_rate_variability_sdnn",
                "units": "ms",
                "data": [{"date": "2026-06-20T06:00:00+00:00", "qty": 45.2}],
            },
            {
                "name": "resting_heart_rate",
                "units": "count/min",
                "data": [{"date": "2026-06-20 00:00:00", "qty": 52.0}],
            },
        ]
    }
}


# ── Timestamp parsing ──────────────────────────────────────────────────────────


class TestTimestampParsing:
    def test_iso8601_with_colon_offset(self) -> None:
        ts = _parse_hae_timestamp("2026-06-20T06:00:00+00:00")
        assert ts.tzinfo == datetime.UTC

    def test_space_separator_normalized(self) -> None:
        ts = _parse_hae_timestamp("2026-06-20 06:00:00")
        assert ts.year == 2026

    def test_offset_without_colon_normalized(self) -> None:
        ts = _parse_hae_timestamp("2026-06-20T06:00:00+0000")
        assert ts.tzinfo == datetime.UTC

    def test_positive_offset_converted_to_utc(self) -> None:
        ts = _parse_hae_timestamp("2026-06-20T06:00:00+10:00")
        assert ts.day == 19 and ts.hour == 20


# ── Sleep score derivation ─────────────────────────────────────────────────────


class TestSleepScore:
    def test_good_sleep_scores_high(self) -> None:
        stages = [
            {"stage": "ASLEEPDEEP", "duration_s": 5400},
            {"stage": "ASLEEPREM", "duration_s": 5400},
            {"stage": "ASLEEPCORE", "duration_s": 14400},
            {"stage": "AWAKE", "duration_s": 1800},
        ]
        assert compute_sleep_score(stages) is not None
        assert compute_sleep_score(stages) >= 70.0  # type: ignore[operator]

    def test_insufficient_sleep_returns_none(self) -> None:
        assert compute_sleep_score([{"stage": "ASLEEPCORE", "duration_s": 1800}]) is None

    def test_all_light_sleep_scores_lower_than_with_deep(self) -> None:
        all_light = [{"stage": "ASLEEPCORE", "duration_s": 28800}]
        with_deep = [
            {"stage": "ASLEEPCORE", "duration_s": 18000},
            {"stage": "ASLEEPDEEP", "duration_s": 5400},
            {"stage": "ASLEEPREM", "duration_s": 5400},
        ]
        score_light = compute_sleep_score(all_light)
        score_deep = compute_sleep_score(with_deep)
        assert score_light is not None and score_deep is not None
        assert score_light < score_deep

    def test_inbed_stages_ignored(self) -> None:
        stages = [
            {"stage": "INBED", "duration_s": 28800},
            {"stage": "ASLEEPCORE", "duration_s": 21600},
        ]
        assert compute_sleep_score(stages) is not None


# ── Ingest endpoint integration tests ─────────────────────────────────────────


@pytest.mark.asyncio
async def test_ingest_requires_valid_token(anon_client: AsyncClient) -> None:
    r = await anon_client.post(
        "/api/v1/integrations/apple-health/sync",
        headers={"Authorization": "Bearer invalid"},
        json=HAE_PAYLOAD,
    )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_generate_token_returns_plaintext_once(alice_client: AsyncClient) -> None:
    r = await alice_client.post("/api/v1/integrations/apple-health/connect")
    assert r.status_code == 200
    data = r.json()
    assert data["token"].startswith("fh_ah_")
    assert len(data["token"]) >= 32
    assert data["token_prefix"] == data["token"][:12]

    # cleanup
    await alice_client.delete("/api/v1/integrations/apple-health/token")


@pytest.mark.asyncio
async def test_ingest_writes_hrv_sdnn_not_rmssd(
    alice_client: AsyncClient, anon_client: AsyncClient
) -> None:
    token_r = await alice_client.post("/api/v1/integrations/apple-health/connect")
    token = token_r.json()["token"]

    r = await anon_client.post(
        "/api/v1/integrations/apple-health/sync",
        headers={"Authorization": f"Bearer {token}"},
        json=HAE_PAYLOAD,
    )
    assert r.status_code == 200
    assert r.json()["rows_inserted"] == 2

    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN) as db:
        row = await db.execute(
            "SELECT type FROM metric_samples WHERE user_id=%s AND type='hrv_sdnn' LIMIT 1",
            [str(ALICE_ID)],
        )
        rec = await row.fetchone()
    assert rec is not None
    assert rec[0] == "hrv_sdnn"

    await alice_client.delete("/api/v1/integrations/apple-health/token")


@pytest.mark.asyncio
async def test_ingest_idempotent(alice_client: AsyncClient, anon_client: AsyncClient) -> None:
    token_r = await alice_client.post("/api/v1/integrations/apple-health/connect")
    token = token_r.json()["token"]

    for _ in range(3):
        r = await anon_client.post(
            "/api/v1/integrations/apple-health/sync",
            headers={"Authorization": f"Bearer {token}"},
            json=HAE_PAYLOAD,
        )
        assert r.status_code == 200

    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN) as db:
        row = await db.execute(
            "SELECT COUNT(*) FROM metric_samples WHERE user_id=%s AND type='hrv_sdnn'",
            [str(ALICE_ID)],
        )
        rec = await row.fetchone()
    assert rec is not None
    assert rec[0] == 1  # ON CONFLICT DO UPDATE — no duplicates

    await alice_client.delete("/api/v1/integrations/apple-health/token")


@pytest.mark.asyncio
async def test_revoke_invalidates_token(
    alice_client: AsyncClient, anon_client: AsyncClient
) -> None:
    token_r = await alice_client.post("/api/v1/integrations/apple-health/connect")
    token = token_r.json()["token"]

    await alice_client.delete("/api/v1/integrations/apple-health/token")

    r = await anon_client.post(
        "/api/v1/integrations/apple-health/sync",
        headers={"Authorization": f"Bearer {token}"},
        json={"data": {"metrics": []}},
    )
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_unknown_metrics_silently_ignored(
    alice_client: AsyncClient, anon_client: AsyncClient
) -> None:
    token_r = await alice_client.post("/api/v1/integrations/apple-health/connect")
    token = token_r.json()["token"]

    r = await anon_client.post(
        "/api/v1/integrations/apple-health/sync",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "data": {
                "metrics": [
                    {
                        "name": "some_future_metric",
                        "units": "?",
                        "data": [{"date": "2026-06-20T06:00:00+00:00", "qty": 1}],
                    }
                ]
            }
        },
    )
    assert r.status_code == 200
    assert r.json()["rows_inserted"] == 0

    await alice_client.delete("/api/v1/integrations/apple-health/token")


@pytest.mark.asyncio
async def test_list_integrations_requires_auth(anon_client: AsyncClient) -> None:
    r = await anon_client.get("/api/v1/integrations")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_list_integrations_returns_connection(alice_client: AsyncClient) -> None:
    await alice_client.post("/api/v1/integrations/apple-health/connect")
    r = await alice_client.get("/api/v1/integrations")
    assert r.status_code == 200
    data = r.json()
    assert any(c["provider"] == "apple_health" for c in data)

    await alice_client.delete("/api/v1/integrations/apple-health/token")
