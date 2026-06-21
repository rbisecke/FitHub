"""Plans router: async plan generation, task polling, plan CRUD."""

from __future__ import annotations

import asyncio
import json
import uuid
from datetime import date
from typing import Annotated

import psycopg
import psycopg.rows
from fastapi import APIRouter, Depends, HTTPException, Request

from app.ai.kill_switch import require_llm_enabled
from app.ai.stub import is_stubbed
from app.auth import UserContext, get_current_user
from app.db import get_db
from app.middleware.rate_limit import limiter
from app.models.plan import (
    CreatePlanRequest,
    MesocycleOut,
    PlanDetail,
    PlannedItemOut,
    PlannedSessionOut,
    PlanRevisionRequest,
    PlanSummary,
    PlanTaskResponse,
    SessionPatch,
)

router = APIRouter(prefix="/api/v1/plans", tags=["plans"])

_Db = Annotated[psycopg.AsyncConnection[object], Depends(get_db)]


async def _get_plan_detail(
    plan_id: str, user_id: str, db: psycopg.AsyncConnection[object]
) -> PlanDetail:
    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            """
            SELECT id::text, goal, title, branch_name, weeks, status,
                   start_date, end_date, training_age,
                   to_char(created_at AT TIME ZONE 'UTC',
                           'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
            FROM plans WHERE id = %s AND user_id = %s
            """,
            [plan_id, user_id],
        )
        plan = await cur.fetchone()

    if plan is None:
        raise HTTPException(status_code=404, detail="Plan not found")

    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            "SELECT id::text, name, phase, week_start, week_end, focus"
            " FROM mesocycles WHERE plan_id = %s ORDER BY week_start",
            [plan_id],
        )
        mesos = await cur.fetchall()

    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            """
            SELECT ps.id::text, ps.mesocycle_id::text, ps.scheduled_date,
                   ps.session_type, ps.title, ps.notes, ps.status,
                   COALESCE(
                       json_agg(
                           json_build_object(
                               'id', pi.id::text,
                               'movement_name', pi.movement_name,
                               'sets', pi.sets,
                               'reps', pi.reps,
                               'load_pct_1rm', pi.load_pct_1rm::float,
                               'load_kg', pi.load_kg::float,
                               'notes', pi.notes,
                               'item_order', pi.item_order
                           ) ORDER BY pi.item_order
                       ) FILTER (WHERE pi.id IS NOT NULL),
                       '[]'
                   ) AS items
            FROM planned_sessions ps
            LEFT JOIN planned_items pi ON pi.session_id = ps.id
            WHERE ps.plan_id = %s
            GROUP BY ps.id, ps.mesocycle_id, ps.scheduled_date,
                     ps.session_type, ps.title, ps.notes, ps.status
            ORDER BY ps.scheduled_date
            """,
            [plan_id],
        )
        sessions_raw = await cur.fetchall()

    return PlanDetail(
        id=str(plan["id"]),
        goal=str(plan["goal"]),
        title=str(plan["title"]),
        branch_name=str(plan["branch_name"]),
        weeks=int(str(plan["weeks"])),
        status=str(plan["status"]),
        start_date=plan["start_date"],
        end_date=plan["end_date"],
        training_age=str(plan["training_age"]) if plan["training_age"] else None,
        created_at=str(plan["created_at"]),
        mesocycles=[
            MesocycleOut(
                id=str(m["id"]),
                name=str(m["name"]),
                phase=str(m["phase"]),
                week_start=int(str(m["week_start"])),
                week_end=int(str(m["week_end"])),
                focus=str(m["focus"]) if m["focus"] else None,
            )
            for m in mesos
        ],
        sessions=[
            PlannedSessionOut(
                id=str(s["id"]),
                mesocycle_id=str(s["mesocycle_id"]),
                scheduled_date=s["scheduled_date"],
                session_type=str(s["session_type"]),
                title=str(s["title"]),
                notes=str(s["notes"]) if s["notes"] else None,
                status=str(s["status"]),
                items=[
                    PlannedItemOut(
                        id=str(it["id"]),
                        movement_name=str(it["movement_name"]),
                        sets=it["sets"],
                        reps=str(it["reps"]) if it["reps"] else None,
                        load_pct_1rm=it["load_pct_1rm"],
                        load_kg=it["load_kg"],
                        notes=str(it["notes"]) if it["notes"] else None,
                        item_order=int(str(it["item_order"])),
                    )
                    for it in (s["items"] or [])
                ],
            )
            for s in sessions_raw
        ],
    )


async def _load_prescribed_sessions(
    plan_id: str,
    user_id: str,
    db: psycopg.AsyncConnection[object],
) -> list[dict[str, object]]:
    """Return prescribed sessions with items for the revision prompt."""
    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            """
            SELECT ps.id::text, ps.scheduled_date::text, ps.session_type,
                   ps.title, ps.notes, ps.status,
                   COALESCE(
                       json_agg(
                           json_build_object(
                               'id', pi.id::text,
                               'movement_name', pi.movement_name,
                               'sets', pi.sets,
                               'reps', pi.reps,
                               'item_order', pi.item_order
                           ) ORDER BY pi.item_order
                       ) FILTER (WHERE pi.id IS NOT NULL),
                       '[]'
                   ) AS items
            FROM planned_sessions ps
            LEFT JOIN planned_items pi ON pi.session_id = ps.id
            JOIN plans p ON p.id = ps.plan_id
            WHERE ps.plan_id = %s AND p.user_id = %s AND ps.status = 'prescribed'
            GROUP BY ps.id, ps.scheduled_date, ps.session_type,
                     ps.title, ps.notes, ps.status
            ORDER BY ps.scheduled_date
            """,
            [plan_id, user_id],
        )
        rows = await cur.fetchall()
    return [dict(r) for r in rows]


async def _apply_session_patch(
    patch: SessionPatch,
    plan_id: str,
    user_id: str,
    db: psycopg.AsyncConnection[object],
) -> None:
    """Update title/notes and replace items for a single prescribed session."""
    async with db.cursor() as cur:
        if patch.new_title is not None or patch.new_notes is not None:
            await cur.execute(
                """
                UPDATE planned_sessions SET
                    title = COALESCE(%s, title),
                    notes = COALESCE(%s, notes)
                WHERE id = %s::uuid AND plan_id = %s::uuid
                """,
                [patch.new_title, patch.new_notes, patch.session_id, plan_id],
            )
        if patch.modified_items:
            await cur.execute(
                "DELETE FROM planned_items WHERE session_id = %s::uuid",
                [patch.session_id],
            )
            for item in patch.modified_items:
                await cur.execute(
                    """
                    INSERT INTO planned_items
                        (session_id, user_id, movement_name, sets, reps,
                         load_pct_1rm, load_kg, notes, item_order)
                    VALUES (%s::uuid, %s::uuid, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    [
                        patch.session_id,
                        user_id,
                        item.movement_name,
                        item.sets,
                        item.reps,
                        item.load_pct_1rm,
                        item.load_kg,
                        item.notes,
                        item.item_order,
                    ],
                )


@router.post("", status_code=202, response_model=PlanTaskResponse)
@limiter.limit("3/hour")
async def create_plan(
    request: Request,
    req: CreatePlanRequest,
    user: Annotated[UserContext, Depends(get_current_user)],
    db: _Db,
    _kill: Annotated[None, Depends(require_llm_enabled)],
) -> PlanTaskResponse:
    task_id = str(uuid.uuid4())
    await db.execute(
        "INSERT INTO plan_tasks (id, user_id, status) VALUES (%s::uuid, %s, 'pending')",
        [task_id, str(user.user_id)],
    )

    from app.ai.plan_generator import run_plan_generation  # noqa: PLC0415

    req_data: dict[str, object] = {
        "goal": req.goal,
        "title": req.title,
        "start_date": req.start_date.isoformat(),
        "weeks": req.weeks,
        "training_age": req.training_age,
    }
    asyncio.create_task(run_plan_generation(task_id, str(user.user_id), req_data))

    return PlanTaskResponse(task_id=task_id, status="pending")


@router.get("/tasks/{task_id}", response_model=PlanTaskResponse)
async def get_task(
    task_id: str,
    user: Annotated[UserContext, Depends(get_current_user)],
    db: _Db,
) -> PlanTaskResponse:
    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            "SELECT id::text, status, plan_id::text, error"
            " FROM plan_tasks WHERE id = %s AND user_id = %s",
            [task_id, str(user.user_id)],
        )
        row = await cur.fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Task not found")

    return PlanTaskResponse(
        task_id=str(row["id"]),
        status=str(row["status"]),
        plan_id=str(row["plan_id"]) if row["plan_id"] else None,
        error=str(row["error"]) if row["error"] else None,
    )


@router.get("", response_model=list[PlanSummary])
async def list_plans(
    user: Annotated[UserContext, Depends(get_current_user)],
    db: _Db,
) -> list[PlanSummary]:
    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            """
            SELECT id::text, goal, title, branch_name, weeks, status,
                   start_date, end_date,
                   to_char(created_at AT TIME ZONE 'UTC',
                           'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
            FROM plans WHERE user_id = %s ORDER BY created_at DESC
            """,
            [str(user.user_id)],
        )
        rows = await cur.fetchall()

    return [
        PlanSummary(
            id=str(r["id"]),
            goal=str(r["goal"]),
            title=str(r["title"]),
            branch_name=str(r["branch_name"]),
            weeks=int(str(r["weeks"])),
            status=str(r["status"]),
            start_date=r["start_date"],
            end_date=r["end_date"],
            created_at=str(r["created_at"]),
        )
        for r in rows
    ]


@router.get("/{plan_id}", response_model=PlanDetail)
async def get_plan(
    plan_id: str,
    user: Annotated[UserContext, Depends(get_current_user)],
    db: _Db,
) -> PlanDetail:
    return await _get_plan_detail(plan_id, str(user.user_id), db)


@router.get("/{plan_id}/today", response_model=PlannedSessionOut | None)
async def today_session(
    plan_id: str,
    user: Annotated[UserContext, Depends(get_current_user)],
    db: _Db,
) -> PlannedSessionOut | None:
    today = date.today()
    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            """
            SELECT ps.id::text FROM planned_sessions ps
            JOIN plans p ON p.id = ps.plan_id
            WHERE ps.plan_id = %s AND p.user_id = %s AND ps.scheduled_date = %s
            LIMIT 1
            """,
            [plan_id, str(user.user_id), today],
        )
        row = await cur.fetchone()

    if row is None:
        return None

    detail = await _get_plan_detail(plan_id, str(user.user_id), db)
    for s in detail.sessions:
        if s.id == str(row["id"]):
            return s
    return None


@router.post("/{plan_id}/revise", response_model=PlanDetail)
async def revise_plan(
    plan_id: str,
    req: PlanRevisionRequest,
    user: Annotated[UserContext, Depends(get_current_user)],
    db: _Db,
    _kill: Annotated[None, Depends(require_llm_enabled)],
) -> PlanDetail:
    # 1. Verify plan ownership
    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            "SELECT id FROM plans WHERE id = %s::uuid AND user_id = %s",
            [plan_id, str(user.user_id)],
        )
        if await cur.fetchone() is None:
            raise HTTPException(status_code=404, detail="Plan not found")

    # 2. Load prescribed sessions — 422 if none remain
    prescribed = await _load_prescribed_sessions(plan_id, str(user.user_id), db)
    if not prescribed:
        raise HTTPException(status_code=422, detail="No prescribed sessions to revise")

    # 3. Generate revision diff
    from app.ai.plan_generator import generate_plan_revision  # noqa: PLC0415

    diff = await generate_plan_revision(prescribed, req.feedback)

    # 4. Validate that all changed sessions are prescribed
    prescribed_ids = {str(s["id"]) for s in prescribed}
    for patch in diff.changed_sessions:
        if patch.session_id not in prescribed_ids:
            raise HTTPException(
                status_code=422,
                detail=f"Session {patch.session_id} is not a prescribed session",
            )

    # 5. Apply patches + write audit row in one transaction
    async with db.transaction():
        for patch in diff.changed_sessions:
            await _apply_session_patch(patch, plan_id, str(user.user_id), db)

        await db.execute(
            """
            INSERT INTO adaptations
                (plan_id, user_id, trigger_type, trigger_data,
                 rationale, status, stub, merged_at)
            VALUES (%s::uuid, %s, 'manual', %s::jsonb,
                    %s, 'merged', %s, now())
            """,
            [
                plan_id,
                str(user.user_id),
                json.dumps({"feedback": req.feedback}),
                diff.rationale,
                is_stubbed(),
            ],
        )

    # 6. Return updated plan detail
    return await _get_plan_detail(plan_id, str(user.user_id), db)
