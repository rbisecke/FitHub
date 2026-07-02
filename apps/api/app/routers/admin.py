"""Admin API routes: metrics, access requests, user management, health, knowledge base."""

from __future__ import annotations

import time
import uuid
from datetime import UTC, datetime
from typing import Annotated, Any

import httpx
import psycopg
import psycopg.rows
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from psycopg.errors import UniqueViolation

from app.config import get_settings
from app.db import get_db
from app.dependencies.admin import require_admin
from app.middleware.rate_limit import limiter
from app.models.admin import (
    AccessRequestCreate,
    AccessRequestReview,
    AccessRequestRow,
    AddInviteBody,
    AdminHealth,
    AdminUser,
    DailyCostPoint,
    InvitedEmail,
    KBEntry,
    LLMError,
    MetricsSummary,
    RecentError,
    ReindexBody,
    ReindexJob,
    UserCostRow,
)

router = APIRouter(tags=["admin"])

_START_TIME = time.monotonic()

# Haiku 4.5 pricing (USD per million tokens)
_INPUT_PER_MTOK = 1.00
_OUTPUT_PER_MTOK = 5.00
_CACHE_READ_PER_MTOK = 0.10
_CACHE_WRITE_PER_MTOK = 1.25

DBConn = psycopg.AsyncConnection[Any]


def _cost_expr(table: str = "lu") -> str:
    return (
        f"({table}.input_tokens * {_INPUT_PER_MTOK} / 1e6"
        f" + {table}.output_tokens * {_OUTPUT_PER_MTOK} / 1e6"
        f" + {table}.cache_read_tokens * {_CACHE_READ_PER_MTOK} / 1e6"
        f" + {table}.cache_write_tokens * {_CACHE_WRITE_PER_MTOK} / 1e6)"
    )


# ── Public: submit access request ─────────────────────────────────────────────


@router.post("/api/v1/access-requests", status_code=status.HTTP_201_CREATED)
@limiter.limit("3/hour")
async def submit_access_request(
    request: Request,
    body: AccessRequestCreate,
    conn: Annotated[DBConn, Depends(get_db)],
) -> dict[str, str]:
    async with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
        # Reject if the same email submitted within the last 24 hours
        await cur.execute(
            """
            SELECT id FROM access_requests
            WHERE lower(email) = lower(%s)
              AND created_at > now() - interval '24 hours'
            LIMIT 1
            """,
            [body.email],
        )
        if await cur.fetchone():
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="A request from this email was already submitted in the last 24 hours.",
            )

    try:
        await conn.execute(
            """
            INSERT INTO access_requests (email, name, motivation)
            VALUES (%s, %s, %s)
            """,
            [body.email, body.name, body.motivation],
        )
    except UniqueViolation:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A pending request from this email already exists.",
        ) from None

    return {"status": "submitted"}


# ── Admin: metrics summary ────────────────────────────────────────────────────


@router.get("/api/v1/admin/metrics", response_model=MetricsSummary)
async def admin_metrics(
    _admin: Annotated[uuid.UUID, Depends(require_admin)],
    conn: Annotated[DBConn, Depends(get_db)],
) -> MetricsSummary:
    settings = get_settings()
    cost_expr = _cost_expr("lu")

    async with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
        # Rolling 30-day totals + TTFT percentiles
        await cur.execute(
            f"""
            SELECT
                COALESCE(SUM({cost_expr}), 0)                             AS cost_30d_usd,
                COUNT(*)                                                    AS interactions_30d,
                COALESCE(SUM(lu.cache_read_tokens), 0)                    AS cache_reads,
                COALESCE(SUM(lu.cache_read_tokens + lu.input_tokens), 0)  AS total_input,
                PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY lu.ttft_ms)  AS ttft_p50,
                PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY lu.ttft_ms)  AS ttft_p95
            FROM llm_usage lu
            WHERE lu.created_at > now() - interval '30 days'
              AND lu.stub = false
            """,
        )
        row30 = await cur.fetchone() or {}

        # Month-to-date
        await cur.execute(
            f"""
            SELECT COALESCE(SUM({cost_expr}), 0) AS cost_mtd_usd
            FROM llm_usage lu
            WHERE lu.created_at >= date_trunc('month', now())
              AND lu.stub = false
            """,
        )
        mtd = await cur.fetchone() or {}

        # Error rate last 7 days (from error_events vs total requests logged)
        await cur.execute(
            """
            SELECT COUNT(*) AS err_count
            FROM error_events
            WHERE created_at > now() - interval '7 days'
            """,
        )
        err_row = await cur.fetchone() or {}

        await cur.execute(
            """
            SELECT COUNT(*) AS req_count
            FROM llm_usage
            WHERE created_at > now() - interval '7 days' AND stub = false
            """,
        )
        req_row = await cur.fetchone() or {}

        # Per-user breakdown
        await cur.execute(
            f"""
            SELECT
                lu.user_id::text,
                p.display_name,
                NULL::text                  AS email,
                COUNT(*)                    AS interactions_30d,
                COALESCE(SUM({cost_expr}), 0) AS cost_30d_usd
            FROM llm_usage lu
            LEFT JOIN profiles p ON p.id = lu.user_id
            WHERE lu.created_at > now() - interval '30 days'
              AND lu.stub = false
            GROUP BY lu.user_id, p.display_name
            ORDER BY cost_30d_usd DESC
            LIMIT 50
            """,
        )
        per_user_rows = await cur.fetchall()

        # Daily costs (last 30 days)
        await cur.execute(
            f"""
            SELECT
                to_char(date_trunc('day', lu.created_at), 'YYYY-MM-DD') AS day,
                COALESCE(SUM({cost_expr}), 0)                           AS cost_usd
            FROM llm_usage lu
            WHERE lu.created_at > now() - interval '30 days'
              AND lu.stub = false
            GROUP BY date_trunc('day', lu.created_at)
            ORDER BY 1
            """,
        )
        daily_rows = await cur.fetchall()

    cost_30d = float(row30.get("cost_30d_usd") or 0)
    interactions_30d = int(row30.get("interactions_30d") or 0)
    cache_reads = int(row30.get("cache_reads") or 0)
    total_input = int(row30.get("total_input") or 0)
    cache_hit_rate = cache_reads / total_input if total_input > 0 else 0.0
    ttft_p50 = row30.get("ttft_p50")
    ttft_p95 = row30.get("ttft_p95")

    cost_mtd = float(mtd.get("cost_mtd_usd") or 0)
    day_of_month = datetime.now(UTC).day
    days_in_month = 30  # close enough for projection
    projected = cost_mtd / day_of_month * days_in_month if day_of_month > 0 else 0.0

    avg_cost = cost_30d / interactions_30d if interactions_30d > 0 else 0.0

    err_count = int(err_row.get("err_count") or 0)
    req_count = int(req_row.get("req_count") or 0)
    error_rate_7d = err_count / req_count if req_count > 0 else 0.0

    return MetricsSummary(
        cost_30d_usd=cost_30d,
        cost_mtd_usd=cost_mtd,
        projected_month_end_usd=projected,
        avg_cost_per_interaction_usd=avg_cost,
        cache_hit_rate=cache_hit_rate,
        ttft_p50_ms=int(ttft_p50) if ttft_p50 is not None else None,
        ttft_p95_ms=int(ttft_p95) if ttft_p95 is not None else None,
        error_rate_7d=error_rate_7d,
        interactions_30d=interactions_30d,
        per_user=[
            UserCostRow(
                user_id=r["user_id"],
                display_name=r.get("display_name"),
                email=r.get("email"),
                interactions_30d=int(r["interactions_30d"]),
                cost_30d_usd=float(r["cost_30d_usd"]),
            )
            for r in per_user_rows
        ],
        daily_costs=[
            DailyCostPoint(day=r["day"], cost_usd=float(r["cost_usd"])) for r in daily_rows
        ],
        budget_usd=settings.anthropic_monthly_budget_usd,
    )


# ── Admin: access requests ────────────────────────────────────────────────────


@router.get("/api/v1/admin/access-requests", response_model=list[AccessRequestRow])
async def list_access_requests(
    _admin: Annotated[uuid.UUID, Depends(require_admin)],
    conn: Annotated[DBConn, Depends(get_db)],
    status_filter: str | None = Query(None, alias="status"),
) -> list[AccessRequestRow]:
    query = """
        SELECT id, created_at, email, name, motivation, status,
               reviewed_at, reviewed_by, review_note
        FROM access_requests
    """
    params: list[Any] = []
    if status_filter:
        query += " WHERE status = %s"
        params.append(status_filter)
    query += " ORDER BY created_at DESC LIMIT 200"

    async with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(query, params)
        rows = await cur.fetchall()

    return [AccessRequestRow(**r) for r in rows]


@router.patch(
    "/api/v1/admin/access-requests/{request_id}",
    response_model=AccessRequestRow,
)
async def review_access_request(
    request_id: uuid.UUID,
    body: AccessRequestReview,
    admin_id: Annotated[uuid.UUID, Depends(require_admin)],
    conn: Annotated[DBConn, Depends(get_db)],
) -> AccessRequestRow:
    if body.action not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="action must be 'approved' or 'rejected'")

    async with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            """
            UPDATE access_requests
               SET status      = %s,
                   reviewed_at = now(),
                   reviewed_by = %s,
                   review_note = %s
             WHERE id = %s AND status = 'pending'
             RETURNING id, created_at, email, name, motivation, status,
                       reviewed_at, reviewed_by, review_note
            """,
            [body.action, str(admin_id), body.note, str(request_id)],
        )
        row = await cur.fetchone()

    if not row:
        raise HTTPException(
            status_code=404,
            detail="Access request not found or already reviewed.",
        )

    if body.action == "approved":
        await _add_invited_email(conn, row["email"], admin_id)
        await _supabase_send_invite(row["email"])

    return AccessRequestRow(**row)


async def _add_invited_email(conn: DBConn, email: str, invited_by: uuid.UUID) -> None:
    import contextlib

    with contextlib.suppress(Exception):
        await conn.execute(
            """
            INSERT INTO invited_emails (email, invited_by)
            VALUES (%s, (SELECT id FROM profiles WHERE id = %s LIMIT 1))
            ON CONFLICT (email) DO NOTHING
            """,
            [email, str(invited_by)],
        )


async def _supabase_send_invite(email: str) -> None:
    settings = get_settings()
    base = settings.supabase_url.rstrip("/")
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{base}/auth/v1/admin/invite",
            headers={
                "apikey": settings.supabase_service_role_key,
                "Authorization": f"Bearer {settings.supabase_service_role_key}",
                "Content-Type": "application/json",
            },
            json={"email": email},
        )
    if resp.status_code not in (200, 201):
        raise HTTPException(
            status_code=502,
            detail=f"Supabase invite failed ({resp.status_code}): {resp.text[:200]}",
        )


# ── Admin: user management ────────────────────────────────────────────────────


@router.get("/api/v1/admin/users", response_model=list[AdminUser])
async def list_admin_users(
    _admin: Annotated[uuid.UUID, Depends(require_admin)],
    conn: Annotated[DBConn, Depends(get_db)],
) -> list[AdminUser]:
    async with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            """
            SELECT
                p.id::text                              AS user_id,
                p.display_name,
                NULL::text                              AS email,
                p.created_at,
                NULL::timestamptz                       AS banned_until,
                COALESCE(COUNT(lu.id), 0)::int          AS interactions_30d
            FROM profiles p
            LEFT JOIN llm_usage lu
                   ON lu.user_id = p.id
                  AND lu.created_at > now() - interval '30 days'
                  AND lu.stub = false
            GROUP BY p.id, p.display_name, p.created_at
            ORDER BY p.created_at DESC
            """,
        )
        rows = await cur.fetchall()

    return [AdminUser(**r) for r in rows]


@router.post("/api/v1/admin/users/{user_id}/disable", status_code=status.HTTP_204_NO_CONTENT)
async def disable_user(
    user_id: str,
    _admin: Annotated[uuid.UUID, Depends(require_admin)],
) -> None:
    settings = get_settings()
    base = settings.supabase_url.rstrip("/")
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.put(
            f"{base}/auth/v1/admin/users/{user_id}",
            headers={
                "apikey": settings.supabase_service_role_key,
                "Authorization": f"Bearer {settings.supabase_service_role_key}",
            },
            json={"ban_duration": "876600h"},  # 100 years
        )
    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=502, detail=f"Supabase error: {resp.text[:200]}")


@router.post("/api/v1/admin/users/{user_id}/magic-link")
async def generate_magic_link(
    user_id: str,
    _admin: Annotated[uuid.UUID, Depends(require_admin)],
) -> dict[str, str]:
    settings = get_settings()
    base = settings.supabase_url.rstrip("/")
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            f"{base}/auth/v1/admin/users/{user_id}/generate_link",
            headers={
                "apikey": settings.supabase_service_role_key,
                "Authorization": f"Bearer {settings.supabase_service_role_key}",
            },
            json={"type": "magiclink"},
        )
    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=502, detail=f"Supabase error: {resp.text[:200]}")
    data = resp.json()
    return {"link": data.get("action_link", "")}


@router.delete("/api/v1/admin/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    _admin: Annotated[uuid.UUID, Depends(require_admin)],
    confirm: bool = Query(False),
) -> None:
    if not confirm:
        raise HTTPException(status_code=400, detail="Pass ?confirm=true to delete a user.")
    settings = get_settings()
    base = settings.supabase_url.rstrip("/")
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.delete(
            f"{base}/auth/v1/admin/users/{user_id}",
            headers={
                "apikey": settings.supabase_service_role_key,
                "Authorization": f"Bearer {settings.supabase_service_role_key}",
            },
        )
    if resp.status_code not in (200, 204):
        raise HTTPException(status_code=502, detail=f"Supabase error: {resp.text[:200]}")


# ── Admin: invited emails ─────────────────────────────────────────────────────


@router.get("/api/v1/admin/invited-emails", response_model=list[InvitedEmail])
async def list_invited_emails(
    _admin: Annotated[uuid.UUID, Depends(require_admin)],
    conn: Annotated[DBConn, Depends(get_db)],
) -> list[InvitedEmail]:
    async with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            "SELECT id, email, invited_at, used_at FROM invited_emails ORDER BY invited_at DESC"
        )
        rows = await cur.fetchall()
    return [InvitedEmail(**r) for r in rows]


@router.post(
    "/api/v1/admin/invited-emails",
    response_model=InvitedEmail,
    status_code=status.HTTP_201_CREATED,
)
async def add_invited_email(
    body: AddInviteBody,
    admin_id: Annotated[uuid.UUID, Depends(require_admin)],
    conn: Annotated[DBConn, Depends(get_db)],
) -> InvitedEmail:
    try:
        async with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            await cur.execute(
                """
                INSERT INTO invited_emails (email, invited_by)
                VALUES (%s, (SELECT id FROM profiles WHERE id = %s LIMIT 1))
                ON CONFLICT (email) DO NOTHING
                RETURNING id, email, invited_at, used_at
                """,
                [body.email, str(admin_id)],
            )
            row = await cur.fetchone()
    except UniqueViolation:
        raise HTTPException(status_code=409, detail="Email already on the invite list.") from None

    if not row:
        raise HTTPException(status_code=409, detail="Email already on the invite list.")

    return InvitedEmail(**row)


@router.delete("/api/v1/admin/invited-emails/{email}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_invited_email(
    email: str,
    _admin: Annotated[uuid.UUID, Depends(require_admin)],
    conn: Annotated[DBConn, Depends(get_db)],
) -> None:
    result = await conn.execute(
        "DELETE FROM invited_emails WHERE lower(email) = lower(%s)", [email]
    )
    if result.pgresult and result.pgresult.command_tuples == 0:
        raise HTTPException(status_code=404, detail="Email not found.")


# ── Admin: health ─────────────────────────────────────────────────────────────


@router.get("/api/v1/admin/health", response_model=AdminHealth)
async def admin_health(
    _admin: Annotated[uuid.UUID, Depends(require_admin)],
    conn: Annotated[DBConn, Depends(get_db)],
) -> AdminHealth:
    uptime = time.monotonic() - _START_TIME

    async with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute("SELECT MAX(created_at) AS last_call FROM llm_usage WHERE stub = false")
        llm_row = await cur.fetchone() or {}

        await cur.execute(
            "SELECT COUNT(*) AS cnt FROM error_events WHERE created_at > now() - interval '1 hour'"
        )
        err_hour = await cur.fetchone() or {}

        await cur.execute(
            """
            SELECT created_at, path, status_code, error_type, error_msg
            FROM error_events
            ORDER BY created_at DESC
            LIMIT 20
            """,
        )
        recent_errors = await cur.fetchall()

        await cur.execute(
            """
            SELECT created_at, endpoint, error_code, error_msg
            FROM llm_usage
            WHERE error_code IS NOT NULL AND stub = false
            ORDER BY created_at DESC
            LIMIT 20
            """,
        )
        llm_errors = await cur.fetchall()

    from importlib.metadata import version as pkg_version

    try:
        api_ver = pkg_version("fithub-api")
    except Exception:
        api_ver = "dev"

    return AdminHealth(
        api_version=api_ver,
        uptime_seconds=uptime,
        last_llm_call_at=llm_row.get("last_call"),
        errors_last_hour=int(err_hour.get("cnt") or 0),
        recent_errors=[
            RecentError(
                created_at=r["created_at"],
                path=r["path"],
                status_code=r["status_code"],
                error_type=r.get("error_type"),
                error_msg=r.get("error_msg"),
            )
            for r in recent_errors
        ],
        recent_llm_errors=[
            LLMError(
                created_at=r["created_at"],
                endpoint=r["endpoint"],
                error_code=r.get("error_code"),
                error_msg=r.get("error_msg"),
            )
            for r in llm_errors
        ],
        safety_trigger_count_7d=0,
    )


# ── Admin: knowledge base ─────────────────────────────────────────────────────


@router.get("/api/v1/admin/knowledge-base", response_model=list[KBEntry])
async def list_knowledge_base(
    _admin: Annotated[uuid.UUID, Depends(require_admin)],
    conn: Annotated[DBConn, Depends(get_db)],
) -> list[KBEntry]:
    async with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            """
            SELECT
                gen_random_uuid()       AS id,
                source_type,
                source_type             AS title,
                COUNT(*)::int           AS chunk_count,
                MAX(id::text)::uuid     AS _last_id
            FROM coaching_embeddings
            GROUP BY source_type
            ORDER BY source_type
            """,
        )
        rows = await cur.fetchall()

    return [
        KBEntry(
            id=r["id"],
            source_type=r["source_type"],
            title=r["title"],
            chunk_count=r["chunk_count"],
            last_indexed_at=None,
        )
        for r in rows
    ]


@router.post(
    "/api/v1/admin/knowledge-base/reindex",
    response_model=ReindexJob,
    status_code=status.HTTP_202_ACCEPTED,
)
async def trigger_reindex(
    body: ReindexBody,
    _admin: Annotated[uuid.UUID, Depends(require_admin)],
) -> ReindexJob:
    job_id = str(uuid.uuid4())
    return ReindexJob(
        job_id=job_id,
        status="queued",
        message="Reindex queued. Run `uv run python -m app.ai.ingest` to process.",
    )


@router.get(
    "/api/v1/admin/knowledge-base/reindex/{job_id}",
    response_model=ReindexJob,
)
async def get_reindex_status(
    job_id: str,
    _admin: Annotated[uuid.UUID, Depends(require_admin)],
) -> ReindexJob:
    return ReindexJob(
        job_id=job_id,
        status="unknown",
        message="Job tracking not yet implemented. Check server logs.",
    )
