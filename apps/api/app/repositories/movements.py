from __future__ import annotations

import uuid
from typing import Any

import psycopg
from psycopg.rows import dict_row

from app.models.movement import (
    CreateMovementRequest,
    LastResult,
    Modality,
    Movement,
    PersonalRecordResult,
)


def _escape_like(s: str) -> str:
    return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


async def search_movements(
    conn: psycopg.AsyncConnection[Any],
    *,
    query: str | None = None,
    modality: Modality | None = None,
    limit: int = 50,
) -> list[Movement]:
    like = f"%{_escape_like(query)}%" if query else None
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            SELECT *
            FROM   public.movements
            WHERE  (%s::text IS NULL OR name ILIKE %s ESCAPE '\\' OR slug ILIKE %s ESCAPE '\\')
              AND  (%s::text IS NULL OR modality = %s)
            ORDER  BY is_official DESC, name
            LIMIT  %s
            """,
            [like, like, like, modality, modality, limit],
        )
        rows = await cur.fetchall()
    return [Movement(**r) for r in rows]


async def create_movement(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
    req: CreateMovementRequest,
) -> Movement:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            INSERT INTO public.movements
                (name, slug, base_movement, modality, start_position,
                 catch_position, pause_position, tempo, execution_style,
                 movement_pattern, limb_style, implement,
                 default_result_types, default_result_type, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            [
                req.name,
                req.slug,
                req.base_movement,
                req.modality,
                req.start_position,
                req.catch_position,
                req.pause_position,
                req.tempo,
                req.execution_style,
                req.movement_pattern,
                req.limb_style,
                req.implement,
                req.default_result_types,
                req.default_result_type,
                user_id,
            ],
        )
        row = await cur.fetchone()
    if row is None:
        raise RuntimeError("Movement INSERT returned no row")
    return Movement(**row)


async def get_last_result_for_movement(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
    movement_id: uuid.UUID,
    implement: str | None = None,
    side: str | None = None,
) -> LastResult | None:
    extra = ""
    params: list[Any] = [user_id, movement_id]
    if implement is not None:
        extra += " AND r.implement = %s"
        params.append(implement)
    if side is not None:
        extra += " AND r.side = %s"
        params.append(side)

    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            f"""
            SELECT
                r.result_type,
                r.load_kg,
                r.reps,
                r.time_s,
                r.distance_m,
                r.rounds,
                r.partial_reps,
                r.calories,
                r.watts,
                w.performed_at::date AS performed_at
            FROM   public.results r
            JOIN   public.workouts w ON w.id = r.workout_id
            WHERE  r.user_id = %s
              AND  r.movement_id = %s
              {extra}
            ORDER  BY w.performed_at DESC, r.created_at DESC
            LIMIT  1
            """,
            params,
        )
        row = await cur.fetchone()
    if row is None:
        return None
    return LastResult(**row)


async def get_personal_record(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
    movement_id: uuid.UUID,
    variant_annotation: str | None = None,
    implement: str | None = None,
    side: str | None = None,
) -> PersonalRecordResult | None:
    extra = ""
    params: list[Any] = [user_id, movement_id]
    if variant_annotation is not None:
        extra += " AND r.variant_annotation = %s"
        params.append(variant_annotation)
    if implement is not None:
        extra += " AND r.implement = %s"
        params.append(implement)
    if side is not None:
        extra += " AND r.side = %s"
        params.append(side)

    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            f"""
            SELECT
                r.movement_id,
                r.result_type,
                r.load_kg,
                r.reps,
                r.time_s,
                r.distance_m,
                r.estimated_1rm_kg,
                w.performed_at::date AS achieved_at
            FROM   public.results r
            JOIN   public.workouts w ON w.id = r.workout_id
            WHERE  r.user_id     = %s
              AND  r.movement_id  = %s
              AND  r.is_pr        = TRUE
              {extra}
            ORDER  BY w.performed_at DESC, r.estimated_1rm_kg DESC NULLS LAST
            LIMIT  1
            """,
            params,
        )
        row = await cur.fetchone()
    if row is None:
        return None
    return PersonalRecordResult(**row)


async def get_personal_records_batch(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
    movement_ids: list[uuid.UUID],
) -> list[PersonalRecordResult]:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            SELECT DISTINCT ON (r.movement_id)
                r.movement_id,
                r.result_type,
                r.load_kg,
                r.reps,
                r.time_s,
                r.distance_m,
                r.estimated_1rm_kg,
                w.performed_at::date AS achieved_at
            FROM   public.results r
            JOIN   public.workouts w ON w.id = r.workout_id
            WHERE  r.user_id      = %s
              AND  r.movement_id  = ANY(%s)
              AND  r.is_pr        = TRUE
            ORDER  BY r.movement_id, r.estimated_1rm_kg DESC NULLS LAST
            LIMIT 20
            """,
            [user_id, list(movement_ids)],
        )
        rows = await cur.fetchall()
    return [PersonalRecordResult(**r) for r in rows]
