from __future__ import annotations

import uuid
from datetime import date, timedelta
from typing import Any

import psycopg
from psycopg.rows import dict_row


async def get_load_series(
    conn: psycopg.AsyncConnection[Any],
    user_id: uuid.UUID,
    days: int = 90,
) -> list[dict[str, Any]]:
    """Fetch daily aggregated perceived load and compute EWMA metrics."""
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            SELECT
                performed_at::date AS day,
                SUM(perceived_load_au)::float AS load_au
            FROM workouts
            WHERE user_id = %s
              AND performed_at >= NOW() - (%s + 42) * INTERVAL '1 day'
              AND perceived_load_au IS NOT NULL
            GROUP BY 1
            ORDER BY 1
            """,
            (user_id, days),
        )
        rows = await cur.fetchall()

    load_map: dict[date, float] = {r["day"]: float(r["load_au"]) for r in rows}
    start = date.today() - timedelta(days=days + 42)
    end = date.today()

    atl, ctl = 0.0, 0.0
    k_atl, k_ctl = 1 / 7, 1 / 42

    result: list[dict[str, Any]] = []
    current = start
    while current <= end:
        load = load_map.get(current, 0.0)
        atl = atl * (1 - k_atl) + load * k_atl
        ctl = ctl * (1 - k_ctl) + load * k_ctl
        tsb = ctl - atl
        result.append({"day": current, "load_au": load, "atl": atl, "ctl": ctl, "tsb": tsb})
        current += timedelta(days=1)

    for i, pt in enumerate(result):
        window7 = sum(r["load_au"] for r in result[max(0, i - 6) : i + 1])
        window28 = sum(r["load_au"] for r in result[max(0, i - 27) : i + 1])
        chronic = window28 / 4
        pt["acwr"] = (window7 / chronic) if chronic > 0 else None

    cutoff = date.today() - timedelta(days=days)
    return [r for r in result if r["day"] >= cutoff]


async def get_personal_records(
    conn: psycopg.AsyncConnection[Any],
    user_id: uuid.UUID,
) -> list[dict[str, Any]]:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            SELECT DISTINCT ON (r.movement_id)
                r.movement_id::text,
                m.name                    AS movement_name,
                r.estimated_1rm_kg::float AS best_1rm_kg,
                w.performed_at::date      AS achieved_at,
                w.id::text                AS workout_id,
                r.load_kg::float          AS load_kg,
                r.reps,
                r.time_s,
                (
                    SELECT r2.estimated_1rm_kg::float
                    FROM   public.results r2
                    JOIN   public.workouts w2 ON r2.workout_id = w2.id
                    WHERE  w2.user_id           = %s
                      AND  r2.movement_id       = r.movement_id
                      AND  r2.estimated_1rm_kg IS NOT NULL
                      AND  r2.id              != r.id
                    ORDER  BY r2.estimated_1rm_kg DESC
                    LIMIT  1
                )                         AS prev_best_1rm_kg
            FROM results r
            JOIN workouts  w ON r.workout_id  = w.id
            JOIN movements m ON r.movement_id = m.id
            WHERE w.user_id            = %s
              AND r.estimated_1rm_kg IS NOT NULL
            ORDER BY r.movement_id, r.estimated_1rm_kg DESC
            """,
            (user_id, user_id),
        )
        rows = await cur.fetchall()

    for row in rows:
        prev = row.get("prev_best_1rm_kg")
        row["delta_kg"] = (row["best_1rm_kg"] - prev) if prev is not None else None

    return rows


async def get_movement_trend(
    conn: psycopg.AsyncConnection[Any],
    user_id: uuid.UUID,
    movement_id: uuid.UUID,
) -> list[dict[str, Any]]:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            SELECT
                w.performed_at::date         AS day,
                r.estimated_1rm_kg::float    AS estimated_1rm_kg,
                w.id::text                   AS workout_id
            FROM results r
            JOIN workouts w ON r.workout_id = w.id
            WHERE w.user_id            = %s
              AND r.movement_id        = %s
              AND r.estimated_1rm_kg IS NOT NULL
            ORDER BY w.performed_at ASC
            """,
            (user_id, movement_id),
        )
        return await cur.fetchall()


async def get_volume_trend(
    conn: psycopg.AsyncConnection[Any],
    user_id: uuid.UUID,
    weeks: int = 12,
) -> list[dict[str, Any]]:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            SELECT
                DATE_TRUNC('week', performed_at)::date AS week_start,
                session_type,
                SUM(COALESCE(perceived_load_au, 0))::float AS total_load,
                COUNT(*)::int AS workout_count
            FROM workouts
            WHERE user_id = %s
              AND performed_at >= NOW() - %s * INTERVAL '1 week'
            GROUP BY week_start, session_type
            ORDER BY week_start, session_type
            """,
            (user_id, weeks),
        )
        return await cur.fetchall()


async def get_readiness(
    conn: psycopg.AsyncConnection[Any],
    user_id: uuid.UUID,
) -> dict[str, Any]:
    """Compute readiness: derive ATL/CTL/ACWR from workouts, fetch checkins."""
    series = await get_load_series(conn, user_id, days=14)
    last: dict[str, Any] = (
        series[-1] if series else {"atl": 0.0, "ctl": 0.0, "tsb": 0.0, "acwr": None}
    )

    acwr: float | None = last["acwr"]
    tsb: float = last["tsb"]

    # Fetch last 3 days of daily_checkins
    # Columns: motivation (1=low, 7=high — good), sleep_quality (1=very bad, 7=very good)
    mood_avg: float | None = None
    energy_avg: float | None = None
    sleep_avg: float | None = None

    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            SELECT
                AVG(motivation)    AS mood_avg,
                AVG(motivation)    AS energy_avg,
                AVG(sleep_quality) AS sleep_avg
            FROM public.daily_checkins
            WHERE user_id = %s
              AND date >= CURRENT_DATE - INTERVAL '3 days'
            """,
            (user_id,),
        )
        row = await cur.fetchone()
        if row:
            mood_avg = float(row["mood_avg"]) if row["mood_avg"] is not None else None
            energy_avg = float(row["energy_avg"]) if row["energy_avg"] is not None else None
            sleep_avg = float(row["sleep_avg"]) if row["sleep_avg"] is not None else None

    factors_available = sum(1 for v in (mood_avg, energy_avg, sleep_avg) if v is not None)

    has_training_data = any(r["load_au"] > 0 for r in series)

    # Compute composite score: average available normalized factors
    # ACWR sweet spot (0.8–1.3) maps to good score
    acwr_score: float | None = None
    if acwr is not None and has_training_data:
        if 0.8 <= acwr <= 1.3:
            acwr_score = 0.8
        elif acwr < 0.8:
            acwr_score = 0.5
        elif acwr <= 1.5:
            acwr_score = 0.4
        else:
            acwr_score = 0.2

    # TSB score: only meaningful when training data exists
    tsb_score: float | None = None
    if has_training_data:
        tsb_score = min(1.0, max(0.0, (tsb + 20) / 40))

    available_scores = [s for s in [acwr_score, tsb_score] if s is not None]
    if factors_available + len(available_scores) < 1:
        score = 0.5
        label = "insufficient_data"
    else:
        score = sum(available_scores) / len(available_scores) if available_scores else 0.5
        if score >= 0.75:
            label = "optimal"
        elif score >= 0.55:
            label = "fresh" if tsb > 0 else "high_load"
        elif score >= 0.35:
            label = "fatigued"
        else:
            label = "high_load"

    return {
        "score": score,
        "label": label,
        "acwr": acwr,
        "tsb": tsb,
        "mood_avg": mood_avg,
        "energy_avg": energy_avg,
        "sleep_avg": sleep_avg,
        "factors_available": factors_available,
    }


async def get_benchmark_attempts(
    conn: psycopg.AsyncConnection[Any],
    user_id: uuid.UUID,
) -> list[dict[str, Any]]:
    """Return all timed benchmark WOD attempts for a user, oldest first."""
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            SELECT
                b.name,
                w.performed_at::date AS day,
                r.time_s,
                w.id AS workout_id
            FROM workouts w
            JOIN benchmarks b ON b.id = w.benchmark_id
            LEFT JOIN results r ON r.workout_id = w.id AND r.result_type = 'time'
            WHERE w.user_id = %s
              AND w.benchmark_id IS NOT NULL
            ORDER BY b.name, w.performed_at ASC
            """,
            (user_id,),
        )
        return await cur.fetchall()
