"""Injuries router: report and list injuries."""

from __future__ import annotations

from typing import Annotated

import psycopg
import psycopg.rows
from fastapi import APIRouter, Depends

from app.auth import UserContext, get_current_user
from app.db import get_db
from app.engine.injury import (
    get_contraindicated_movements,
    has_red_flags,
    resolve_substitution,
)
from app.models.injury import InjuryOut, ReportInjuryRequest

router = APIRouter(prefix="/api/v1/injuries", tags=["injuries"])

_Db = Annotated[psycopg.AsyncConnection[object], Depends(get_db)]


@router.post("", response_model=InjuryOut)
async def report_injury(
    req: ReportInjuryRequest,
    user: Annotated[UserContext, Depends(get_current_user)],
    db: _Db,
) -> InjuryOut:
    referral = has_red_flags(req.notes, req.pain_level)
    substitutions: list[str] = []
    contraindicated = get_contraindicated_movements(req.body_region)

    if not referral:
        for movement in contraindicated:
            subs = resolve_substitution(req.body_region, movement)
            substitutions.extend(subs)
        substitutions = list(dict.fromkeys(substitutions))

    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            """
            INSERT INTO injuries
                (user_id, body_region, pain_level, mechanism, notes, requires_referral)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id::text, user_id::text, body_region, pain_level,
                      mechanism, notes, active, requires_referral,
                      reported_at, resolved_at
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

    return InjuryOut(
        id=str(row["id"]),
        user_id=str(row["user_id"]),
        body_region=str(row["body_region"]),
        pain_level=int(str(row["pain_level"])),
        mechanism=str(row["mechanism"]) if row["mechanism"] else None,
        notes=str(row["notes"]) if row["notes"] else None,
        active=bool(row["active"]),
        requires_referral=bool(row["requires_referral"]),
        substitutions=substitutions if not referral else [],
        contraindicated=contraindicated,
        reported_at=row["reported_at"],
        resolved_at=row["resolved_at"],
    )


@router.get("", response_model=list[InjuryOut])
async def list_injuries(
    user: Annotated[UserContext, Depends(get_current_user)],
    db: _Db,
) -> list[InjuryOut]:
    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            """
            SELECT id::text, user_id::text, body_region, pain_level,
                   mechanism, notes, active, requires_referral,
                   reported_at, resolved_at
            FROM injuries
            WHERE user_id = %s AND active = true
            ORDER BY reported_at DESC
            """,
            [str(user.user_id)],
        )
        rows = await cur.fetchall()

    return [
        InjuryOut(
            id=str(r["id"]),
            user_id=str(r["user_id"]),
            body_region=str(r["body_region"]),
            pain_level=int(str(r["pain_level"])),
            mechanism=str(r["mechanism"]) if r["mechanism"] else None,
            notes=str(r["notes"]) if r["notes"] else None,
            active=bool(r["active"]),
            requires_referral=bool(r["requires_referral"]),
            contraindicated=get_contraindicated_movements(str(r["body_region"])),
            reported_at=r["reported_at"],
            resolved_at=r["resolved_at"],
        )
        for r in rows
    ]
