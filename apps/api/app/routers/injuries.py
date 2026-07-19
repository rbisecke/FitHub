"""Injuries router: report and list injuries."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal, cast

import psycopg.rows
from fastapi import APIRouter, HTTPException, Request, status

from app.dependencies.common import Auth, DBConn
from app.engine.injury import (
    get_contraindicated_movements,
    has_red_flags,
    resolve_substitution,
)
from app.middleware.rate_limit import limiter, user_or_ip_key
from app.models.injury import BodyRegion, InjuryOut, ReportInjuryRequest, UpdateInjuryStatusRequest

router = APIRouter(prefix="/api/v1/injuries", tags=["injuries"])

# Server-side mirror of the allowed forward-only status transitions — the UI
# can't produce an invalid transition, but a direct API call must not be able
# to either. A status mapping to itself means "resend the same status to save
# restriction_notes only" (cleared_with_restrictions, permanent). `permanent`
# can still be resolved server-side (e.g. support/manual correction) even
# though the UI doesn't expose that action per 05 §2.1's terminal-but-active
# framing — see test_permanent_injury_can_be_resolved, an existing contract
# this validation must not break. `resolved` has no outgoing transitions
# (also enforced by the `status != 'resolved'` WHERE clause below).
_ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "active": {"cleared_with_restrictions", "permanent", "resolved"},
    "cleared_with_restrictions": {"cleared_with_restrictions", "resolved"},
    "permanent": {"permanent", "resolved"},
    "resolved": set(),
}

_SELECT_COLS = """
    id::text, user_id, body_region, pain_level,
    mechanism, notes, active, requires_referral,
    status, cleared_at, restriction_notes,
    reported_at, resolved_at
"""


def _row_to_injury_out(
    r: dict[str, object], *, substitutions: list[str] | None = None
) -> InjuryOut:
    body_region = BodyRegion(str(r["body_region"]))
    return InjuryOut(
        id=str(r["id"]),
        user_id=str(r["user_id"]),
        body_region=body_region,
        pain_level=int(str(r["pain_level"])),
        mechanism=str(r["mechanism"]) if r["mechanism"] else None,
        notes=str(r["notes"]) if r["notes"] else None,
        active=bool(r["active"]),
        status=cast(
            Literal["active", "cleared_with_restrictions", "permanent", "resolved"],
            r.get("status") or "active",
        ),
        requires_referral=bool(r["requires_referral"]),
        substitutions=substitutions if substitutions is not None else [],
        contraindicated=get_contraindicated_movements(body_region),
        reported_at=cast(datetime | None, r["reported_at"]),
        resolved_at=cast(datetime | None, r["resolved_at"]),
        cleared_at=cast(datetime | None, r.get("cleared_at")),
        restriction_notes=str(r["restriction_notes"]) if r.get("restriction_notes") else None,
    )


@router.post("", response_model=InjuryOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute", key_func=user_or_ip_key)
async def report_injury(
    request: Request,
    req: ReportInjuryRequest,
    user: Auth,
    db: DBConn,
) -> InjuryOut:
    referral = has_red_flags(req.notes, req.pain_level, req.body_region)
    substitutions: list[str] = []
    contraindicated = get_contraindicated_movements(req.body_region)

    if not referral:
        for movement in contraindicated:
            subs = resolve_substitution(req.body_region, movement)
            substitutions.extend(subs)
        substitutions = list(dict.fromkeys(substitutions))

    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            f"""
            INSERT INTO injuries
                (user_id, body_region, pain_level, mechanism, notes, requires_referral)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING {_SELECT_COLS}
            """,
            [
                user.user_id,
                req.body_region,
                req.pain_level,
                req.mechanism,
                req.notes,
                referral,
            ],
        )
        row = await cur.fetchone()

    if row is None:
        raise RuntimeError("Insert returned no row")

    return _row_to_injury_out(row, substitutions=substitutions if not referral else [])


@router.get("", response_model=list[InjuryOut])
async def list_injuries(
    user: Auth,
    db: DBConn,
) -> list[InjuryOut]:
    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            f"""
            SELECT {_SELECT_COLS}
            FROM injuries
            WHERE user_id = %s AND status != 'resolved'
            ORDER BY reported_at DESC
            LIMIT 50
            """,
            [user.user_id],
        )
        rows = await cur.fetchall()

    return [_row_to_injury_out(r) for r in rows]


@router.patch("/{injury_id}/status", response_model=InjuryOut)
@limiter.limit("30/minute", key_func=user_or_ip_key)
async def update_injury_status(
    request: Request,
    injury_id: str,
    req: UpdateInjuryStatusRequest,
    user: Auth,
    db: DBConn,
) -> InjuryOut:
    # Validate UUID format
    try:
        uuid.UUID(injury_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Invalid injury ID") from exc

    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            f"SELECT {_SELECT_COLS} FROM injuries WHERE id = %s AND user_id = %s",
            [injury_id, user.user_id],
        )
        existing = await cur.fetchone()

    if existing is None:
        raise HTTPException(status_code=404, detail="Injury not found")

    current_status = str(existing.get("status") or "active")
    if req.status not in _ALLOWED_TRANSITIONS.get(current_status, set()):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot move from '{current_status}' to '{req.status}'.",
        )

    set_clauses = ["status = %s", "restriction_notes = %s"]
    params: list[object] = [req.status, req.restriction_notes]

    if req.status == "cleared_with_restrictions":
        set_clauses.append("cleared_at = now()")
    elif req.status == "resolved":
        set_clauses.append("resolved_at = now()")
        set_clauses.append("active = false")
    # permanent: stays active=true so the injury engine keeps filtering workouts

    params.append(injury_id)
    params.append(user.user_id)

    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            f"""
            UPDATE injuries
            SET {", ".join(set_clauses)}
            WHERE id = %s AND user_id = %s AND status != 'resolved'
            RETURNING {_SELECT_COLS}
            """,
            params,
        )
        updated = await cur.fetchone()

    if updated is None:
        async with db.cursor(row_factory=psycopg.rows.dict_row) as check:
            await check.execute(
                "SELECT status FROM injuries WHERE id = %s AND user_id = %s",
                [injury_id, user.user_id],
            )
            existing_check = await check.fetchone()
        if existing_check is None:
            raise HTTPException(status_code=404, detail="Injury not found")
        raise HTTPException(
            status_code=400,
            detail="Cannot update a resolved injury. File a new injury report instead.",
        )

    return _row_to_injury_out(updated)
