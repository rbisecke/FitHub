from __future__ import annotations

import uuid
from decimal import Decimal
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

_EPLEY_MAX_REPS = 36


def _short_hash(workout_id: uuid.UUID) -> str:
    return str(workout_id).replace("-", "")[:8]


def _epley_1rm(load_kg: Decimal | None, reps: int | None) -> Decimal | None:
    """Epley formula: load × (1 + reps/30). Valid for 1–36 reps."""
    if load_kg is None or reps is None or not (1 <= reps <= _EPLEY_MAX_REPS):
        return None
    return load_kg * (1 + Decimal(reps) / 30)


def _compute_volume_load(results: list[CreateResultRequest]) -> Decimal | None:
    """Σ sets × reps × load_kg; None if no result has both fields."""
    total = Decimal(0)
    found = False
    for r in results:
        if r.load_kg is not None and r.reps is not None:
            total += r.load_kg * r.reps
            found = True
    return total if found else None


def _compute_perceived_load(session_rpe: Decimal | None, duration_s: int | None) -> int | None:
    """sRPE × duration_min, rounded to nearest integer."""
    if session_rpe is None or duration_s is None:
        return None
    return round(float(session_rpe) * duration_s / 60)


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
             rounds, partial_reps, watts, pace_s, pace_distance_m,
             set_index, order_index, is_pr, notes,
             rpe, rpe_target, rir, rest_s,
             mean_velocity_ms, peak_velocity_ms, estimated_1rm_kg)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
            req.pace_s,
            req.pace_distance_m,
            req.set_index,
            req.order_index,
            req.is_pr,
            req.notes,
            req.rpe,
            req.rpe_target,
            req.rir,
            req.rest_s,
            req.mean_velocity_ms,
            req.peak_velocity_ms,
            _epley_1rm(req.load_kg, req.reps),
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
    volume_load_kg = _compute_volume_load(req.results)
    perceived_load_au = _compute_perceived_load(req.session_rpe, req.duration_s)

    async with conn.transaction(), conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            INSERT INTO public.workouts
                (id, user_id, performed_at, title, short_hash, notes, bodyweight_kg,
                 session_type, workout_format, time_cap_s, location,
                 session_rpe, duration_s, perceived_load_au, volume_load_kg)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
                req.session_type,
                req.workout_format,
                req.time_cap_s,
                req.location,
                req.session_rpe,
                req.duration_s,
                perceived_load_au,
                volume_load_kg,
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
        _has_pr_subquery = """
            EXISTS (
              SELECT 1 FROM public.results r2
              WHERE r2.workout_id = w.id
                AND r2.estimated_1rm_kg IS NOT NULL
                AND r2.movement_id IS NOT NULL
                AND r2.estimated_1rm_kg = (
                  SELECT MAX(r3.estimated_1rm_kg)
                  FROM public.results r3
                  JOIN public.workouts w3 ON r3.workout_id = w3.id
                  WHERE w3.user_id = w.user_id
                    AND r3.movement_id = r2.movement_id
                )
            ) AS has_pr
        """
        if before_id is None:
            await cur.execute(
                f"""
                SELECT w.*, COALESCE(COUNT(r.id), 0) AS result_count,
                       {_has_pr_subquery}
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
                f"""
                SELECT w.*, COALESCE(COUNT(r.id), 0) AS result_count,
                       {_has_pr_subquery}
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
    if req.session_type is not None:
        updates["session_type"] = req.session_type
    if req.workout_format is not None:
        updates["workout_format"] = req.workout_format
    if req.time_cap_s is not None:
        updates["time_cap_s"] = req.time_cap_s
    if req.location is not None:
        updates["location"] = req.location
    if req.session_rpe is not None:
        updates["session_rpe"] = req.session_rpe
    if req.duration_s is not None:
        updates["duration_s"] = req.duration_s

    recompute_load = req.session_rpe is not None or req.duration_s is not None

    if not updates and not recompute_load:
        return await get_workout(conn, user_id=user_id, workout_id=workout_id)

    set_parts: list[str] = [f"{col} = %s" for col in updates]
    params: list[object] = list(updates.values())

    if recompute_load:
        # COALESCE lets a partial patch merge with the stored value for the unchanged component.
        set_parts.append(
            "perceived_load_au = ROUND("
            "COALESCE(%s::numeric, session_rpe) * COALESCE(%s::integer, duration_s) / 60.0"
            ")"
        )
        params += [req.session_rpe, req.duration_s]

    params += [workout_id, user_id]
    set_clause = ", ".join(set_parts)

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
