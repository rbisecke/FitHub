"""Pydantic models for the integrations router."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class ConnectResponse(BaseModel):
    token: str
    token_prefix: str
    ingest_url: str


class ConnectionStatus(BaseModel):
    provider: str
    # The DB CHECK constraint on data_connections.sync_status only allows
    # these three values — a connected row is simply "idle" once its last
    # sync succeeded. "connected"/"disconnected" never occur as *values* of
    # this field; that state is derived from row existence instead (a
    # provider with no row at all is "disconnected"). See the router's list
    # endpoint and the frontend integrations list for the derivation.
    sync_status: Literal["idle", "syncing", "error"]
    last_synced_at: str | None
    token_prefix: str | None


class SyncResponse(BaseModel):
    rows_inserted: int
    recovery_computed: bool


class IntegrationDetail(BaseModel):
    """Per-provider detail (Domain 07 §C) — kept off the list endpoint so
    `GET /api/v1/integrations` stays cheap for the list screen."""

    provider: str
    sync_status: Literal["idle", "syncing", "error"]
    last_synced_at: str | None
    token_prefix: str | None
    last_sync_rows_inserted: int | None
    last_sync_recovery_computed: bool | None
    last_sync_error: Literal["payload_too_large", "invalid_json"] | None
