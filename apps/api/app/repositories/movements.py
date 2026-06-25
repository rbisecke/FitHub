from __future__ import annotations

import uuid
from typing import Any

import psycopg
from psycopg.rows import dict_row

from app.models.movement import CreateMovementRequest, LastResult, Modality, Movement


async def search_movements(
    conn: psycopg.AsyncConnection[Any],
    *,
    query: str | None = None,
    modality: Modality | None = None,
    limit: int = 50,
) -> list[Movement]:
    like = f"%{query}%" if query else None
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            SELECT *
            FROM   public.movements
            WHERE  (%s::text IS NULL OR name ILIKE %s OR slug ILIKE %s)
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
    assert row is not None
    return Movement(**row)


async def get_last_result_for_movement(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
    movement_id: uuid.UUID,
) -> LastResult | None:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
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
            ORDER  BY w.performed_at DESC, r.created_at DESC
            LIMIT  1
            """,
            [user_id, movement_id],
        )
        row = await cur.fetchone()
    if row is None:
        return None
    return LastResult(**row)
