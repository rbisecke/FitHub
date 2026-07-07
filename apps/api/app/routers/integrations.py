"""Integrations router: Apple Health HAE ingest, connection management."""

from __future__ import annotations

import logging

import psycopg
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.dependencies.common import Auth, DBConn
from app.integrations.ingest_tokens import generate_ingest_token, verify_ingest_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/integrations", tags=["integrations"])


# ── Response models ────────────────────────────────────────────────────────────


class ConnectResponse(BaseModel):
    token: str
    token_prefix: str
    ingest_url: str


class ConnectionStatus(BaseModel):
    provider: str
    sync_status: str
    last_synced_at: str | None


class SyncResponse(BaseModel):
    rows_inserted: int
    recovery_computed: bool


# ── Dev-only: generate an ingest token ────────────────────────────────────────


@router.post("/apple-health/connect", response_model=ConnectResponse)
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
async def revoke_apple_health_token(
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
                       AS last_synced_at
            FROM data_connections
            WHERE user_id = %s
            ORDER BY provider
            """,
            [user.user_id],
        )
        rows = await cur.fetchall()

    return [
        ConnectionStatus(
            provider=r["provider"],
            sync_status=r["sync_status"],
            last_synced_at=r["last_synced_at"],
        )
        for r in rows
    ]


# ── Apple Health ingest (HAE bearer token OR Supabase JWT) ────────────────────


@router.post("/apple-health/sync", response_model=SyncResponse)
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

    payload = await request.json()

    from app.integrations.apple_health import ingest_apple_health

    rows_inserted = await ingest_apple_health(payload, user_id, db)

    # Update last_synced_at
    await db.execute(
        """
        UPDATE data_connections
        SET last_synced_at = now(), sync_status = 'idle'
        WHERE user_id = %s AND provider = 'apple_health'
        """,
        [user_id],
    )

    # Trigger recovery computation in background (best-effort)
    recovery_computed = False
    try:
        from app.engine.baselines import compute_today_recovery

        await compute_today_recovery(user_id, db)
        recovery_computed = True
    except Exception:
        logger.exception("Recovery computation failed for user %s", user_id)

    return SyncResponse(rows_inserted=rows_inserted, recovery_computed=recovery_computed)
