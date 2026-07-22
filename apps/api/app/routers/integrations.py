"""Integrations router: Apple Health HAE ingest, connection management."""

from __future__ import annotations

import json
import logging

import psycopg
from fastapi import APIRouter, HTTPException, Request

from app.dependencies.common import Auth, DBConn
from app.integrations.ingest_tokens import generate_ingest_token, verify_ingest_token
from app.middleware.rate_limit import limiter, user_or_ip_key
from app.models.integrations import (
    ConnectionStatus,
    ConnectResponse,
    IntegrationDetail,
    SyncResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/integrations", tags=["integrations"])


# ── Dev-only: generate an ingest token ────────────────────────────────────────


@router.post("/apple-health/connect", response_model=ConnectResponse)
@limiter.limit("10/hour", key_func=user_or_ip_key)
async def connect_apple_health(
    request: Request,
    user: Auth,
    db: DBConn,
) -> ConnectResponse:
    """Generate a bearer token for HAE (dev-only endpoint). Returns plaintext once."""
    plaintext, token_hash, prefix = generate_ingest_token()

    await db.execute(
        """
        INSERT INTO data_connections (user_id, provider, config)
        VALUES (%s, 'apple_health',
                jsonb_build_object('ingest_token_hash', %s::text, 'ingest_token_prefix', %s::text))
        ON CONFLICT (user_id, provider)
        DO UPDATE SET config = jsonb_build_object(
                          'ingest_token_hash',   %s::text,
                          'ingest_token_prefix', %s::text
                      )
        """,
        [user.user_id, token_hash, prefix, token_hash, prefix],
    )

    base_url = str(request.base_url).rstrip("/")
    return ConnectResponse(
        token=plaintext,
        token_prefix=prefix,
        ingest_url=f"{base_url}/api/v1/integrations/apple-health/sync",
    )


# ── Dev-only: revoke ingest token ─────────────────────────────────────────────


@router.delete("/apple-health/token", status_code=204)
@limiter.limit("10/hour", key_func=user_or_ip_key)
async def revoke_apple_health_token(
    request: Request,
    user: Auth,
    db: DBConn,
) -> None:
    await db.execute(
        """
        DELETE FROM data_connections
        WHERE user_id = %s AND provider = 'apple_health'
        """,
        [user.user_id],
    )


# ── List integrations ─────────────────────────────────────────────────────────


@router.get("", response_model=list[ConnectionStatus])
async def list_integrations(
    user: Auth,
    db: DBConn,
) -> list[ConnectionStatus]:
    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            """
            SELECT provider, sync_status,
                   to_char(last_synced_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
                       AS last_synced_at,
                   config->>'ingest_token_prefix' AS token_prefix
            FROM data_connections
            WHERE user_id = %s
            ORDER BY provider
            LIMIT 20
            """,
            [user.user_id],
        )
        rows = await cur.fetchall()

    return [
        ConnectionStatus(
            provider=r["provider"],
            sync_status=r["sync_status"],
            last_synced_at=r["last_synced_at"],
            token_prefix=r["token_prefix"],
        )
        for r in rows
    ]


# ── Per-provider detail (Domain 07 §C) ────────────────────────────────────────


@router.get("/apple-health", response_model=IntegrationDetail)
async def get_apple_health_detail(
    user: Auth,
    db: DBConn,
) -> IntegrationDetail:
    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            """
            SELECT provider, sync_status,
                   to_char(last_synced_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
                       AS last_synced_at,
                   config->>'ingest_token_prefix' AS token_prefix,
                   last_sync_rows_inserted, last_sync_recovery_computed, last_sync_error
            FROM data_connections
            WHERE user_id = %s AND provider = 'apple_health'
            """,
            [user.user_id],
        )
        row = await cur.fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="No Apple Health connection")

    return IntegrationDetail(
        provider=row["provider"],
        sync_status=row["sync_status"],
        last_synced_at=row["last_synced_at"],
        token_prefix=row["token_prefix"],
        last_sync_rows_inserted=row["last_sync_rows_inserted"],
        last_sync_recovery_computed=row["last_sync_recovery_computed"],
        last_sync_error=row["last_sync_error"],
    )


# ── Apple Health ingest (HAE bearer token OR Supabase JWT) ────────────────────


@router.post("/apple-health/sync", response_model=SyncResponse)
@limiter.limit("60/hour", key_func=user_or_ip_key)
async def apple_health_sync(
    request: Request,
    db: DBConn,
) -> SyncResponse:
    """Accept an HAE payload authenticated by a dev ingest bearer token."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    bearer = auth.removeprefix("Bearer ")

    # Filter by stored token prefix first to avoid a full-table scan, then
    # do the constant-time hash verify only on the (typically one) matching row.
    token_prefix = bearer[:12]
    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            """
            SELECT user_id::text, config
            FROM data_connections
            WHERE provider = 'apple_health'
              AND config->>'ingest_token_prefix' = %s
            LIMIT 10
            """,
            [token_prefix],
        )
        rows = await cur.fetchall()

    user_id: str | None = None
    for row in rows:
        stored_hash: str = row["config"].get("ingest_token_hash", "")
        if stored_hash and verify_ingest_token(bearer, stored_hash):
            user_id = row["user_id"]
            break

    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid ingest token")

    _MAX_BODY = 5 * 1024 * 1024  # 5 MB
    content_length = request.headers.get("content-length")
    try:
        if content_length and int(content_length) > _MAX_BODY:
            await _record_sync_error(db, user_id, "payload_too_large")
            raise HTTPException(status_code=413, detail="Payload too large")
    except ValueError:
        pass  # body size check below is authoritative
    body_bytes = await request.body()
    if len(body_bytes) > _MAX_BODY:
        await _record_sync_error(db, user_id, "payload_too_large")
        raise HTTPException(status_code=413, detail="Payload too large")
    try:
        payload = json.loads(body_bytes)
    except json.JSONDecodeError as exc:
        await _record_sync_error(db, user_id, "invalid_json")
        raise HTTPException(status_code=400, detail="Invalid JSON") from exc

    from app.integrations.apple_health import ingest_apple_health

    rows_inserted = await ingest_apple_health(payload, user_id, db)

    # Trigger recovery computation in background (best-effort)
    recovery_computed = False
    try:
        from app.engine.baselines import compute_today_recovery

        await compute_today_recovery(user_id, db)
        recovery_computed = True
    except Exception:
        logger.exception("Recovery computation failed for user %s", user_id)

    # Persist this sync's outcome (Domain 07 §C source-detail screen). Clears
    # any previously-recorded error class now that a sync has succeeded.
    await db.execute(
        """
        UPDATE data_connections
        SET last_synced_at = now(),
            sync_status = 'idle',
            last_sync_rows_inserted = %s,
            last_sync_recovery_computed = %s,
            last_sync_error = NULL
        WHERE user_id = %s AND provider = 'apple_health'
        """,
        [rows_inserted, recovery_computed, user_id],
    )

    return SyncResponse(rows_inserted=rows_inserted, recovery_computed=recovery_computed)


async def _record_sync_error(db: DBConn, user_id: str, error_code: str) -> None:
    """Flag the connection as errored before raising to the caller, so the
    source-detail screen (07 §C) can translate the failure class to plain
    language on the user's next visit. Only used for failure classes that
    occur after the bearer token has already been verified against this
    user's row — see the migration's docstring for why 401 is excluded.

    Commits explicitly: `get_db` rolls back the connection's transaction on
    an exception leaving the route handler, and every call site here writes
    this row specifically so it survives the `HTTPException` raised right
    after — without the commit, the flag would be rolled back along with it.
    """
    await db.execute(
        """
        UPDATE data_connections
        SET sync_status = 'error', last_sync_error = %s
        WHERE user_id = %s AND provider = 'apple_health'
        """,
        [error_code, user_id],
    )
    await db.commit()
