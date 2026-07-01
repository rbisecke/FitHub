"""Injuries read repository — used by the coach for context injection."""

from __future__ import annotations

import uuid
from typing import Any

import psycopg
from psycopg.rows import dict_row

from app.engine.injury import get_contraindicated_movements
from app.models.coach import ActiveInjurySummary


async def fetch_active_injuries(
    db: psycopg.AsyncConnection[Any],
    user_id: uuid.UUID,
) -> list[ActiveInjurySummary]:
    """Return active (non-resolved) injuries with their contraindicated movements."""
    async with db.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            SELECT body_region, pain_level, notes, requires_referral
            FROM injuries
            WHERE user_id = %s AND active = true
            ORDER BY reported_at DESC
            """,
            [str(user_id)],
        )
        rows = await cur.fetchall()

    return [
        ActiveInjurySummary(
            body_region=str(r["body_region"]),
            pain_level=int(str(r["pain_level"])),
            notes=str(r["notes"]) if r["notes"] else None,
            requires_referral=bool(r["requires_referral"]),
            contraindicated=get_contraindicated_movements(str(r["body_region"])),
        )
        for r in rows
    ]
