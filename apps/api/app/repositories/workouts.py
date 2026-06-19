from __future__ import annotations

import uuid
from typing import Any

import psycopg
from psycopg.rows import dict_row

from app.models.result import CreateResultRequest, Result
from app.models.workout import (
    CreateWorkoutRequest,
    PatchWorkoutRequest,
    Workout,
    WorkoutSummary,
)


def _short_hash(workout_id: uuid.UUID) -> str:
    return str(workout_id).replace("-", "")[:8]


async def _insert_result(
    cur: psycopg.AsyncCursor[dict[str, Any]],
    *,
    user_id: uuid.UUID,
    workout_id: uuid.UUID,
    req: CreateResultRequest,
) -> Result:
    await cur.execute(
        """
        INSERT INTO public.results
            (user_id, workout_id, movement_id, result_type,
             load_kg, reps, time_s, distance_m, calories, height_cm,
             rounds, partial_reps, watts, pace_s_500m,
             set_index, order_index, is_pr, notes)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING *
        """,
        [
            user_id,
            workout_id,
            req.movement_id,
            req.result_type,
            req.load_kg,
            req.reps,
            req.time_s,
            req.distance_m,
            req.calories,
            req.height_cm,
            req.rounds,
            req.partial_reps,
            req.watts,
            req.pace_s_500m,
            req.set_index,
            req.order_index,
            req.is_pr,
            req.notes,
        ],
    )
    row = await cur.fetchone()
    assert row is not None
    return Result(**row)


async def create_workout(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
    req: CreateWorkoutRequest,
) -> Workout:
    workout_id = uuid.uuid4()
    async with conn.transaction(), conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
                INSERT INTO public.workouts
                    (id, user_id, performed_at, title, short_hash, notes, bodyweight_kg)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
            [
                workout_id,
                user_id,
                req.performed_at,
                req.title,
                _short_hash(workout_id),
                req.notes,
                req.bodyweight_kg,
            ],
        )
        workout_row = await cur.fetchone()
        assert workout_row is not None

        results: list[Result] = []
        for r in req.results:
            result = await _insert_result(cur, user_id=user_id, workout_id=workout_id, req=r)
            results.append(result)

    return Workout(**workout_row, results=results)


async def list_workouts(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
    before_id: uuid.UUID | None = None,
    limit: int = 20,
) -> list[WorkoutSummary]:
    async with conn.cursor(row_factory=dict_row) as cur:
        if before_id is None:
            await cur.execute(
                """
                SELECT w.*, COALESCE(COUNT(r.id), 0) AS result_count
                FROM   public.workouts w
                LEFT JOIN public.results r
                       ON r.workout_id = w.id AND r.user_id = w.user_id
                WHERE  w.user_id = %s
                GROUP  BY w.id
                ORDER  BY w.performed_at DESC, w.id DESC
                LIMIT  %s
                """,
                [user_id, limit],
            )
        else:
            await cur.execute(
                """
                SELECT w.*, COALESCE(COUNT(r.id), 0) AS result_count
                FROM   public.workouts w
                LEFT JOIN public.results r
                       ON r.workout_id = w.id AND r.user_id = w.user_id
                WHERE  w.user_id = %s
                  AND  (w.performed_at, w.id) < (
                           SELECT performed_at, id
                           FROM   public.workouts
                           WHERE  id = %s AND user_id = %s
                       )
                GROUP  BY w.id
                ORDER  BY w.performed_at DESC, w.id DESC
                LIMIT  %s
                """,
                [user_id, before_id, user_id, limit],
            )
        rows = await cur.fetchall()
    return [WorkoutSummary(**r) for r in rows]


async def get_workout(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
    workout_id: uuid.UUID,
) -> Workout | None:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            "SELECT * FROM public.workouts WHERE id = %s AND user_id = %s",
            [workout_id, user_id],
        )
        workout_row = await cur.fetchone()
        if workout_row is None:
            return None

        await cur.execute(
            """
            SELECT * FROM public.results
            WHERE  workout_id = %s AND user_id = %s
            ORDER  BY order_index, id
            """,
            [workout_id, user_id],
        )
        result_rows = await cur.fetchall()

    return Workout(**workout_row, results=[Result(**r) for r in result_rows])


async def patch_workout(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
    workout_id: uuid.UUID,
    req: PatchWorkoutRequest,
) -> Workout | None:
    updates: dict[str, object] = {}
    if req.performed_at is not None:
        updates["performed_at"] = req.performed_at
    if req.title is not None:
        updates["title"] = req.title
    if req.notes is not None:
        updates["notes"] = req.notes
    if req.bodyweight_kg is not None:
        updates["bodyweight_kg"] = req.bodyweight_kg

    if not updates:
        return await get_workout(conn, user_id=user_id, workout_id=workout_id)

    set_clause = ", ".join(f"{col} = %s" for col in updates)
    params: list[object] = list(updates.values()) + [workout_id, user_id]

    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            f"UPDATE public.workouts SET {set_clause} WHERE id = %s AND user_id = %s RETURNING *",  # noqa: S608
            params,
        )
        workout_row = await cur.fetchone()
        if workout_row is None:
            return None

        await cur.execute(
            """
            SELECT * FROM public.results
            WHERE  workout_id = %s AND user_id = %s
            ORDER  BY order_index, id
            """,
            [workout_id, user_id],
        )
        result_rows = await cur.fetchall()

    return Workout(**workout_row, results=[Result(**r) for r in result_rows])


async def delete_workout(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
    workout_id: uuid.UUID,
) -> bool:
    async with conn.cursor() as cur:
        await cur.execute(
            "DELETE FROM public.workouts WHERE id = %s AND user_id = %s RETURNING id",
            [workout_id, user_id],
        )
        return cur.rowcount == 1
