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
    sync_status: Literal["connected", "syncing", "idle", "error", "disconnected"]
    last_synced_at: str | None


class SyncResponse(BaseModel):
    rows_inserted: int
    recovery_computed: bool
