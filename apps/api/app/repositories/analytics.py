from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import date, timedelta
from typing import Any, Literal, cast

import psycopg
from psycopg.rows import dict_row

from app.engine.metrics import compute_strain_score
from app.engine.strength import project_e1rm
from app.models.analytics import ReadinessResponse


async def get_load_series(
    conn: psycopg.AsyncConnection[Any],
    user_id: uuid.UUID,
    days: int = 90,
) -> list[dict[str, Any]]:
    """Fetch daily aggregated perceived load and compute EWMA and ACWR metrics.

    ACWR rolling windows (7-day acute, 28-day chronic) are computed in SQL
    using window functions. EWMA (ATL/CTL/TSB) requires each day's value to
    depend on the previous day so it stays in Python.
    """
    # Use 42 extra warm-up days so the 28-day chronic window is meaningful
    # on the first day of the requested range.
    warmup = 42
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            WITH daily AS (
                SELECT
                    performed_at::date AS day,
                    SUM(perceived_load_au)::float AS load_au
                FROM public.workouts
                WHERE user_id = %s
                  AND performed_at::date >= CURRENT_DATE - (%s + %s)
                  AND perceived_load_au IS NOT NULL
                GROUP BY 1
            ),
            series AS (
                SELECT generate_series(
                    CURRENT_DATE - (%s + %s),
                    CURRENT_DATE,
                    '1 day'::interval
                )::date AS day
            ),
            filled AS (
                SELECT s.day, COALESCE(d.load_au, 0.0) AS load_au
                FROM series s
                LEFT JOIN daily d ON d.day = s.day
            ),
            windowed AS (
                SELECT
                    day,
                    load_au,
                    SUM(load_au) OVER (
                        ORDER BY day
                        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
                    ) AS acute_7,
                    SUM(load_au) OVER (
                        ORDER BY day
                        ROWS BETWEEN 27 PRECEDING AND CURRENT ROW
                    ) AS chronic_28
                FROM filled
            )
            SELECT
                day,
                load_au,
                acute_7,
                chronic_28,
                CASE
                    WHEN chronic_28 = 0 THEN NULL
                    ELSE ROUND((4.0 * acute_7::numeric / chronic_28)::numeric, 3)::float
                END AS acwr
            FROM windowed
            ORDER BY day
            """,
            (user_id, days, warmup, days, warmup),
        )
        rows = await cur.fetchall()

    # EWMA is inherently sequential (each day depends on the previous day),
    # so it stays in Python.
    atl, ctl = 0.0, 0.0
    k_atl, k_ctl = 1 / 7, 1 / 42

    result: list[dict[str, Any]] = []
    for row in rows:
        load = float(row["load_au"])
        atl = atl * (1 - k_atl) + load * k_atl
        ctl = ctl * (1 - k_ctl) + load * k_ctl
        result.append(
            {
                "day": row["day"],
                "load_au": load,
                "atl": atl,
                "ctl": ctl,
                "tsb": ctl - atl,
                "acwr": row["acwr"],
            }
        )

    cutoff = date.today() - timedelta(days=days)
    return [r for r in result if r["day"] >= cutoff]


async def _fetch_best_e1rms(
    conn: psycopg.AsyncConnection[Any],
    user_id: uuid.UUID,
) -> list[dict[str, Any]]:
    """Return all-time best e1RM row per movement with delta vs previous best."""
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            WITH ranked AS (
                SELECT
                    r.movement_id,
                    m.name                    AS movement_name,
                    r.estimated_1rm_kg::float AS estimated_1rm_kg,
                    w.performed_at::date      AS achieved_at,
                    w.id                      AS workout_id,
                    r.load_kg::float          AS load_kg,
                    r.reps,
                    r.time_s,
                    LAG(r.estimated_1rm_kg::float) OVER (
                        PARTITION BY r.movement_id
                        ORDER BY r.estimated_1rm_kg ASC
                    ) AS prev_best_1rm_kg
                FROM results r
                JOIN workouts  w ON r.workout_id  = w.id
                JOIN movements m ON r.movement_id = m.id
                WHERE w.user_id = %s
                  AND r.estimated_1rm_kg IS NOT NULL
            )
            SELECT DISTINCT ON (movement_id)
                movement_id::text, movement_name,
                estimated_1rm_kg AS best_1rm_kg,
                achieved_at, workout_id::text,
                load_kg, reps, time_s, prev_best_1rm_kg
            FROM ranked
            ORDER BY movement_id, estimated_1rm_kg DESC
            LIMIT 500
            """,
            (user_id,),
        )
        rows = await cur.fetchall()
    for row in rows:
        prev = row.get("prev_best_1rm_kg")
        row["delta_kg"] = (row["best_1rm_kg"] - prev) if prev is not None else None
    return rows


async def _enrich_with_projections(
    conn: psycopg.AsyncConnection[Any],
    user_id: uuid.UUID,
    rows: list[dict[str, Any]],
) -> None:
    """Add OLS-projected strength fields to each row in place."""
    movement_ids = [uuid.UUID(r["movement_id"]) for r in rows]
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            SELECT movement_id::text, day, estimated_1rm_kg
            FROM (
                SELECT r.movement_id,
                       w.performed_at::date      AS day,
                       r.estimated_1rm_kg::float AS estimated_1rm_kg,
                       ROW_NUMBER() OVER (
                           PARTITION BY r.movement_id ORDER BY w.performed_at ASC
                       ) AS rn
                FROM results r
                JOIN workouts w ON r.workout_id = w.id
                WHERE w.user_id = %s
                  AND r.movement_id = ANY(%s)
                  AND r.estimated_1rm_kg IS NOT NULL
                  AND w.performed_at >= NOW() - INTERVAL '5 years'
            ) sub
            WHERE rn <= 100
            ORDER BY movement_id, day ASC
            LIMIT 2000
            """,
            (user_id, movement_ids),
        )
        trend_rows = await cur.fetchall()
    trends: dict[str, list[tuple[date, float]]] = defaultdict(list)
    for tr in trend_rows:
        trends[tr["movement_id"]].append((tr["day"], tr["estimated_1rm_kg"]))
    today = date.today()
    for row in rows:
        proj = project_e1rm(trends.get(row["movement_id"], []), today)
        row["current_e1rm_kg"] = proj.current_e1rm_kg
        row["next_pr_kg"] = proj.next_pr_kg
        row["next_pr_weeks"] = proj.next_pr_weeks
        row["is_stale"] = proj.is_stale


async def get_personal_records(
    conn: psycopg.AsyncConnection[Any],
    user_id: uuid.UUID,
) -> list[dict[str, Any]]:
    """Fetch all-time best e1RM per movement plus OLS-projected strength fields."""
    rows = await _fetch_best_e1rms(conn, user_id)
    if not rows:
        return []
    await _enrich_with_projections(conn, user_id, rows)
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
              AND r.user_id            = %s
              AND r.movement_id        = %s
              AND r.estimated_1rm_kg IS NOT NULL
            ORDER BY w.performed_at ASC
            LIMIT 200
            """,
            (user_id, user_id, movement_id),
        )
        return await cur.fetchall()


async def get_movement_history(
    conn: psycopg.AsyncConnection[Any],
    user_id: uuid.UUID,
    movement_id: uuid.UUID,
) -> list[dict[str, Any]]:
    """Return full logged-set history for one movement, newest first.

    Used by the movement detail page to populate the set log table. Marks
    each row as is_pr=True when its e1RM equals the user's all-time best.
    """
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            SELECT
                w.performed_at::date         AS date,
                r.load_kg::float             AS load_kg,
                r.reps,
                r.estimated_1rm_kg::float    AS estimated_1rm_kg,
                r.notes,
                w.id::text                   AS workout_id
            FROM results r
            JOIN workouts w ON r.workout_id = w.id
            WHERE w.user_id         = %s
              AND r.user_id         = %s
              AND r.movement_id     = %s
              AND r.estimated_1rm_kg IS NOT NULL
            ORDER BY w.performed_at DESC
            LIMIT 200
            """,
            (user_id, user_id, movement_id),
        )
        rows = await cur.fetchall()

    if not rows:
        return []

    best_e1rm = max(r["estimated_1rm_kg"] for r in rows)
    for row in rows:
        row["is_pr"] = abs(row["estimated_1rm_kg"] - best_e1rm) < 0.01

    return rows


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
              AND performed_at::date >= CURRENT_DATE - (%s * 7)
            GROUP BY week_start, session_type
            ORDER BY week_start, session_type
            """,
            (user_id, weeks),
        )
        return await cur.fetchall()


async def _fetch_sleep_avg(
    conn: psycopg.AsyncConnection[Any],
    user_id: uuid.UUID,
) -> float | None:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            SELECT AVG(sleep_quality) AS sleep_avg
            FROM public.daily_checkins
            WHERE user_id = %s
              AND date >= CURRENT_DATE - INTERVAL '3 days'
            """,
            (user_id,),
        )
        row = await cur.fetchone()
    if row and row["sleep_avg"] is not None:
        return float(row["sleep_avg"])
    return None


def _score_readiness(
    acwr: float | None,
    tsb: float,
    sleep_avg: float | None,
    has_training_data: bool,
) -> tuple[
    float,
    Literal["optimal", "fresh", "high_load", "fatigued", "insufficient_data"],
    int,
]:
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

    tsb_score: float | None = None
    if has_training_data:
        tsb_score = min(1.0, max(0.0, (tsb + 20) / 40))

    available = [s for s in [acwr_score, tsb_score] if s is not None]
    if sleep_avg is not None:
        available.append((sleep_avg - 1.0) / 6.0)

    if not available:
        return 0.5, "insufficient_data", 0

    score = sum(available) / len(available)
    label: Literal["optimal", "fresh", "high_load", "fatigued", "insufficient_data"]
    if score >= 0.75:
        label = "optimal"
    elif score >= 0.55:
        label = "fresh" if tsb > 0 else "high_load"
    elif score >= 0.35:
        label = "fatigued"
    else:
        label = "high_load"
    return score, label, len(available)


async def _fetch_wearable_snapshot(
    conn: psycopg.AsyncConnection[Any],
    user_id: uuid.UUID,
    today: date,
) -> tuple[float | None, float | None, str | None, str | None]:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            SELECT recovery_score::float, coverage::float, confidence_tier
            FROM derived_metrics
            WHERE user_id = %s AND date = %s
            """,
            [user_id, today],
        )
        dm = await cur.fetchone()

    if not dm:
        return None, None, None, None

    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            SELECT type FROM metric_samples
            WHERE user_id = %s AND type IN ('hrv_sdnn', 'hrv_rmssd')
              AND started_at::date = %s
            ORDER BY source_priority ASC LIMIT 1
            """,
            [user_id, today],
        )
        hrv_row = await cur.fetchone()

    return (
        dm["recovery_score"],
        dm["coverage"],
        dm["confidence_tier"],
        hrv_row["type"] if hrv_row else None,
    )


async def _fetch_strain_inputs(
    conn: psycopg.AsyncConnection[Any],
    user_id: uuid.UUID,
    today: date,
) -> tuple[float | None, float | None, int]:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            SELECT value::float AS today_kcal
            FROM metric_samples
            WHERE user_id = %s AND type = 'active_energy_kcal'
              AND started_at::date = %s
            ORDER BY source_priority ASC, started_at DESC LIMIT 1
            """,
            [user_id, today],
        )
        energy_row = await cur.fetchone()

    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            SELECT
                AVG(value)::float                     AS avg_kcal,
                COUNT(DISTINCT started_at::date)::int AS n_days
            FROM metric_samples
            WHERE user_id = %s
              AND type = 'active_energy_kcal'
              AND started_at::date >= (CURRENT_DATE - INTERVAL '28 days')
              AND started_at::date < CURRENT_DATE
            """,
            [user_id],
        )
        baseline_row = await cur.fetchone()

    active_today = energy_row["today_kcal"] if energy_row else None
    avg_kcal = baseline_row["avg_kcal"] if baseline_row else None
    n_days = int(baseline_row["n_days"]) if baseline_row and baseline_row["n_days"] else 0
    return active_today, avg_kcal, n_days


async def get_readiness(
    conn: psycopg.AsyncConnection[Any],
    user_id: uuid.UUID,
) -> ReadinessResponse:
    """Orchestrate readiness: load series, sleep, wearables, strain."""
    series = await get_load_series(conn, user_id, days=14)
    last: dict[str, Any] = (
        series[-1] if series else {"atl": 0.0, "ctl": 0.0, "tsb": 0.0, "acwr": None}
    )
    acwr: float | None = last["acwr"]
    tsb: float = last["tsb"]
    has_training_data = any(r["load_au"] > 0 for r in series)

    today = date.today()
    sleep_avg = await _fetch_sleep_avg(conn, user_id)
    score, label, factors_available = _score_readiness(acwr, tsb, sleep_avg, has_training_data)
    recovery_score, coverage, confidence_tier, hrv_type = await _fetch_wearable_snapshot(
        conn, user_id, today
    )
    active_today, avg_kcal, n_days = await _fetch_strain_inputs(conn, user_id, today)

    return ReadinessResponse(
        score=score,
        label=label,
        acwr=acwr,
        tsb=tsb,
        sleep_avg=sleep_avg,
        factors_available=factors_available,
        recovery_score=recovery_score,
        coverage=coverage,
        confidence_tier=cast(
            Literal["calibrating_14d", "low_14_28", "standard"] | None, confidence_tier
        ),
        hrv_type=cast(Literal["hrv_sdnn", "hrv_rmssd"] | None, hrv_type),
        strain_score=compute_strain_score(active_today, avg_kcal, n_days),
    )


async def get_training_balance(
    conn: psycopg.AsyncConnection[Any],
    user_id: uuid.UUID,
    days: int = 28,
) -> list[dict[str, Any]]:
    """Return volume share per primary_muscle_group over the last N days.

    Only movements with a tagged primary_muscle_group are included.
    Returns rows sorted by load_au descending.
    """
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            WITH tagged AS (
                SELECT
                    m.primary_muscle_group            AS category,
                    SUM(COALESCE(r.load_kg * r.reps, 0))::float AS load_au
                FROM results r
                JOIN workouts  w ON r.workout_id  = w.id
                JOIN movements m ON r.movement_id = m.id
                WHERE w.user_id              = %s
                  AND w.performed_at::date    >= CURRENT_DATE - %s
                  AND m.primary_muscle_group IS NOT NULL
                GROUP BY m.primary_muscle_group
            ),
            total AS (
                SELECT SUM(load_au) AS grand_total FROM tagged
            )
            SELECT
                t.category,
                t.load_au,
                CASE WHEN tt.grand_total > 0
                     THEN ROUND((t.load_au / tt.grand_total)::numeric, 4)::float
                     ELSE 0
                END AS volume_pct
            FROM tagged t
            CROSS JOIN total tt
            ORDER BY t.load_au DESC
            """,
            (user_id, days),
        )
        return await cur.fetchall()


async def get_contributions(
    conn: psycopg.AsyncConnection[Any],
    user_id: uuid.UUID,
    days: int = 365,
) -> list[dict[str, Any]]:
    """Return per-day workout count and total load for the contribution graph."""
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            SELECT
                performed_at::date            AS day,
                COUNT(*)::int                 AS count,
                COALESCE(SUM(perceived_load_au), 0)::float AS load_au
            FROM workouts
            WHERE user_id = %s
              AND performed_at::date >= CURRENT_DATE - %s
            GROUP BY 1
            ORDER BY 1
            """,
            (user_id, days),
        )
        return await cur.fetchall()


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
            LIMIT 500
            """,
            (user_id,),
        )
        return await cur.fetchall()
