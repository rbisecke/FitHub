"""Plans repository — SQL layer for training plan CRUD and task polling."""

from __future__ import annotations

import uuid
from datetime import date
from typing import Any

import psycopg
import psycopg.rows
from psycopg.rows import dict_row

from app.models.plan import (
    MesocycleOut,
    PlanDetail,
    PlannedItemOut,
    PlannedItemPatch,
    PlannedSessionOut,
    PlanSummary,
    SessionPatch,
)


async def list_plans(
    user_id: uuid.UUID,
    db: psycopg.AsyncConnection[Any],
) -> list[PlanSummary]:
    """Return all plans for a user, newest first."""
    async with db.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            SELECT id, goal, title, branch_name, weeks, status,
                   start_date, end_date,
                   to_char(created_at AT TIME ZONE 'UTC',
                           'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
            FROM plans WHERE user_id = %s ORDER BY created_at DESC
            """,
            [user_id],
        )
        rows = await cur.fetchall()

    return [
        PlanSummary(
            id=r["id"],
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


async def get_plan_task(
    task_id: str,
    user_id: uuid.UUID,
    db: psycopg.AsyncConnection[Any],
) -> dict[str, Any] | None:
    """Fetch a plan generation task scoped to the owning user."""
    async with db.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            "SELECT id::text, status, plan_id::text, error"
            " FROM plan_tasks WHERE id = %s AND user_id = %s",
            [task_id, user_id],
        )
        row = await cur.fetchone()
    return dict(row) if row is not None else None


async def create_plan_task(
    task_id: str,
    user_id: uuid.UUID,
    db: psycopg.AsyncConnection[Any],
) -> None:
    """Insert a pending plan generation task row."""
    await db.execute(
        "INSERT INTO plan_tasks (id, user_id, status) VALUES (%s::uuid, %s, 'pending')",
        [task_id, user_id],
    )


async def check_plan_exists(
    plan_id: str,
    user_id: uuid.UUID,
    db: psycopg.AsyncConnection[Any],
) -> bool:
    """Return True when the plan exists and is owned by user_id."""
    async with db.cursor() as cur:
        await cur.execute(
            "SELECT id FROM plans WHERE id = %s::uuid AND user_id = %s",
            [plan_id, user_id],
        )
        return await cur.fetchone() is not None


async def get_plan_detail(
    plan_id: str,
    user_id: uuid.UUID,
    db: psycopg.AsyncConnection[Any],
) -> PlanDetail | None:
    """Fetch a full plan with mesocycles and sessions.

    Returns None when the plan doesn't exist or belongs to another user.
    The three queries (plan, mesocycles, sessions) are sequential because
    psycopg3 does not support concurrent queries on a single connection.
    """
    async with db.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            SELECT id, goal, title, branch_name, weeks, status,
                   start_date, end_date, training_age,
                   to_char(created_at AT TIME ZONE 'UTC',
                           'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
            FROM plans WHERE id = %s AND user_id = %s
            """,
            [plan_id, user_id],
        )
        plan = await cur.fetchone()

    if plan is None:
        return None

    async with db.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            "SELECT id, name, phase, week_start, week_end, focus"
            " FROM mesocycles WHERE plan_id = %s ORDER BY week_start",
            [plan_id],
        )
        mesos = await cur.fetchall()

    async with db.cursor(row_factory=dict_row) as cur:
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
            """,
            [plan_id],
        )
        sessions_raw = await cur.fetchall()

    return PlanDetail(
        id=plan["id"],
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
                id=m["id"],
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
                id=s["id"],
                mesocycle_id=s["mesocycle_id"],
                scheduled_date=s["scheduled_date"],
                session_type=str(s["session_type"]),
                title=str(s["title"]),
                notes=str(s["notes"]) if s["notes"] else None,
                status=str(s["status"]),
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


async def get_session_id_for_date(
    plan_id: str,
    user_id: uuid.UUID,
    target_date: date,
    db: psycopg.AsyncConnection[Any],
) -> str | None:
    """Return the session id scheduled on target_date for a user-owned plan."""
    async with db.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            SELECT ps.id::text FROM planned_sessions ps
            JOIN plans p ON p.id = ps.plan_id
            WHERE ps.plan_id = %s AND p.user_id = %s AND ps.scheduled_date = %s
            LIMIT 1
            """,
            [plan_id, user_id, target_date],
        )
        row = await cur.fetchone()
    return str(row["id"]) if row is not None else None


async def load_prescribed_sessions(
    plan_id: str,
    user_id: uuid.UUID,
    db: psycopg.AsyncConnection[Any],
) -> list[dict[str, object]]:
    """Return prescribed sessions with items for the revision prompt."""
    async with db.cursor(row_factory=dict_row) as cur:
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


async def apply_session_patch(
    patch: SessionPatch,
    plan_id: str,
    user_id: uuid.UUID,
    db: psycopg.AsyncConnection[Any],
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
                await _insert_planned_item(cur, patch.session_id, user_id, item)


async def _insert_planned_item(
    cur: psycopg.AsyncCursor[Any],
    session_id: str,
    user_id: uuid.UUID,
    item: PlannedItemPatch,
) -> None:
    await cur.execute(
        """
        INSERT INTO planned_items
            (session_id, user_id, movement_name, sets, reps,
             load_pct_1rm, load_kg, notes, item_order)
        VALUES (%s::uuid, %s::uuid, %s, %s, %s, %s, %s, %s, %s)
        """,
        [
            session_id,
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


async def insert_plan_adaptation(
    plan_id: str,
    user_id: uuid.UUID,
    trigger_data_json: str,
    rationale: str,
    stub: bool,
    db: psycopg.AsyncConnection[Any],
) -> None:
    """Record a manual plan revision as a merged adaptation audit row."""
    await db.execute(
        """
        INSERT INTO adaptations
            (plan_id, user_id, trigger_type, trigger_data,
             rationale, status, stub, merged_at)
        VALUES (%s::uuid, %s, 'manual', %s::jsonb,
                %s, 'merged', %s, now())
        """,
        [plan_id, user_id, trigger_data_json, rationale, stub],
    )
