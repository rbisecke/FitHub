"""Plans router: async plan generation, task polling, plan CRUD."""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from datetime import date
from typing import Annotated, Literal, cast

import psycopg
import psycopg.rows
from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.ai.kill_switch import require_llm_enabled
from app.ai.stub import is_stubbed
from app.dependencies.common import Auth, DBConn
from app.middleware.rate_limit import limiter, user_or_ip_key
from app.models.plan import (
    CompleteSessionRequest,
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

log = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/plans", tags=["plans"])

_bg_tasks: set[asyncio.Task[None]] = set()


async def _prefetch_1rm(
    movement_id: uuid.UUID,
    user_id: str,
    db: psycopg.AsyncConnection[object],
) -> float | None:
    """Return the best estimated 1RM (kg) for this user + movement using the Epley formula.

    Queries the 20 most recent weight results for the movement, computes
    estimated 1RM = load * (1 + reps/30) for each set, and returns the max.
    Returns None if there are no eligible results.

    Security: WHERE clause always includes user_id to prevent IDOR.
    """
    try:
        async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
            await cur.execute(
                """
                SELECT load_kg, reps
                FROM public.results
                WHERE user_id = %s AND movement_id = %s
                  AND result_type = 'weight'
                  AND load_kg IS NOT NULL AND reps IS NOT NULL
                ORDER BY created_at DESC
                LIMIT 20
                """,
                [user_id, movement_id],
            )
            rows = await cur.fetchall()
    except psycopg.Error:
        log.exception("db error in _prefetch_1rm user_id=%s movement_id=%s", user_id, movement_id)
        return None

    if not rows:
        return None

    # Epley formula: e1RM = load * (1 + reps/30); take max across recent sets
    estimates = [
        float(r["load_kg"]) * (1 + int(str(r["reps"])) / 30)
        for r in rows
        if str(r["reps"]).isdigit()
    ]
    return round(max(estimates), 1) if estimates else None


async def _get_plan_detail(
    plan_id: str, user_id: str, db: psycopg.AsyncConnection[object]
) -> PlanDetail:
    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            """
            SELECT p.id, p.archetype, p.title, p.branch_name, p.weeks, p.status,
                   p.start_date, p.end_date, p.training_age,
                   to_char(p.created_at AT TIME ZONE 'UTC',
                           'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
                   pt.generation_tier, pt.corrections
            FROM plans p
            LEFT JOIN LATERAL (
                SELECT generation_tier, corrections
                FROM plan_tasks
                WHERE plan_id = p.id
                ORDER BY created_at DESC
                LIMIT 1
            ) pt ON true
            WHERE p.id = %s AND p.user_id = %s
            """,
            [plan_id, user_id],
        )
        plan = await cur.fetchone()

    if plan is None:
        raise HTTPException(status_code=404, detail="Plan not found")

    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            "SELECT id, name, phase, week_start, week_end, focus"
            " FROM mesocycles WHERE plan_id = %s ORDER BY week_start LIMIT 60",
            [plan_id],
        )
        mesos = await cur.fetchall()

    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            """
            SELECT ps.id, ps.mesocycle_id, ps.scheduled_date,
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
            LIMIT 500
            """,
            [plan_id],
        )
        sessions_raw = await cur.fetchall()

    return PlanDetail(
        id=plan["id"],
        archetype=cast(
            Literal[
                "general-crossfit",
                "strength-bias",
                "travel-minimal",
                "aerobic-base",
                "bodyweight-calisthenics",
                "skill-acquisition",
                "one-rm-peak",
            ],
            plan["archetype"],
        ),
        title=str(plan["title"]),
        branch_name=str(plan["branch_name"]),
        weeks=int(str(plan["weeks"])),
        status=cast(Literal["active", "archived", "draft"], plan["status"]),
        start_date=plan["start_date"],
        end_date=plan["end_date"],
        training_age=cast(
            Literal["beginner", "intermediate", "advanced"] | None, plan["training_age"]
        ),
        created_at=str(plan["created_at"]),
        generation_tier=cast(
            Literal["ai", "deterministic_substitution", "static_fallback"] | None,
            plan["generation_tier"],
        ),
        corrections=list(plan["corrections"]) if plan["corrections"] else [],
        mesocycles=[
            MesocycleOut(
                id=m["id"],
                name=str(m["name"]),
                phase=cast(
                    Literal["accumulation", "intensification", "deload", "peak", "test"], m["phase"]
                ),
                week_start=int(str(m["week_start"])),
                week_end=int(str(m["week_end"])),
                focus=str(m["focus"]) if m["focus"] else None,
            )
            for m in mesos
        ],
        sessions=[
            PlannedSessionOut(
                id=s["id"],
                mesocycle_id=s["mesocycle_id"],
                scheduled_date=s["scheduled_date"],
                session_type=cast(
                    Literal["strength", "metcon", "skill", "mixed", "rest", "active_recovery"],
                    s["session_type"],
                ),
                title=str(s["title"]),
                notes=str(s["notes"]) if s["notes"] else None,
                status=cast(Literal["prescribed", "completed", "skipped", "adapted"], s["status"]),
                items=[
                    PlannedItemOut(
                        id=it["id"],
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
    """Return prescribed sessions with items for the revision/adaptation prompts.

    Includes load_pct_1rm/load_kg/item notes (not just movement_name/sets/reps)
    so callers building a before/after diff (adaptation generation) have the
    full old-side state available without a second query.
    """
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
            JOIN plans p ON p.id = ps.plan_id
            WHERE ps.plan_id = %s AND p.user_id = %s AND ps.status = 'prescribed'
            GROUP BY ps.id, ps.scheduled_date, ps.session_type,
                     ps.title, ps.notes, ps.status
            ORDER BY ps.scheduled_date
            LIMIT 50
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
    """Update title/notes/status and replace items for a single prescribed session."""
    async with db.cursor() as cur:
        if (
            patch.new_title is not None
            or patch.new_notes is not None
            or patch.new_status is not None
        ):
            await cur.execute(
                """
                UPDATE planned_sessions SET
                    title = COALESCE(%s, title),
                    notes = COALESCE(%s, notes),
                    status = COALESCE(%s, status)
                WHERE id = %s::uuid AND plan_id = %s::uuid AND user_id = %s::uuid
                """,
                [
                    patch.new_title,
                    patch.new_notes,
                    patch.new_status,
                    patch.session_id,
                    plan_id,
                    user_id,
                ],
            )
        if patch.modified_items:
            await cur.execute(
                """
                DELETE FROM planned_items
                WHERE session_id = %s::uuid AND user_id = %s::uuid
                  AND session_id IN (
                      SELECT id FROM planned_sessions WHERE plan_id = %s::uuid
                  )
                """,
                [patch.session_id, user_id, plan_id],
            )
            item_rows = [
                (
                    patch.session_id,
                    user_id,
                    item.movement_name,
                    item.sets,
                    item.reps,
                    item.load_pct_1rm,
                    item.load_kg,
                    item.notes,
                    item.item_order,
                )
                for item in patch.modified_items
            ]
            await cur.executemany(
                """
                INSERT INTO planned_items
                    (session_id, user_id, movement_name, sets, reps,
                     load_pct_1rm, load_kg, notes, item_order)
                VALUES (%s::uuid, %s::uuid, %s, %s, %s, %s, %s, %s, %s)
                """,
                item_rows,
            )


def _short_hash(workout_id: uuid.UUID) -> str:
    """Same 8-char scheme as repositories/workouts.py's create_workout."""
    return str(workout_id).replace("-", "")[:8]


async def _complete_planned_session(
    plan_id: str,
    session_id: str,
    user_id: str,
    req: CompleteSessionRequest,
    db: psycopg.AsyncConnection[object],
) -> PlannedSessionOut:
    """Persist logged sets as a workout+results and mark the session complete.

    One transaction: ownership check, planned_item_id cross-tenant validation,
    INSERT workout, bulk-INSERT results (one row per logged set), UPDATE
    planned_sessions.status (guarded to only fire from 'prescribed', so a
    resubmit can't duplicate the workout). A constraint violation on any
    logged set (e.g. a bad planned_item_id) rolls back the whole thing,
    including the workout row.
    """
    try:
        async with db.transaction(), db.cursor(row_factory=psycopg.rows.dict_row) as cur:
            # Ownership check — 404 (not 403) for another user's session, same
            # IDOR-prevention convention as _apply_session_patch/revise_plan.
            await cur.execute(
                "SELECT title FROM planned_sessions"
                " WHERE id = %s::uuid AND plan_id = %s::uuid AND user_id = %s::uuid",
                [session_id, plan_id, user_id],
            )
            session_row = await cur.fetchone()
            if session_row is None:
                raise HTTPException(status_code=404, detail="Session not found")

            # Cross-tenant reference check — every logged_sets[].planned_item_id
            # must genuinely belong to THIS session and user, not just exist
            # somewhere in the table (a plain FK check would let a caller
            # attach their own results to another user's planned_items row).
            if req.logged_sets:
                submitted_item_ids = {s.planned_item_id for s in req.logged_sets}
                await cur.execute(
                    "SELECT id FROM planned_items"
                    " WHERE id = ANY(%s) AND session_id = %s::uuid AND user_id = %s::uuid",
                    [list(submitted_item_ids), session_id, user_id],
                )
                valid_rows = await cur.fetchall()
                valid_item_ids = {row["id"] for row in valid_rows}
                if valid_item_ids != submitted_item_ids:
                    raise HTTPException(
                        status_code=400,
                        detail="One or more logged sets reference an invalid planned item.",
                    )

            workout_id = uuid.uuid4()
            await cur.execute(
                """
                INSERT INTO public.workouts
                    (id, user_id, performed_at, title, short_hash, bodyweight_kg)
                VALUES (%s, %s, now(), %s, %s, %s)
                """,
                [
                    workout_id,
                    user_id,
                    session_row["title"],
                    _short_hash(workout_id),
                    req.bodyweight_kg,
                ],
            )

            if req.logged_sets:
                await cur.executemany(
                    """
                    INSERT INTO public.results
                        (user_id, workout_id, movement_id, planned_item_id,
                         result_type, load_kg, reps, rpe)
                    VALUES (%s, %s, %s, %s, 'weight', %s, %s, %s)
                    """,
                    [
                        (
                            user_id,
                            workout_id,
                            s.movement_id,
                            s.planned_item_id,
                            s.load_kg,
                            s.reps,
                            s.rpe,
                        )
                        for s in req.logged_sets
                    ],
                )

            await cur.execute(
                """
                UPDATE planned_sessions SET status = 'completed'
                WHERE id = %s::uuid AND plan_id = %s::uuid AND user_id = %s::uuid
                  AND status = 'prescribed'
                RETURNING id, mesocycle_id, scheduled_date, session_type, title, notes, status
                """,
                [session_id, plan_id, user_id],
            )
            updated = await cur.fetchone()
            if updated is None:
                # Ownership/existence was already confirmed above, so zero rows
                # here means the session was found but is no longer 'prescribed'
                # (already completed/skipped/adapted) — a resubmit, not an IDOR.
                raise HTTPException(
                    status_code=409, detail="This session has already been completed."
                )

            await cur.execute(
                """
                SELECT id, movement_name, sets, reps,
                       load_pct_1rm::float AS load_pct_1rm, load_kg::float AS load_kg,
                       notes, item_order
                FROM planned_items
                WHERE session_id = %s::uuid
                ORDER BY item_order
                LIMIT 100
                """,
                [session_id],
            )
            item_rows = await cur.fetchall()
    except psycopg.Error as exc:
        log.exception(
            "db error completing session_id=%s plan_id=%s user_id=%s",
            session_id,
            plan_id,
            user_id,
        )
        raise HTTPException(status_code=500, detail="Internal error. Please try again.") from exc

    return PlannedSessionOut(**updated, items=[PlannedItemOut(**row) for row in item_rows])


@router.post("", status_code=202, response_model=PlanTaskResponse)
@limiter.limit("3/hour", key_func=user_or_ip_key)
async def create_plan(
    request: Request,
    req: CreatePlanRequest,
    user: Auth,
    db: DBConn,
    _kill: Annotated[None, Depends(require_llm_enabled)],
) -> PlanTaskResponse:
    # Pre-fetch 1RM from results table when archetype needs it but caller didn't supply one
    current_1rm: float | None = req.current_1rm_kg
    if req.target_movement_id is not None and current_1rm is None:
        current_1rm = await _prefetch_1rm(req.target_movement_id, str(user.user_id), db)

    try:
        task_id = str(uuid.uuid4())
        await db.execute(
            "INSERT INTO plan_tasks (id, user_id, status) VALUES (%s::uuid, %s, 'pending')",
            [task_id, user.user_id],
        )
    except psycopg.Error as exc:
        log.exception("db error creating plan_task for user_id=%s", user.user_id)
        raise HTTPException(status_code=500, detail="Internal error. Please try again.") from exc

    from app.ai.plan_generator import run_plan_generation  # noqa: PLC0415

    req_data: dict[str, object] = {
        "archetype": req.archetype,
        "title": req.title,
        "start_date": req.start_date.isoformat(),
        "weeks": req.weeks,
        "training_age": req.training_age,
        "equipment": list(req.equipment),
        "days_per_week": req.days_per_week,
        "target_movement_id": str(req.target_movement_id) if req.target_movement_id else None,
        "max_duration_weeks": req.max_duration_weeks,
        "current_1rm_kg": current_1rm,
    }
    _task = asyncio.create_task(run_plan_generation(task_id, str(user.user_id), req_data))
    _bg_tasks.add(_task)
    _task.add_done_callback(_bg_tasks.discard)

    return PlanTaskResponse(task_id=task_id, status="pending")


@router.get("/tasks/{task_id}", response_model=PlanTaskResponse)
async def get_task(
    task_id: uuid.UUID,
    user: Auth,
    db: DBConn,
) -> PlanTaskResponse:
    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            "SELECT id::text, status, plan_id, error, generation_tier, corrections"
            " FROM plan_tasks WHERE id = %s AND user_id = %s",
            [task_id, user.user_id],
        )
        row = await cur.fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Task not found")

    return PlanTaskResponse(
        task_id=str(row["id"]),
        status=cast(Literal["pending", "running", "complete", "failed"], row["status"]),
        plan_id=row["plan_id"],
        error=str(row["error"]) if row["error"] else None,
        generation_tier=cast(
            Literal["ai", "deterministic_substitution", "static_fallback"] | None,
            row["generation_tier"],
        ),
        corrections=list(row["corrections"]) if row["corrections"] else [],
    )


@router.get("", response_model=list[PlanSummary])
async def list_plans(
    user: Auth,
    db: DBConn,
    before_id: uuid.UUID | None = Query(default=None),
) -> list[PlanSummary]:
    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        if before_id is not None:
            await cur.execute(
                """
                SELECT id, archetype, title, branch_name, weeks, status,
                       start_date, end_date,
                       to_char(created_at AT TIME ZONE 'UTC',
                               'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
                FROM plans
                WHERE user_id = %s
                  AND (created_at, id) < (
                      SELECT created_at, id FROM plans WHERE id = %s AND user_id = %s
                  )
                ORDER BY created_at DESC
                LIMIT 50
                """,
                [user.user_id, before_id, user.user_id],
            )
        else:
            await cur.execute(
                """
                SELECT id, archetype, title, branch_name, weeks, status,
                       start_date, end_date,
                       to_char(created_at AT TIME ZONE 'UTC',
                               'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
                FROM plans WHERE user_id = %s ORDER BY created_at DESC LIMIT 50
                """,
                [user.user_id],
            )
        rows = await cur.fetchall()

    return [
        PlanSummary(
            id=r["id"],
            archetype=cast(
                Literal[
                    "general-crossfit",
                    "strength-bias",
                    "travel-minimal",
                    "aerobic-base",
                    "bodyweight-calisthenics",
                    "skill-acquisition",
                    "one-rm-peak",
                ],
                r["archetype"],
            ),
            title=str(r["title"]),
            branch_name=str(r["branch_name"]),
            weeks=int(str(r["weeks"])),
            status=cast(Literal["active", "archived", "draft"], r["status"]),
            start_date=r["start_date"],
            end_date=r["end_date"],
            created_at=str(r["created_at"]),
        )
        for r in rows
    ]


@router.get("/{plan_id}", response_model=PlanDetail)
async def get_plan(
    plan_id: uuid.UUID,
    user: Auth,
    db: DBConn,
) -> PlanDetail:
    return await _get_plan_detail(str(plan_id), str(user.user_id), db)


@router.get("/{plan_id}/today", response_model=PlannedSessionOut | None)
async def today_session(
    plan_id: uuid.UUID,
    user: Auth,
    db: DBConn,
) -> PlannedSessionOut | None:
    today = date.today()
    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            """
            SELECT ps.id, ps.mesocycle_id, ps.scheduled_date,
                   ps.session_type, ps.title, ps.notes, ps.status,
                   COALESCE(
                       json_agg(
                           json_build_object(
                               'id', pi.id,
                               'movement_name', pi.movement_name,
                               'sets', pi.sets, 'reps', pi.reps,
                               'load_pct_1rm', pi.load_pct_1rm::float,
                               'load_kg', pi.load_kg::float,
                               'notes', pi.notes,
                               'item_order', pi.item_order
                           ) ORDER BY pi.item_order
                       ) FILTER (WHERE pi.id IS NOT NULL),
                       '[]'
                   ) AS items
            FROM planned_sessions ps
            JOIN plans p ON p.id = ps.plan_id
            LEFT JOIN planned_items pi ON pi.session_id = ps.id
            WHERE ps.plan_id = %s AND p.user_id = %s AND ps.scheduled_date = %s
            GROUP BY ps.id, ps.mesocycle_id, ps.scheduled_date,
                     ps.session_type, ps.title, ps.notes, ps.status
            LIMIT 1
            """,
            [plan_id, user.user_id, today],
        )
        row = await cur.fetchone()

    if row is None:
        return None

    items = [PlannedItemOut(**item) for item in (row["items"] or [])]
    return PlannedSessionOut(**{k: v for k, v in row.items() if k != "items"}, items=items)


@router.post("/{plan_id}/revise", response_model=PlanDetail)
@limiter.limit("3/hour", key_func=user_or_ip_key)
async def revise_plan(
    plan_id: uuid.UUID,
    request: Request,
    req: PlanRevisionRequest,
    user: Auth,
    db: DBConn,
    _kill: Annotated[None, Depends(require_llm_enabled)],
) -> PlanDetail:
    # 1. Verify plan ownership
    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            "SELECT id FROM plans WHERE id = %s::uuid AND user_id = %s",
            [plan_id, user.user_id],
        )
        if await cur.fetchone() is None:
            raise HTTPException(status_code=404, detail="Plan not found")

    # 2. Load prescribed sessions — 422 if none remain
    prescribed = await _load_prescribed_sessions(str(plan_id), str(user.user_id), db)
    if not prescribed:
        raise HTTPException(status_code=422, detail="No prescribed sessions to revise")

    # 3. Generate revision diff
    from app.ai.plan_generator import generate_plan_revision  # noqa: PLC0415

    diff = await generate_plan_revision(prescribed, req.feedback, user_id=user.user_id, db=db)

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
            await _apply_session_patch(patch, str(plan_id), str(user.user_id), db)

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
                user.user_id,
                json.dumps({"feedback": req.feedback}),
                diff.rationale,
                is_stubbed(),
            ],
        )

    # 6. Return updated plan detail
    return await _get_plan_detail(str(plan_id), str(user.user_id), db)


@router.post("/{plan_id}/sessions/{session_id}/complete", response_model=PlannedSessionOut)
@limiter.limit("30/minute", key_func=user_or_ip_key)  # matches create_workout_route's convention
async def complete_session(
    plan_id: uuid.UUID,
    session_id: uuid.UUID,
    request: Request,
    req: CompleteSessionRequest,
    user: Auth,
    db: DBConn,
) -> PlannedSessionOut:
    return await _complete_planned_session(
        plan_id=str(plan_id),
        session_id=str(session_id),
        user_id=str(user.user_id),
        req=req,
        db=db,
    )
