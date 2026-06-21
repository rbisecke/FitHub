"""Adaptations router: detect triggers, list, merge, reject."""

from __future__ import annotations

from typing import Annotated

import psycopg
import psycopg.rows
from fastapi import APIRouter, Depends, HTTPException

from app.auth import UserContext, get_current_user
from app.db import get_db
from app.models.adaptation import AdaptationOut, DetectTriggersResponse

router = APIRouter(tags=["adaptations"])

_Db = Annotated[psycopg.AsyncConnection[object], Depends(get_db)]


@router.post("/api/v1/plans/{plan_id}/adaptations/detect", response_model=DetectTriggersResponse)
async def detect_plan_adaptations(
    plan_id: str,
    user: Annotated[UserContext, Depends(get_current_user)],
    db: _Db,
) -> DetectTriggersResponse:
    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            "SELECT id FROM plans WHERE id = %s::uuid AND user_id = %s",
            [plan_id, str(user.user_id)],
        )
        if await cur.fetchone() is None:
            raise HTTPException(status_code=404, detail="Plan not found")

    from app.ai.adaptation import generate_adaptation
    from app.engine.adaptation_triggers import detect_triggers

    triggers = await detect_triggers(str(user.user_id), plan_id, db)

    proposed: list[AdaptationOut] = []
    for trigger in triggers:
        result = await generate_adaptation(trigger, [])
        async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
            await cur.execute(
                """
                INSERT INTO adaptations
                    (plan_id, user_id, trigger_type, trigger_data, rationale, diff_json, stub)
                VALUES (%s::uuid, %s, %s, %s::jsonb, %s, %s::jsonb, %s)
                RETURNING id::text, plan_id::text, user_id::text,
                          trigger_type, trigger_data, status, rationale, diff_json,
                          stub, proposed_at, merged_at, rejected_at
                """,
                [
                    plan_id,
                    str(user.user_id),
                    str(trigger["type"]),
                    str(trigger["data"]).replace("'", '"'),
                    str(result.get("rationale", "")),
                    None,
                    bool(result.get("stub", False)),
                ],
            )
            row = await cur.fetchone()
        if row:
            proposed.append(
                AdaptationOut(
                    id=str(row["id"]),
                    plan_id=str(row["plan_id"]),
                    user_id=str(row["user_id"]),
                    trigger_type=str(row["trigger_type"]),
                    trigger_data=(
                        trigger["data"]  # type: ignore[arg-type]
                        if isinstance(trigger.get("data"), dict)
                        else {}
                    ),
                    status=str(row["status"]),
                    rationale=str(row["rationale"]) if row["rationale"] else None,
                    stub=bool(row["stub"]),
                    proposed_at=row["proposed_at"],
                )
            )

    return DetectTriggersResponse(
        plan_id=plan_id,
        triggers=triggers,
        proposed_adaptations=proposed,
    )


@router.get("/api/v1/plans/{plan_id}/adaptations", response_model=list[AdaptationOut])
async def list_adaptations(
    plan_id: str,
    user: Annotated[UserContext, Depends(get_current_user)],
    db: _Db,
) -> list[AdaptationOut]:
    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            """
            SELECT a.id::text, a.plan_id::text, a.user_id::text,
                   a.trigger_type, a.trigger_data, a.status,
                   a.rationale, a.diff_json, a.stub,
                   a.proposed_at, a.merged_at, a.rejected_at
            FROM adaptations a
            JOIN plans p ON p.id = a.plan_id
            WHERE a.plan_id = %s::uuid AND a.user_id = %s AND p.user_id = %s
            ORDER BY a.proposed_at DESC
            """,
            [plan_id, str(user.user_id), str(user.user_id)],
        )
        rows = await cur.fetchall()

    return [
        AdaptationOut(
            id=str(r["id"]),
            plan_id=str(r["plan_id"]),
            user_id=str(r["user_id"]),
            trigger_type=str(r["trigger_type"]),
            trigger_data=dict(r["trigger_data"]) if r["trigger_data"] else {},
            status=str(r["status"]),
            rationale=str(r["rationale"]) if r["rationale"] else None,
            diff_json=r["diff_json"],
            stub=bool(r["stub"]),
            proposed_at=r["proposed_at"],
            merged_at=r["merged_at"],
            rejected_at=r["rejected_at"],
        )
        for r in rows
    ]


@router.post("/api/v1/adaptations/{adaptation_id}/merge", response_model=AdaptationOut)
async def merge_adaptation(
    adaptation_id: str,
    user: Annotated[UserContext, Depends(get_current_user)],
    db: _Db,
) -> AdaptationOut:
    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            "SELECT id::text, status FROM adaptations WHERE id = %s::uuid AND user_id = %s",
            [adaptation_id, str(user.user_id)],
        )
        row = await cur.fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Adaptation not found")
    if str(row["status"]) != "proposed":
        raise HTTPException(status_code=409, detail="Adaptation is not in proposed state")

    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            """
            UPDATE adaptations
            SET status = 'merged', merged_at = now()
            WHERE id = %s::uuid AND user_id = %s
            RETURNING id::text, plan_id::text, user_id::text,
                      trigger_type, trigger_data, status, rationale, diff_json,
                      stub, proposed_at, merged_at, rejected_at
            """,
            [adaptation_id, str(user.user_id)],
        )
        updated = await cur.fetchone()

    if updated is None:
        raise HTTPException(status_code=404, detail="Adaptation not found")

    return AdaptationOut(
        id=str(updated["id"]),
        plan_id=str(updated["plan_id"]),
        user_id=str(updated["user_id"]),
        trigger_type=str(updated["trigger_type"]),
        trigger_data=dict(updated["trigger_data"]) if updated["trigger_data"] else {},
        status=str(updated["status"]),
        rationale=str(updated["rationale"]) if updated["rationale"] else None,
        stub=bool(updated["stub"]),
        proposed_at=updated["proposed_at"],
        merged_at=updated["merged_at"],
    )


@router.post("/api/v1/adaptations/{adaptation_id}/reject", response_model=AdaptationOut)
async def reject_adaptation(
    adaptation_id: str,
    user: Annotated[UserContext, Depends(get_current_user)],
    db: _Db,
) -> AdaptationOut:
    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            "SELECT id::text, status FROM adaptations WHERE id = %s::uuid AND user_id = %s",
            [adaptation_id, str(user.user_id)],
        )
        row = await cur.fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Adaptation not found")
    if str(row["status"]) != "proposed":
        raise HTTPException(status_code=409, detail="Adaptation is not in proposed state")

    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            """
            UPDATE adaptations
            SET status = 'rejected', rejected_at = now()
            WHERE id = %s::uuid AND user_id = %s
            RETURNING id::text, plan_id::text, user_id::text,
                      trigger_type, trigger_data, status, rationale, diff_json,
                      stub, proposed_at, merged_at, rejected_at
            """,
            [adaptation_id, str(user.user_id)],
        )
        updated = await cur.fetchone()

    if updated is None:
        raise HTTPException(status_code=404, detail="Adaptation not found")

    return AdaptationOut(
        id=str(updated["id"]),
        plan_id=str(updated["plan_id"]),
        user_id=str(updated["user_id"]),
        trigger_type=str(updated["trigger_type"]),
        trigger_data=dict(updated["trigger_data"]) if updated["trigger_data"] else {},
        status=str(updated["status"]),
        rationale=str(updated["rationale"]) if updated["rationale"] else None,
        stub=bool(updated["stub"]),
        proposed_at=updated["proposed_at"],
        rejected_at=updated["rejected_at"],
    )
