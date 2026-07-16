"""Tests for the infra monitoring collector jobs (Supabase/Railway/Vercel)."""

from __future__ import annotations

import json
import logging
from collections.abc import AsyncGenerator, Generator
from datetime import UTC, datetime, timedelta

import psycopg
import pytest
from pytest_httpx import HTTPXMock

from app.config import get_settings
from app.jobs.infra_collectors import (
    _build_supabase_metrics,
    _compute_last_restart_at,
    _parse_prometheus,
    _railway_status,
    _supabase_status,
    _vercel_status,
    collect_railway_status,
    collect_supabase_infra,
    collect_vercel_status,
)
from tests.conftest import TEST_DB_DSN


def _iso_ago(**kwargs: float) -> str:
    return (datetime.now(UTC) - timedelta(**kwargs)).isoformat()


# ── Cleanup: these tables are global (not scoped by user_id), so reset any
# rows the full-path tests touch back to their seeded/empty state. ───────────


@pytest.fixture(autouse=True)
async def _reset_infra_tables() -> AsyncGenerator[None]:
    yield
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn:
        await conn.execute(
            "UPDATE public.infra_current SET status = 'unknown', metrics = '{}'::jsonb"
        )
        await conn.execute("DELETE FROM public.infra_history")
        await conn.execute("DELETE FROM public.deployment_events WHERE platform_id LIKE 'test-%'")


@pytest.fixture(autouse=True)
def _clear_settings_cache() -> Generator[None]:
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


# ── Prometheus parser ────────────────────────────────────────────────────────

_SAMPLE_PROMETHEUS_TEXT = """\
# HELP node_memory_MemTotal_bytes Total memory
# TYPE node_memory_MemTotal_bytes gauge
node_memory_MemTotal_bytes 1.6e+10
# HELP node_memory_MemAvailable_bytes Available memory
# TYPE node_memory_MemAvailable_bytes gauge
node_memory_MemAvailable_bytes 4e+09
# HELP node_load1 1m load average
# TYPE node_load1 gauge
node_load1 0.85
# HELP supavisor_connections_active Active pooled connections
# TYPE supavisor_connections_active gauge
supavisor_connections_active{tenant="default"} 12
# HELP postgresql_restarts_total Restart count
# TYPE postgresql_restarts_total counter
postgresql_restarts_total 0
# HELP gotrue_running Whether gotrue is up
# TYPE gotrue_running gauge
gotrue_running 1
# HELP node_filesystem_size_bytes Filesystem size
# TYPE node_filesystem_size_bytes gauge
node_filesystem_size_bytes{device="/dev/sda1",fstype="ext4",mountpoint="/"} 1.07e+11
# HELP node_filesystem_avail_bytes Filesystem free space
# TYPE node_filesystem_avail_bytes gauge
node_filesystem_avail_bytes{device="/dev/sda1",fstype="ext4",mountpoint="/"} 5.35e+10
# A metric we don't care about — must be ignored.
some_other_totally_unrelated_metric 42
# A duplicate line for a wanted metric — first occurrence wins.
node_load1 99.9
"""


def test_parse_prometheus_extracts_wanted_metrics() -> None:
    result = _parse_prometheus(_SAMPLE_PROMETHEUS_TEXT)

    assert result["node_memory_MemTotal_bytes"] == 1.6e10
    assert result["node_memory_MemAvailable_bytes"] == 4e9
    assert result["node_load1"] == 0.85  # first occurrence kept, not the duplicate 99.9
    assert result["supavisor_connections_active"] == 12
    assert result["postgresql_restarts_total"] == 0
    assert result["gotrue_running"] == 1
    assert result["node_filesystem_size_bytes"] == 1.07e11
    assert result["node_filesystem_avail_bytes"] == 5.35e10
    assert "some_other_totally_unrelated_metric" not in result


def test_parse_prometheus_ignores_blank_and_malformed_lines() -> None:
    text = "\n# just a comment\nnode_load1\nnode_load1 1.5\n   \n"
    result = _parse_prometheus(text)
    assert result == {"node_load1": 1.5}


def test_parse_prometheus_empty_input() -> None:
    assert _parse_prometheus("") == {}


def test_parse_prometheus_filesystem_metrics_use_root_mountpoint() -> None:
    """Real node_exporter output emits one filesystem line per mountpoint;
    only the mountpoint="/" line should be kept, regardless of line order."""
    text = """\
node_filesystem_size_bytes{device="/dev/sda2",fstype="ext4",mountpoint="/boot"} 5e+08
node_filesystem_size_bytes{device="/dev/sda1",fstype="ext4",mountpoint="/"} 1.07e+11
node_filesystem_size_bytes{device="tmpfs",fstype="tmpfs",mountpoint="/dev/shm"} 8e+09
node_filesystem_avail_bytes{device="/dev/sda2",fstype="ext4",mountpoint="/boot"} 4e+08
node_filesystem_avail_bytes{device="/dev/sda1",fstype="ext4",mountpoint="/"} 5.35e+10
node_filesystem_avail_bytes{device="tmpfs",fstype="tmpfs",mountpoint="/dev/shm"} 7.9e+09
"""
    result = _parse_prometheus(text)
    assert result["node_filesystem_size_bytes"] == 1.07e11
    assert result["node_filesystem_avail_bytes"] == 5.35e10


# ── Derived metrics / status thresholds ──────────────────────────────────────


def test_build_supabase_metrics_computes_percentages() -> None:
    raw = _parse_prometheus(_SAMPLE_PROMETHEUS_TEXT)
    metrics = _build_supabase_metrics(raw)

    assert metrics["memory_used_pct"] == 75.0  # 1 - 4e9/1.6e10 = 0.75
    assert metrics["disk_used_pct"] == 50.0  # 1 - 5.35e10/1.07e11 = 0.5
    assert metrics["connections_active"] == 12
    assert metrics["db_restarts_total"] == 0
    assert metrics["gotrue_running"] is True
    assert metrics["load_1m"] == 0.85


def test_build_supabase_metrics_handles_missing_totals() -> None:
    metrics = _build_supabase_metrics({})
    assert metrics["memory_used_pct"] is None
    assert metrics["disk_used_pct"] is None
    assert metrics["connections_active"] == 0
    assert metrics["gotrue_running"] is False


@pytest.mark.parametrize(
    ("metrics", "expected"),
    [
        (
            {"memory_used_pct": 50, "disk_used_pct": 50, "gotrue_running": True},
            "healthy",
        ),
        (
            {"memory_used_pct": 85, "disk_used_pct": 50, "gotrue_running": True},
            "degraded",
        ),
        (
            {"memory_used_pct": 50, "disk_used_pct": 96, "gotrue_running": True},
            "critical",
        ),
        (
            {
                "memory_used_pct": 50,
                "disk_used_pct": 50,
                "gotrue_running": True,
                "last_restart_at": _iso_ago(minutes=5),
            },
            "degraded",  # a recent restart degrades this dimension
        ),
        (
            {
                "memory_used_pct": 50,
                "disk_used_pct": 50,
                "gotrue_running": True,
                "last_restart_at": _iso_ago(hours=3),
            },
            "healthy",  # outside the 2h recency window — no longer counts
        ),
        ({"memory_used_pct": 50, "disk_used_pct": 50, "gotrue_running": False}, "critical"),
    ],
)
def test_supabase_status_thresholds(metrics: dict[str, object], expected: str) -> None:
    assert _supabase_status(metrics) == expected


def test_compute_last_restart_at_first_bump_stamps_now() -> None:
    """A restart-counter increase with no prior restart on record stamps `now()`."""
    result = _compute_last_restart_at(1, {"db_restarts_total": 0})
    assert result is not None
    assert (datetime.now(UTC) - datetime.fromisoformat(result)).total_seconds() < 5


def test_compute_last_restart_at_no_bump_carries_forward_previous_value() -> None:
    """No new restart (count unchanged) carries forward the prior last_restart_at."""
    previous_ts = _iso_ago(hours=3)
    result = _compute_last_restart_at(5, {"db_restarts_total": 5, "last_restart_at": previous_ts})
    assert result == previous_ts


def test_compute_last_restart_at_no_previous_record_returns_none() -> None:
    assert _compute_last_restart_at(0, None) is None
    assert _compute_last_restart_at(0, {}) is None


@pytest.mark.parametrize(
    ("metrics", "expected"),
    [
        ({"deploy_status": "SUCCESS", "http_error_rate_pct": 0}, "healthy"),
        ({"deploy_status": "SUCCESS", "http_error_rate_pct": 2}, "degraded"),
        ({"deploy_status": "SLEEPING", "http_error_rate_pct": 0}, "degraded"),
        ({"deploy_status": "CRASHED", "http_error_rate_pct": 0}, "critical"),
        ({"deploy_status": "SUCCESS", "http_error_rate_pct": 10}, "critical"),
        ({"deploy_status": "BUILDING", "http_error_rate_pct": 0}, "unknown"),
    ],
)
def test_railway_status_thresholds(metrics: dict[str, object], expected: str) -> None:
    assert _railway_status(metrics) == expected


@pytest.mark.parametrize(
    ("state", "expected"),
    [
        ("READY", "healthy"),
        ("BUILDING", "degraded"),
        ("QUEUED", "degraded"),
        ("CANCELED", "degraded"),
        ("ERROR", "critical"),
        ("", "unknown"),
    ],
)
def test_vercel_status_thresholds(state: str, expected: str) -> None:
    assert _vercel_status({"last_deploy_state": state}) == expected


# ── Graceful skip when credentials are unconfigured ──────────────────────────


async def test_collect_supabase_infra_skips_without_ref(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    monkeypatch.setenv("SUPABASE_PROJECT_REF", "")
    monkeypatch.setenv("SUPABASE_URL", "not-a-real-url")  # forces supabase_ref == ""
    get_settings.cache_clear()

    with caplog.at_level(logging.DEBUG, logger="fithub.jobs"):
        await collect_supabase_infra()  # must not raise

    assert any("skipping" in r.message for r in caplog.records)

    row = await _fetch_infra_current("supabase")
    assert row is not None
    assert row["status"] == "unknown"  # collector never wrote to it


async def test_collect_railway_status_skips_without_credentials(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    monkeypatch.setenv("RAILWAY_TOKEN", "")
    monkeypatch.setenv("RAILWAY_SERVICE_ID", "")
    get_settings.cache_clear()

    with caplog.at_level(logging.DEBUG, logger="fithub.jobs"):
        await collect_railway_status()  # must not raise

    assert any("skipping" in r.message for r in caplog.records)

    row = await _fetch_infra_current("railway")
    assert row is not None
    assert row["status"] == "unknown"  # collector never wrote to it


async def test_collect_vercel_status_skips_without_credentials(
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    monkeypatch.setenv("VERCEL_TOKEN", "")
    monkeypatch.setenv("VERCEL_PROJECT_ID", "")
    get_settings.cache_clear()

    with caplog.at_level(logging.DEBUG, logger="fithub.jobs"):
        await collect_vercel_status()  # must not raise

    assert any("skipping" in r.message for r in caplog.records)

    row = await _fetch_infra_current("vercel")
    assert row is not None
    assert row["status"] == "unknown"  # collector never wrote to it


async def test_collectors_fail_soft_on_http_error(
    monkeypatch: pytest.MonkeyPatch,
    httpx_mock: HTTPXMock,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """A non-200 upstream response must be logged, never raised into the scheduler."""
    monkeypatch.setenv("SUPABASE_PROJECT_REF", "testref")
    get_settings.cache_clear()
    httpx_mock.add_response(
        url="https://testref.supabase.co/customer/v1/privileged/metrics", status_code=503
    )

    with caplog.at_level(logging.ERROR, logger="fithub.jobs"):
        await collect_supabase_infra()  # must not raise

    assert any("HTTP 503" in r.message for r in caplog.records)


# ── Full collector path (mocked HTTP, real local DB) ─────────────────────────


async def _fetch_infra_current(source: str) -> psycopg.rows.DictRow | None:
    async with (
        await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn,
        conn.cursor(row_factory=psycopg.rows.dict_row) as cur,
    ):
        await cur.execute(
            "SELECT status, metrics FROM public.infra_current WHERE source = %s", (source,)
        )
        return await cur.fetchone()


async def test_collect_supabase_infra_full_path(
    monkeypatch: pytest.MonkeyPatch, httpx_mock: HTTPXMock
) -> None:
    monkeypatch.setenv("SUPABASE_PROJECT_REF", "testref")
    get_settings.cache_clear()
    httpx_mock.add_response(
        url="https://testref.supabase.co/customer/v1/privileged/metrics",
        text=_SAMPLE_PROMETHEUS_TEXT,
    )

    await collect_supabase_infra()

    row = await _fetch_infra_current("supabase")
    assert row is not None
    assert row["status"] == "healthy"
    assert row["metrics"]["memory_used_pct"] == 75.0

    async with (
        await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn,
        conn.cursor() as cur,
    ):
        await cur.execute("SELECT count(*) FROM public.infra_history WHERE source = 'supabase'")
        row2 = await cur.fetchone()
        assert row2 is not None
        assert row2[0] == 1


# ── Restart-counter latching regression (see infra_collectors._compute_last_restart_at) ──


async def _seed_supabase_metrics(metrics: dict[str, object]) -> None:
    async with await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn:
        await conn.execute(
            "UPDATE public.infra_current SET metrics = %s WHERE source = 'supabase'",
            (json.dumps(metrics),),
        )


def _prometheus_text_with_restarts(count: int) -> str:
    return _SAMPLE_PROMETHEUS_TEXT.replace(
        "postgresql_restarts_total 0", f"postgresql_restarts_total {count}"
    )


async def test_collect_supabase_infra_first_restart_bump_sets_last_restart_at(
    monkeypatch: pytest.MonkeyPatch, httpx_mock: HTTPXMock
) -> None:
    """(a) A restart-counter bump with no prior restart on record stamps
    last_restart_at with now() and the status reflects it (degraded)."""
    monkeypatch.setenv("SUPABASE_PROJECT_REF", "testref")
    get_settings.cache_clear()
    httpx_mock.add_response(
        url="https://testref.supabase.co/customer/v1/privileged/metrics",
        text=_prometheus_text_with_restarts(1),
    )

    await collect_supabase_infra()

    row = await _fetch_infra_current("supabase")
    assert row is not None
    assert row["metrics"]["db_restarts_total"] == 1
    assert row["metrics"]["last_restart_at"] is not None
    assert row["status"] == "degraded"


async def test_collect_supabase_infra_old_restart_no_longer_counts(
    monkeypatch: pytest.MonkeyPatch, httpx_mock: HTTPXMock
) -> None:
    """(b) An old restart (last_restart_at 3h ago, no new bump this poll) no
    longer affects status, even though the lifetime counter stays elevated."""
    monkeypatch.setenv("SUPABASE_PROJECT_REF", "testref")
    get_settings.cache_clear()
    old_restart = _iso_ago(hours=3)
    await _seed_supabase_metrics({"db_restarts_total": 5, "last_restart_at": old_restart})
    httpx_mock.add_response(
        url="https://testref.supabase.co/customer/v1/privileged/metrics",
        text=_prometheus_text_with_restarts(5),  # unchanged from the seeded value
    )

    await collect_supabase_infra()

    row = await _fetch_infra_current("supabase")
    assert row is not None
    assert row["metrics"]["db_restarts_total"] == 5
    assert row["metrics"]["last_restart_at"] == old_restart  # carried forward, unchanged
    assert row["status"] == "healthy"


async def test_collect_supabase_infra_status_never_permanently_latches(
    monkeypatch: pytest.MonkeyPatch, httpx_mock: HTTPXMock
) -> None:
    """(c) However high the lifetime restart counter climbs, status recovers to
    healthy once enough time passes without a *new* restart — it can never get
    stuck at degraded/critical forever."""
    monkeypatch.setenv("SUPABASE_PROJECT_REF", "testref")
    get_settings.cache_clear()
    old_restart = _iso_ago(hours=5)
    await _seed_supabase_metrics({"db_restarts_total": 1000, "last_restart_at": old_restart})
    httpx_mock.add_response(
        url="https://testref.supabase.co/customer/v1/privileged/metrics",
        text=_prometheus_text_with_restarts(1000),  # unchanged from the seeded value
    )

    await collect_supabase_infra()

    row = await _fetch_infra_current("supabase")
    assert row is not None
    assert row["metrics"]["db_restarts_total"] == 1000
    assert row["status"] == "healthy"


async def test_collect_vercel_status_full_path(
    monkeypatch: pytest.MonkeyPatch, httpx_mock: HTTPXMock
) -> None:
    monkeypatch.setenv("VERCEL_TOKEN", "test-token")
    monkeypatch.setenv("VERCEL_PROJECT_ID", "prj_test")
    get_settings.cache_clear()
    httpx_mock.add_response(
        url=("https://api.vercel.com/v7/deployments?projectId=prj_test&limit=5&target=production"),
        json={
            "deployments": [
                {
                    "uid": "test-dpl_1",
                    "state": "READY",
                    "created": 1_000_000,
                    "ready": 1_000_100,
                    "buildingAt": 1_000_050,
                    "meta": {
                        "gitCommitSha": "abc123",
                        "gitCommitMessage": "fix: thing",
                        "gitBranch": "main",
                    },
                }
            ]
        },
    )

    await collect_vercel_status()

    row = await _fetch_infra_current("vercel")
    assert row is not None
    assert row["status"] == "healthy"
    assert row["metrics"]["commit_sha"] == "abc123"

    async with (
        await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn,
        conn.cursor(row_factory=psycopg.rows.dict_row) as cur,
    ):
        await cur.execute(
            "SELECT platform, status, commit_message FROM public.deployment_events "
            "WHERE platform_id = 'test-dpl_1'"
        )
        deploy_row = await cur.fetchone()
        assert deploy_row is not None
        assert deploy_row["platform"] == "vercel"
        assert deploy_row["status"] == "READY"
        assert deploy_row["commit_message"] == "fix: thing"


async def test_collect_railway_status_full_path(
    monkeypatch: pytest.MonkeyPatch, httpx_mock: HTTPXMock
) -> None:
    monkeypatch.setenv("RAILWAY_TOKEN", "test-token")
    monkeypatch.setenv("RAILWAY_SERVICE_ID", "svc_test")
    monkeypatch.setenv("RAILWAY_ENVIRONMENT_ID", "env_test")
    get_settings.cache_clear()

    httpx_mock.add_response(
        url="https://backboard.railway.com/graphql/v2",
        json={
            "data": {
                "serviceInstance": {
                    "latestDeployment": {
                        "id": "test-dep_1",
                        "status": "SUCCESS",
                        "createdAt": "2026-07-16T00:00:00Z",
                    }
                }
            }
        },
    )
    httpx_mock.add_response(
        url="https://backboard.railway.com/graphql/v2",
        json={
            "data": {
                "httpLogs": [
                    {"httpStatus": 200, "totalDuration": 50},
                    {"httpStatus": 200, "totalDuration": 80},
                    {"httpStatus": 500, "totalDuration": 20},
                ]
            }
        },
    )

    await collect_railway_status()

    row = await _fetch_infra_current("railway")
    assert row is not None
    assert row["status"] == "critical"  # error rate 1/3 = 33.3% >= 5%
    assert row["metrics"]["deploy_status"] == "SUCCESS"

    async with (
        await psycopg.AsyncConnection.connect(TEST_DB_DSN, autocommit=True) as conn,
        conn.cursor(row_factory=psycopg.rows.dict_row) as cur,
    ):
        await cur.execute(
            "SELECT platform, status FROM public.deployment_events WHERE platform_id = 'test-dep_1'"
        )
        deploy_row = await cur.fetchone()
        assert deploy_row is not None
        assert deploy_row["platform"] == "railway"
        assert deploy_row["status"] == "SUCCESS"
