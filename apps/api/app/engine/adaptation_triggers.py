"""Deterministic adaptation trigger detection — no LLM involved."""

from __future__ import annotations

import psycopg
import psycopg.rows


async def detect_triggers(
    user_id: str,
    plan_id: str,
    db: psycopg.AsyncConnection[object],
) -> list[dict[str, object]]:
    triggers: list[dict[str, object]] = []

    acwr = await _compute_acwr(user_id, db)
    if acwr is not None and acwr > 1.5:
        triggers.append({"type": "high_acwr", "data": {"acwr": round(acwr, 2)}})

    low_days = await _count_low_readiness_streak(user_id, db)
    if low_days >= 3:
        triggers.append({"type": "low_readiness", "data": {"streak_days": low_days}})

    missed = await _count_missed_sessions(user_id, plan_id, db)
    if missed >= 2:
        triggers.append({"type": "missed_session", "data": {"count": missed, "window_days": 7}})

    avg_rpe = await _compute_avg_rpe(user_id, db)
    if avg_rpe is not None and avg_rpe > 8.5:
        triggers.append({"type": "rpe_creep", "data": {"avg_rpe": round(avg_rpe, 2)}})

    return triggers


async def _compute_acwr(
    user_id: str,
    db: psycopg.AsyncConnection[object],
) -> float | None:
    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            """
            WITH loads AS (
                SELECT performed_at::date AS d, perceived_load_au
                FROM workouts
                WHERE user_id = %s
                  AND performed_at >= current_date - 28
                  AND perceived_load_au IS NOT NULL
            )
            SELECT
                AVG(perceived_load_au) FILTER (WHERE d >= current_date - 7) AS acute,
                AVG(perceived_load_au) AS chronic
            FROM loads
            """,
            [user_id],
        )
        row = await cur.fetchone()

    if not row or not row["acute"] or not row["chronic"] or row["chronic"] == 0:
        return None
    return float(row["acute"]) / float(row["chronic"])


async def _count_low_readiness_streak(
    user_id: str,
    db: psycopg.AsyncConnection[object],
    threshold: float = 0.4,
    days: int = 7,
) -> int:
    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            """
            SELECT date, recovery_score
            FROM derived_metrics
            WHERE user_id = %s AND date >= current_date - %s
            ORDER BY date DESC
            """,
            [user_id, days],
        )
        rows = await cur.fetchall()

    streak = 0
    for row in rows:
        if row["recovery_score"] is not None and float(row["recovery_score"]) < threshold:
            streak += 1
        else:
            break
    return streak


async def _count_missed_sessions(
    user_id: str,
    plan_id: str,
    db: psycopg.AsyncConnection[object],
    days: int = 7,
) -> int:
    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            """
            SELECT COUNT(*) AS cnt
            FROM planned_sessions
            WHERE user_id = %s
              AND plan_id = %s::uuid
              AND scheduled_date >= current_date - %s
              AND scheduled_date < current_date
              AND session_type NOT IN ('rest', 'active_recovery')
              AND status = 'prescribed'
            """,
            [user_id, plan_id, days],
        )
        row = await cur.fetchone()

    return int(row["cnt"]) if row else 0


async def _compute_avg_rpe(
    user_id: str,
    db: psycopg.AsyncConnection[object],
    days: int = 7,
) -> float | None:
    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            """
            SELECT AVG(session_rpe) AS avg_rpe
            FROM workouts
            WHERE user_id = %s
              AND performed_at >= current_date - %s
              AND session_rpe IS NOT NULL
            """,
            [user_id, days],
        )
        row = await cur.fetchone()

    if not row or row["avg_rpe"] is None:
        return None
    return float(row["avg_rpe"])
