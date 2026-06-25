from __future__ import annotations

import uuid
from typing import Any

import psycopg
from psycopg.rows import dict_row

from app.models.profile import PatchProfileRequest, ProfileStats, UserProfile


async def get_profile(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
    email: str,
    avatar_url: str | None,
) -> UserProfile | None:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            SELECT
                p.display_name,
                p.timezone,
                p.unit_preference        AS weight_unit,
                p.frequency_target_days,
                p.graph_colour_mode,
                p.checkin_enabled,
                p.onboarding_completed,
                (
                    SELECT performed_at::date::text
                    FROM   public.workouts
                    WHERE  user_id = %s
                    ORDER  BY performed_at ASC
                    LIMIT  1
                ) AS first_workout_date
            FROM public.profiles p
            WHERE p.id = %s
            """,
            (user_id, user_id),
        )
        row = await cur.fetchone()
    if row is None:
        return None
    return UserProfile(
        display_name=row["display_name"],
        email=email,
        avatar_url=avatar_url,
        timezone=row["timezone"],
        first_workout_date=row["first_workout_date"],
        frequency_target_days=row["frequency_target_days"],
        graph_colour_mode=row["graph_colour_mode"],
        weight_unit=row["weight_unit"],
        checkin_enabled=row["checkin_enabled"],
        onboarding_completed=row["onboarding_completed"],
    )


async def get_profile_stats(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
) -> ProfileStats:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            SELECT
                (SELECT COUNT(*) FROM public.workouts WHERE user_id = %s)::int
                    AS total_workouts,
                (SELECT COUNT(DISTINCT r.movement_id)
                 FROM   public.results r
                 JOIN   public.workouts w ON r.workout_id = w.id
                 WHERE  w.user_id = %s AND r.is_pr = TRUE)::int
                    AS total_prs,
                (SELECT COUNT(DISTINCT r.movement_id)
                 FROM   public.results r
                 JOIN   public.workouts w ON r.workout_id = w.id
                 WHERE  w.user_id = %s)::int
                    AS movements_tracked
            """,
            (user_id, user_id, user_id),
        )
        row = await cur.fetchone()

    best_streak = await _compute_best_streak(conn, user_id=user_id)

    return ProfileStats(
        total_workouts=row["total_workouts"] if row else 0,
        total_prs=row["total_prs"] if row else 0,
        best_streak_weeks=best_streak,
        movements_tracked=row["movements_tracked"] if row else 0,
    )


async def _compute_best_streak(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
) -> int:
    """Return best consecutive-week streak where workouts >= frequency_target_days."""
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            WITH target AS (
                SELECT COALESCE(frequency_target_days, 3) AS target
                FROM   public.profiles
                WHERE  id = %s
            ),
            weekly AS (
                SELECT
                    DATE_TRUNC('week', performed_at) AS week_start,
                    COUNT(*)::int                    AS sessions
                FROM public.workouts
                WHERE user_id = %s
                GROUP BY 1
            ),
            qualifying AS (
                SELECT week_start
                FROM   weekly, target
                WHERE  sessions >= target
                ORDER  BY week_start
            ),
            numbered AS (
                SELECT
                    week_start,
                    ROW_NUMBER() OVER (ORDER BY week_start)::int AS rn
                FROM qualifying
            ),
            grouped AS (
                SELECT
                    (week_start - (rn * INTERVAL '7 days')) AS grp,
                    COUNT(*) AS streak_len
                FROM numbered
                GROUP BY 1
            )
            SELECT COALESCE(MAX(streak_len), 0)::int AS best
            FROM grouped
            """,
            (user_id, user_id),
        )
        row = await cur.fetchone()
    return int(row["best"]) if row else 0


async def patch_profile(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
    email: str,
    avatar_url: str | None,
    patch: PatchProfileRequest,
) -> UserProfile | None:
    updates: dict[str, Any] = {}
    if patch.frequency_target_days is not None:
        updates["frequency_target_days"] = patch.frequency_target_days
    if patch.graph_colour_mode is not None:
        updates["graph_colour_mode"] = patch.graph_colour_mode
    if patch.weight_unit is not None:
        updates["unit_preference"] = patch.weight_unit  # DB column name
    if patch.checkin_enabled is not None:
        updates["checkin_enabled"] = patch.checkin_enabled
    if patch.onboarding_completed is not None:
        updates["onboarding_completed"] = patch.onboarding_completed

    if updates:
        set_clause = ", ".join(f"{col} = %s" for col in updates)
        values = list(updates.values()) + [user_id]
        async with conn.cursor() as cur:
            await cur.execute(
                f"UPDATE public.profiles SET {set_clause} WHERE id = %s",  # noqa: S608
                values,
            )

    return await get_profile(conn, user_id=user_id, email=email, avatar_url=avatar_url)


async def find_user_by_email(
    conn: psycopg.AsyncConnection[Any],
    *,
    email: str,
    exclude_user_id: uuid.UUID,
) -> dict[str, Any] | None:
    """Look up a registered user by email (excluding the caller)."""
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            SELECT
                p.id           AS user_id,
                p.display_name,
                u.email
            FROM   auth.users u
            JOIN   public.profiles p ON p.id = u.id
            WHERE  u.email = %s
              AND  u.id    != %s
            """,
            (email, exclude_user_id),
        )
        row = await cur.fetchone()
    return dict(row) if row else None
