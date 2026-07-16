"""Background jobs that scrape Supabase, Vercel, and Railway for infra metrics.

Each collector is scheduled independently in app/main.py (APScheduler) and
must never raise into the scheduler: every public collector function catches
its own exceptions and logs them. Each collector also skips gracefully (debug
log + early return) when the settings it needs are unset, since this app has
no production credentials configured for Vercel/Railway yet.
"""

from __future__ import annotations

import base64
import contextlib
import json
import logging
import re
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx

log = logging.getLogger("fithub.jobs")

# A restart is only counted against the Supabase status for this long after it
# is first observed. Bounding the window (rather than comparing the lifetime
# counter to a fixed threshold) is what makes the status self-healing: it
# always recovers to healthy once the window elapses, no matter how high the
# lifetime restart count climbs.
_RESTART_RECENCY_WINDOW = timedelta(hours=2)

# ── Prometheus text-format parser ───────────────────────────────────────────

# Metrics we extract from the Supabase Prometheus endpoint. Everything else
# on the page is ignored.
_WANTED_METRICS: frozenset[str] = frozenset(
    {
        "node_memory_MemTotal_bytes",
        "node_memory_MemAvailable_bytes",
        "node_load1",
        "supavisor_connections_active",
        "postgresql_restarts_total",
        "gotrue_running",
        "node_filesystem_size_bytes",
        "node_filesystem_avail_bytes",
    }
)

_PROM_LINE_RE = re.compile(r"^([a-zA-Z_:][a-zA-Z0-9_:]*)(?:\{([^}]*)\})?\s+([0-9eE+\-.]+)")

# node_exporter emits one line per mountpoint for these two metrics, so "first
# occurrence wins" can pick an arbitrary non-root filesystem. Only accept the
# root filesystem's line for these.
_FILESYSTEM_METRICS: frozenset[str] = frozenset(
    {"node_filesystem_size_bytes", "node_filesystem_avail_bytes"}
)


def _parse_prometheus(text: str) -> dict[str, float]:
    """Parse Prometheus text exposition into {metric_name: first_value}.

    Ignores labels entirely (except to disambiguate filesystem mountpoints —
    see `_FILESYSTEM_METRICS`) — for our use case we take the first line seen
    per metric name and skip comment/blank lines and metrics we don't want.
    """
    result: dict[str, float] = {}
    for line in text.splitlines():
        if not line or line.startswith("#"):
            continue
        match = _PROM_LINE_RE.match(line)
        if not match:
            continue
        name, labels, raw_value = match.group(1), match.group(2), match.group(3)
        if name not in _WANTED_METRICS or name in result:
            continue  # skip unwanted metrics; keep first occurrence per name
        if name in _FILESYSTEM_METRICS and 'mountpoint="/"' not in (labels or ""):
            continue  # only the root filesystem is relevant for disk_used_pct
        with contextlib.suppress(ValueError):
            result[name] = float(raw_value)
    return result


def _build_supabase_metrics(raw: dict[str, float]) -> dict[str, Any]:
    """Compute the derived metrics dict stored in infra_current/infra_history."""
    mem_total = raw.get("node_memory_MemTotal_bytes")
    mem_avail = raw.get("node_memory_MemAvailable_bytes")
    mem_used_pct = (
        round((1 - mem_avail / mem_total) * 100, 1)
        if mem_total is not None and mem_avail is not None and mem_total
        else None
    )

    fs_size = raw.get("node_filesystem_size_bytes")
    fs_avail = raw.get("node_filesystem_avail_bytes")
    disk_used_pct = (
        round((1 - fs_avail / fs_size) * 100, 1)
        if fs_size is not None and fs_avail is not None and fs_size
        else None
    )

    return {
        "memory_used_pct": mem_used_pct,
        "disk_used_pct": disk_used_pct,
        "connections_active": int(raw.get("supavisor_connections_active", 0)),
        "db_restarts_total": int(raw.get("postgresql_restarts_total", 0)),
        "gotrue_running": bool(raw.get("gotrue_running", 0)),
        "load_1m": raw.get("node_load1"),
    }


def _restarted_recently(last_restart_at: str | None) -> bool:
    """True if `last_restart_at` (an ISO timestamp) falls within the recency window.

    Returns False for anything unparsable so a corrupt/legacy value degrades
    to "no known restart" instead of raising into the scheduler.
    """
    if not last_restart_at:
        return False
    try:
        restarted_at = datetime.fromisoformat(last_restart_at)
    except ValueError:
        return False
    if restarted_at.tzinfo is None:
        restarted_at = restarted_at.replace(tzinfo=UTC)
    return datetime.now(UTC) - restarted_at < _RESTART_RECENCY_WINDOW


def _compute_last_restart_at(
    db_restarts_total: int, previous_metrics: dict[str, Any] | None
) -> str | None:
    """Return the ISO timestamp of the most recent restart, or None if none on record.

    `db_restarts_total` comes from the Prometheus counter `postgresql_restarts_total`,
    a monotonic lifetime total that never resets — so it can't be compared against
    an absolute threshold without eventually latching permanently once the instance
    has restarted a handful of times over its life. Instead we compare against the
    previous poll's count: an increase means a fresh restart just happened, so we
    stamp `last_restart_at` with now(). Otherwise we carry forward whatever was
    already recorded (or None if there's no prior restart on record).
    """
    previous = previous_metrics or {}
    previous_total = int(previous.get("db_restarts_total") or 0)
    if db_restarts_total > previous_total:
        return datetime.now(UTC).isoformat()
    last_restart_at = previous.get("last_restart_at")
    return last_restart_at if isinstance(last_restart_at, str) else None


def _supabase_status(metrics: dict[str, Any]) -> str:
    mem = metrics.get("memory_used_pct") or 0
    disk = metrics.get("disk_used_pct") or 0
    gotrue = metrics.get("gotrue_running", False)

    if not gotrue or mem >= 95 or disk >= 95:
        return "critical"
    if mem >= 80 or disk >= 80 or _restarted_recently(metrics.get("last_restart_at")):
        return "degraded"
    return "healthy"


def _railway_status(metrics: dict[str, Any]) -> str:
    deploy_status = metrics.get("deploy_status", "unknown")
    error_rate = metrics.get("http_error_rate_pct") or 0

    if deploy_status in ("CRASHED", "FAILED") or error_rate >= 5:
        return "critical"
    if deploy_status == "SLEEPING" or error_rate >= 1:
        return "degraded"
    if deploy_status == "SUCCESS":
        return "healthy"
    return "unknown"


def _vercel_status(metrics: dict[str, Any]) -> str:
    state = metrics.get("last_deploy_state", "")
    if state == "ERROR":
        return "critical"
    if state in ("CANCELED", "BUILDING", "QUEUED"):
        return "degraded"
    if state == "READY":
        return "healthy"
    return "unknown"


def _basic_auth(username: str, password: str) -> str:
    return base64.b64encode(f"{username}:{password}".encode()).decode()


# ── DB read/write helpers ────────────────────────────────────────────────────


async def _fetch_previous_metrics(source: str) -> dict[str, Any] | None:
    """Read the current infra_current.metrics for `source` before it gets overwritten.

    Returns None if there's no row yet (there always is one post-migration, since
    the three sources are seeded, but this stays defensive for tests/fresh DBs).
    """
    from app.db import pool_connection

    async with pool_connection().connection() as db, db.cursor() as cur:
        await cur.execute(
            "SELECT metrics FROM public.infra_current WHERE source = %s",
            (source,),
        )
        row = await cur.fetchone()
        return row[0] if row else None  # type: ignore[index]


async def _upsert_infra(source: str, status: str, metrics: dict[str, Any]) -> None:
    """Update infra_current in-place and append a pruned infra_history snapshot."""
    from app.db import pool_connection

    async with pool_connection().connection() as db, db.cursor() as cur:
        await cur.execute(
            """
            INSERT INTO public.infra_current (source, status, metrics, checked_at)
            VALUES (%(source)s, %(status)s, %(metrics)s, now())
            ON CONFLICT (source) DO UPDATE SET
                status     = EXCLUDED.status,
                metrics    = EXCLUDED.metrics,
                checked_at = EXCLUDED.checked_at
            """,
            {"source": source, "status": status, "metrics": json.dumps(metrics)},
        )
        # Ring buffer: prune anything outside the 1h sparkline window, then
        # insert the new snapshot.
        await cur.execute(
            "DELETE FROM public.infra_history "
            "WHERE source = %s AND collected_at < now() - interval '1 hour'",
            (source,),
        )
        await cur.execute(
            "INSERT INTO public.infra_history (source, metrics, collected_at) "
            "VALUES (%s, %s, now())",
            (source, json.dumps(metrics)),
        )


async def _upsert_deployment_event(
    *,
    platform_id: str,
    platform: str,
    service_name: str,
    status: str,
    commit_sha: str | None = None,
    commit_message: str | None = None,
    branch: str | None = None,
    duration_ms: int | None = None,
    error_message: str | None = None,
) -> None:
    """Append-only deployment log, deduped by (platform, platform_id)."""
    from app.db import pool_connection

    async with pool_connection().connection() as db, db.cursor() as cur:
        await cur.execute(
            """
            INSERT INTO public.deployment_events
                (platform_id, platform, service_name, status,
                 commit_sha, commit_message, branch, duration_ms, error_message,
                 occurred_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, now())
            ON CONFLICT (platform, platform_id) DO UPDATE SET
                status        = EXCLUDED.status,
                duration_ms   = EXCLUDED.duration_ms,
                error_message = EXCLUDED.error_message
            """,
            (
                platform_id,
                platform,
                service_name,
                status,
                commit_sha,
                commit_message,
                branch,
                duration_ms,
                error_message,
            ),
        )


# ── Collector jobs ───────────────────────────────────────────────────────────


async def collect_supabase_infra() -> None:
    """Scrape the Supabase Prometheus endpoint and upsert infra_current + infra_history."""
    from app.config import get_settings

    try:
        settings = get_settings()
        ref = settings.supabase_ref
        if not ref:
            log.debug("collect_supabase_infra: supabase_ref not configured, skipping")
            return

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"https://{ref}.supabase.co/customer/v1/privileged/metrics",
                headers={
                    "Authorization": (
                        f"Basic {_basic_auth('service_role', settings.supabase_service_role_key)}"
                    )
                },
            )

        if resp.status_code != 200:
            log.error("collect_supabase_infra: Prometheus returned HTTP %d", resp.status_code)
            return

        raw = _parse_prometheus(resp.text)
        metrics = _build_supabase_metrics(raw)

        previous_metrics = await _fetch_previous_metrics("supabase")
        metrics["last_restart_at"] = _compute_last_restart_at(
            metrics["db_restarts_total"], previous_metrics
        )

        status = _supabase_status(metrics)
        await _upsert_infra("supabase", status, metrics)

    except Exception:
        log.exception("collect_supabase_infra failed")


async def collect_railway_status() -> None:
    """Query Railway GraphQL for the latest deployment and its HTTP log error rate/p95."""
    from app.config import get_settings

    try:
        settings = get_settings()
        if not settings.railway_token or not settings.railway_service_id:
            log.debug("collect_railway_status: railway credentials not configured, skipping")
            return

        deploy_query = """
        query LatestDeploy($serviceId: String!, $environmentId: String!) {
            serviceInstance(serviceId: $serviceId, environmentId: $environmentId) {
                latestDeployment { id status createdAt }
            }
        }
        """
        headers = {
            "Authorization": f"Bearer {settings.railway_token}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=15.0) as client:
            deploy_resp = await client.post(
                "https://backboard.railway.com/graphql/v2",
                headers=headers,
                json={
                    "query": deploy_query,
                    "variables": {
                        "serviceId": settings.railway_service_id,
                        "environmentId": settings.railway_environment_id,
                    },
                },
            )

            if deploy_resp.status_code != 200:
                log.error(
                    "collect_railway_status: GraphQL returned HTTP %d", deploy_resp.status_code
                )
                return

            data = deploy_resp.json().get("data", {})
            svc = data.get("serviceInstance") or {}
            latest = svc.get("latestDeployment") or {}
            deploy_status = latest.get("status", "unknown")
            deploy_id = latest.get("id")

            # Fetch HTTP logs for the active deployment (last 500 requests) to
            # derive an error rate and p95 latency.
            error_rate_pct = None
            p95_ms = None
            if deploy_id:
                logs_query = """
                query HttpLogs($deploymentId: String!, $limit: Int) {
                    httpLogs(deploymentId: $deploymentId, limit: $limit) {
                        httpStatus totalDuration
                    }
                }
                """
                logs_resp = await client.post(
                    "https://backboard.railway.com/graphql/v2",
                    headers=headers,
                    json={
                        "query": logs_query,
                        "variables": {"deploymentId": deploy_id, "limit": 500},
                    },
                )
                if logs_resp.status_code == 200:
                    logs = logs_resp.json().get("data", {}).get("httpLogs") or []
                    if logs:
                        errors = sum(1 for entry in logs if (entry.get("httpStatus") or 0) >= 500)
                        error_rate_pct = round(errors / len(logs) * 100, 2)
                        durations = sorted(
                            entry["totalDuration"]
                            for entry in logs
                            if entry.get("totalDuration") is not None
                        )
                        if durations:
                            p95_idx = int(len(durations) * 0.95)
                            p95_ms = durations[min(p95_idx, len(durations) - 1)]

        metrics: dict[str, Any] = {
            "deploy_status": deploy_status,
            "deploy_id": deploy_id,
            "deploy_created_at": latest.get("createdAt"),
            "http_error_rate_pct": error_rate_pct,
            "http_p95_ms": p95_ms,
        }
        status = _railway_status(metrics)
        await _upsert_infra("railway", status, metrics)

        if deploy_id:
            await _upsert_deployment_event(
                platform_id=deploy_id,
                platform="railway",
                service_name="api",
                status=deploy_status,
            )

    except Exception:
        log.exception("collect_railway_status failed")


async def collect_vercel_status() -> None:
    """Poll the Vercel REST API for the latest production deployment."""
    from app.config import get_settings

    try:
        settings = get_settings()
        if not settings.vercel_token or not settings.vercel_project_id:
            log.debug("collect_vercel_status: vercel credentials not configured, skipping")
            return

        team_param = f"&teamId={settings.vercel_team_id}" if settings.vercel_team_id else ""
        url = (
            "https://api.vercel.com/v7/deployments"
            f"?projectId={settings.vercel_project_id}&limit=5&target=production{team_param}"
        )

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                url, headers={"Authorization": f"Bearer {settings.vercel_token}"}
            )

        if resp.status_code != 200:
            log.error("collect_vercel_status: Vercel API returned HTTP %d", resp.status_code)
            return

        deployments = resp.json().get("deployments", [])
        if not deployments:
            await _upsert_infra("vercel", "unknown", {"last_deploy_state": None})
            return

        latest = deployments[0]
        state = latest.get("state", "")
        ready_ms = latest.get("ready")
        building_ms = latest.get("buildingAt")
        duration_ms = (ready_ms - building_ms) if ready_ms and building_ms else None
        error_msg = latest.get("errorMessage")
        meta = latest.get("meta", {})

        metrics: dict[str, Any] = {
            "last_deploy_state": state,
            "last_deploy_id": latest.get("uid"),
            "last_deploy_created_ms": latest.get("created"),
            "build_duration_ms": duration_ms,
            "commit_sha": meta.get("gitCommitSha"),
            "commit_message": meta.get("gitCommitMessage"),
            "branch": meta.get("gitBranch"),
            "error_message": error_msg,
        }
        status = _vercel_status(metrics)
        await _upsert_infra("vercel", status, metrics)

        deploy_id = latest.get("uid")
        if deploy_id:
            await _upsert_deployment_event(
                platform_id=deploy_id,
                platform="vercel",
                service_name="web",
                status=state,
                commit_sha=metrics["commit_sha"],
                commit_message=metrics["commit_message"],
                branch=metrics["branch"],
                duration_ms=duration_ms,
                error_message=error_msg,
            )

    except Exception:
        log.exception("collect_vercel_status failed")
