"""Injuries router: report and list injuries."""

from __future__ import annotations

import uuid
from typing import Annotated

import psycopg
import psycopg.rows
from fastapi import APIRouter, Depends, HTTPException

from app.auth import UserContext, get_current_user
from app.db import get_db
from app.engine.injury import (
    get_contraindicated_movements,
    has_red_flags,
    resolve_substitution,
)
from app.models.injury import InjuryOut, ReportInjuryRequest, UpdateInjuryStatusRequest

router = APIRouter(prefix="/api/v1/injuries", tags=["injuries"])

_Db = Annotated[psycopg.AsyncConnection[object], Depends(get_db)]

_SELECT_COLS = """
    id::text, user_id::text, body_region, pain_level,
    mechanism, notes, active, requires_referral,
    status, cleared_at, restriction_notes,
    reported_at, resolved_at
"""


def _row_to_injury_out(
    r: dict[str, object], *, substitutions: list[str] | None = None
) -> InjuryOut:
    body_region = str(r["body_region"])
    return InjuryOut(
        id=str(r["id"]),
        user_id=str(r["user_id"]),
        body_region=body_region,
        pain_level=int(str(r["pain_level"])),
        mechanism=str(r["mechanism"]) if r["mechanism"] else None,
        notes=str(r["notes"]) if r["notes"] else None,
        active=bool(r["active"]),
        status=str(r.get("status") or "active"),
        requires_referral=bool(r["requires_referral"]),
        substitutions=substitutions if substitutions is not None else [],
        contraindicated=get_contraindicated_movements(body_region),
        reported_at=r["reported_at"],  # type: ignore[arg-type]
        resolved_at=r["resolved_at"],  # type: ignore[arg-type]
        cleared_at=r.get("cleared_at"),  # type: ignore[arg-type]
        restriction_notes=str(r["restriction_notes"]) if r.get("restriction_notes") else None,
    )


@router.post("", response_model=InjuryOut)
async def report_injury(
    req: ReportInjuryRequest,
    user: Annotated[UserContext, Depends(get_current_user)],
    db: _Db,
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
                str(user.user_id),
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
    user: Annotated[UserContext, Depends(get_current_user)],
    db: _Db,
) -> list[InjuryOut]:
    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            f"""
            SELECT {_SELECT_COLS}
            FROM injuries
            WHERE user_id = %s AND status != 'resolved'
            ORDER BY reported_at DESC
            """,
            [str(user.user_id)],
        )
        rows = await cur.fetchall()

    return [_row_to_injury_out(r) for r in rows]


@router.patch("/{injury_id}/status", response_model=InjuryOut)
async def update_injury_status(
    injury_id: str,
    req: UpdateInjuryStatusRequest,
    user: Annotated[UserContext, Depends(get_current_user)],
    db: _Db,
) -> InjuryOut:
    # Validate UUID format
    try:
        uuid.UUID(injury_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Invalid injury ID") from exc

    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        # Fetch first — return 404 for other users' injuries (IDOR prevention)
        await cur.execute(
            f"SELECT {_SELECT_COLS} FROM injuries WHERE id = %s",
            [injury_id],
        )
        existing = await cur.fetchone()

    if existing is None or str(existing["user_id"]) != str(user.user_id):
        raise HTTPException(status_code=404, detail="Injury not found")

    current_status = str(existing.get("status") or "active")
    if current_status == "resolved":
        raise HTTPException(
            status_code=400,
            detail="Cannot update a resolved injury. File a new injury report instead.",
        )

    set_clauses = ["status = %s", "restriction_notes = %s"]
    params: list[object] = [req.status, req.restriction_notes]

    if req.status == "cleared_with_restrictions":
        set_clauses.append("cleared_at = now()")
    elif req.status == "resolved":
        set_clauses.append("resolved_at = now()")
        set_clauses.append("active = false")

    params.append(injury_id)

    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            f"""
            UPDATE injuries
            SET {", ".join(set_clauses)}
            WHERE id = %s
            RETURNING {_SELECT_COLS}
            """,
            params,
        )
        updated = await cur.fetchone()

    if updated is None:
        raise RuntimeError("Update returned no row")

    return _row_to_injury_out(updated)
