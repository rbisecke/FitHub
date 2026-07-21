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
    """Σ reps × load_kg across results; each row represents one set."""
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


async def _flag_prs(
    cur: psycopg.AsyncCursor[dict[str, Any]],
    *,
    user_id: uuid.UUID,
    workout_id: uuid.UUID,
) -> None:
    """Set is_pr = true on results in this workout that beat the user's prior best e1RM.

    Scoped per (movement, implement, side) variant (04 §2A, BG-23): a barbell
    PR and a dumbbell PR are different achievements, so a heavier dumbbell
    history must never suppress a fresh barbell PR (or vice versa). Both
    columns are nullable, so the comparison uses ``IS NOT DISTINCT FROM``
    rather than ``=`` — a NULL implement/side must match itself.
    """
    await cur.execute(
        """
        UPDATE public.results AS r
        SET    is_pr = true
        WHERE  r.workout_id        = %s
          AND  r.user_id           = %s
          AND  r.estimated_1rm_kg IS NOT NULL
          AND  r.movement_id      IS NOT NULL
          AND  r.estimated_1rm_kg  > COALESCE(
               (
                   SELECT MAX(r2.estimated_1rm_kg)
                   FROM   public.results r2
                   WHERE  r2.user_id     = r.user_id
                     AND  r2.movement_id = r.movement_id
                     AND  r2.implement IS NOT DISTINCT FROM r.implement
                     AND  r2.side      IS NOT DISTINCT FROM r.side
                     AND  r2.workout_id != %s
               ),
               0
          )
        """,
        [workout_id, user_id, workout_id],
    )


_INSERT_RESULT_SQL = """
    INSERT INTO public.results
        (user_id, workout_id, movement_id, result_type,
         load_kg, reps, time_s, distance_m, calories, height_cm,
         rounds, partial_reps, watts, pace_s, pace_distance_m,
         set_index, order_index, is_pr, notes, variant_annotation,
         implement, tempo, side,
         rpe, rpe_target, rir, rest_s,
         mean_velocity_ms, peak_velocity_ms, estimated_1rm_kg, scaled)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
"""


def _result_row(user_id: uuid.UUID, workout_id: uuid.UUID, r: CreateResultRequest) -> list[object]:
    return [
        user_id,
        workout_id,
        r.movement_id,
        r.result_type,
        r.load_kg,
        r.reps,
        r.time_s,
        r.distance_m,
        r.calories,
        r.height_cm,
        r.rounds,
        r.partial_reps,
        r.watts,
        r.pace_s,
        r.pace_distance_m,
        r.set_index,
        r.order_index,
        r.is_pr,
        r.notes,
        r.variant_annotation,
        r.implement,
        r.tempo,
        r.side,
        r.rpe,
        r.rpe_target,
        r.rir,
        r.rest_s,
        r.mean_velocity_ms,
        r.peak_velocity_ms,
        _epley_1rm(r.load_kg, r.reps),
        r.scaled,
    ]


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
                 session_rpe, duration_s, perceived_load_au, volume_load_kg, is_tag)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
                req.is_tag,
            ],
        )
        workout_row = await cur.fetchone()
        if workout_row is None:
            raise RuntimeError("Workout INSERT returned no row")

        if req.results:
            await cur.executemany(
                _INSERT_RESULT_SQL,
                [_result_row(user_id, workout_id, r) for r in req.results],
            )

        await _flag_prs(cur, user_id=user_id, workout_id=workout_id)

        # Re-fetch after PR flagging so returned results reflect is_pr correctly.
        await cur.execute(
            """
            SELECT r.*, m.name AS movement_name
            FROM   public.results r
            LEFT JOIN public.movements m ON m.id = r.movement_id
            WHERE  r.workout_id = %s AND r.user_id = %s
            ORDER  BY r.order_index, r.id
            LIMIT  500
            """,
            [workout_id, user_id],
        )
        result_rows = await cur.fetchall()

    return Workout(**workout_row, results=[Result(**r) for r in result_rows])


async def list_workouts(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
    before_id: uuid.UUID | None = None,
    limit: int = 20,
    session_type: str | None = None,
    partner_only: bool | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> list[WorkoutSummary]:
    async with conn.cursor(row_factory=dict_row) as cur:
        # CTE pre-computes the best 1RM per movement for this user, allowing
        # the outer query to detect PRs with a single index scan instead of a
        # correlated subquery per row.
        pr_cte = """
            WITH pr_by_movement AS (
              SELECT r.movement_id, MAX(r.estimated_1rm_kg) AS best_1rm
              FROM   public.results r
              JOIN   public.workouts w2 ON r.workout_id = w2.id
              WHERE  w2.user_id = %s
                AND  r.estimated_1rm_kg IS NOT NULL
                AND  r.movement_id IS NOT NULL
              GROUP  BY r.movement_id
            )
        """

        filter_clauses: list[str] = ["w.user_id = %s"]
        params: list[object] = [user_id]

        if session_type is not None:
            filter_clauses.append("w.session_type = %s")
            params.append(session_type)
        if partner_only is True:
            filter_clauses.append("w.workout_format IN ('partner', 'team')")
        elif partner_only is False:
            filter_clauses.append("w.workout_format NOT IN ('partner', 'team')")
        if date_from is not None:
            filter_clauses.append("w.performed_at::date >= %s::date")
            params.append(date_from)
        if date_to is not None:
            filter_clauses.append("w.performed_at::date <= %s::date")
            params.append(date_to)

        base_where = " AND ".join(filter_clauses)

        has_pr_join = """
            LEFT JOIN public.results pr_r
                   ON pr_r.workout_id = w.id
                  AND pr_r.estimated_1rm_kg IS NOT NULL
                  AND pr_r.movement_id IS NOT NULL
            LEFT JOIN pr_by_movement pbm
                   ON pbm.movement_id = pr_r.movement_id
                  AND pr_r.estimated_1rm_kg = pbm.best_1rm
        """

        if before_id is None:
            await cur.execute(
                pr_cte
                + f"""
                SELECT w.*, COALESCE(COUNT(DISTINCT r.id), 0) AS result_count,
                       (MAX(pbm.best_1rm) IS NOT NULL) AS has_pr
                FROM   public.workouts w
                LEFT JOIN public.results r
                       ON r.workout_id = w.id AND r.user_id = w.user_id
                {has_pr_join}
                WHERE  {base_where}
                GROUP  BY w.id
                ORDER  BY w.performed_at DESC, w.id DESC
                LIMIT  %s
                """,
                [user_id, *params, limit],
            )
        else:
            await cur.execute(
                pr_cte
                + f"""
                SELECT w.*, COALESCE(COUNT(DISTINCT r.id), 0) AS result_count,
                       (MAX(pbm.best_1rm) IS NOT NULL) AS has_pr
                FROM   public.workouts w
                LEFT JOIN public.results r
                       ON r.workout_id = w.id AND r.user_id = w.user_id
                {has_pr_join}
                WHERE  {base_where}
                  AND  (w.performed_at, w.id) < (
                           SELECT performed_at, id
                           FROM   public.workouts
                           WHERE  id = %s AND user_id = %s
                       )
                GROUP  BY w.id
                ORDER  BY w.performed_at DESC, w.id DESC
                LIMIT  %s
                """,
                [user_id, *params, before_id, user_id, limit],
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
            SELECT r.*, m.name AS movement_name
            FROM   public.results r
            LEFT JOIN public.movements m ON m.id = r.movement_id
            WHERE  r.workout_id = %s AND r.user_id = %s
            ORDER  BY r.order_index, r.id
            LIMIT  500
            """,
            [workout_id, user_id],
        )
        result_rows = await cur.fetchall()

    return Workout(**workout_row, results=[Result(**r) for r in result_rows])


async def get_workout_by_hash(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
    short_hash: str,
) -> Workout | None:
    """Resolve a workout by its cosmetic 8-hex short_hash (01 §6 routing).

    Queries the persisted ``short_hash`` column directly — the schema has a
    ``UNIQUE (user_id, short_hash)`` index, so this is an exact, indexed lookup
    that returns at most one row and needs no LIKE.
    """
    async with conn.cursor() as cur:
        await cur.execute(
            "SELECT id FROM public.workouts WHERE user_id = %s AND short_hash = %s",
            [user_id, short_hash],
        )
        row = await cur.fetchone()
    if row is None:
        return None
    return await get_workout(conn, user_id=user_id, workout_id=row[0])


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
            SELECT r.*, m.name AS movement_name
            FROM   public.results r
            LEFT JOIN public.movements m ON m.id = r.movement_id
            WHERE  r.workout_id = %s AND r.user_id = %s
            ORDER  BY r.order_index, r.id
            LIMIT  500
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
