"""Repository layer for team sessions, participants, training partners, and notifications."""

from __future__ import annotations

import json
import uuid
from typing import Any

import psycopg
from psycopg.rows import dict_row

from app.models.team_session import (
    AddParticipantRequest,
    CreateTeamSessionRequest,
    Notification,
    PatchParticipantRequest,
    PatchTeamSessionRequest,
    TeamSession,
    TeamSessionParticipant,
    TeamSessionSummary,
    TrainingPartner,
)


def _normalise_guest_name(name: str | None) -> str | None:
    return name.lower().strip() if name else None


def _row_to_participant(p: dict[str, Any]) -> TeamSessionParticipant:
    return TeamSessionParticipant(
        id=p["id"],
        team_session_id=p["team_session_id"],
        user_id=p.get("user_id"),
        workout_id=p.get("workout_id"),
        guest_name=p.get("guest_name"),
        role=p.get("role"),
        joined_at=p["joined_at"],
    )


async def _fetch_team_session(
    conn: psycopg.AsyncConnection[Any],
    *,
    team_session_id: uuid.UUID,
    user_id: uuid.UUID | None = None,
) -> TeamSession | None:
    """Load a team session with its participants via json_agg (single query).

    If user_id is provided the query also enforces visibility: caller must be
    creator or a participant (mirrors the ts_select RLS policy at app layer).
    """
    async with conn.cursor(row_factory=dict_row) as cur:
        if user_id is not None:
            await cur.execute(
                """
                SELECT ts.*,
                       json_agg(
                           json_build_object(
                               'id', tsp.id,
                               'team_session_id', tsp.team_session_id,
                               'user_id', tsp.user_id,
                               'workout_id', tsp.workout_id,
                               'guest_name', tsp.guest_name,
                               'role', tsp.role,
                               'joined_at', tsp.joined_at
                           ) ORDER BY tsp.joined_at
                       ) FILTER (WHERE tsp.id IS NOT NULL) AS participants_json
                FROM   public.team_sessions ts
                LEFT JOIN public.team_session_participants tsp ON tsp.team_session_id = ts.id
                WHERE  ts.id = %s
                  AND (
                      ts.created_by = %s
                      OR ts.id IN (
                          SELECT team_session_id FROM public.team_session_participants
                          WHERE user_id = %s
                      )
                  )
                GROUP  BY ts.id
                """,
                [str(team_session_id), str(user_id), str(user_id)],
            )
        else:
            await cur.execute(
                """
                SELECT ts.*,
                       json_agg(
                           json_build_object(
                               'id', tsp.id,
                               'team_session_id', tsp.team_session_id,
                               'user_id', tsp.user_id,
                               'workout_id', tsp.workout_id,
                               'guest_name', tsp.guest_name,
                               'role', tsp.role,
                               'joined_at', tsp.joined_at
                           ) ORDER BY tsp.joined_at
                       ) FILTER (WHERE tsp.id IS NOT NULL) AS participants_json
                FROM   public.team_sessions ts
                LEFT JOIN public.team_session_participants tsp ON tsp.team_session_id = ts.id
                WHERE  ts.id = %s
                GROUP  BY ts.id
                """,
                [str(team_session_id)],
            )
        row = await cur.fetchone()
        if row is None:
            return None
        return _row_to_team_session(row)


def _row_to_team_session(row: dict[str, Any]) -> TeamSession:
    raw = row.pop("participants_json", None) or []
    if isinstance(raw, str):
        raw = json.loads(raw)
    participants = [_row_to_participant(p) for p in raw]
    return TeamSession(**row, participants=participants)


async def _create_notification(
    cur: psycopg.AsyncCursor[dict[str, Any]],
    *,
    user_id: uuid.UUID,
    notif_type: str,
    payload: dict[str, object],
) -> None:
    await cur.execute(
        "INSERT INTO public.notifications (user_id, type, payload) VALUES (%s, %s, %s)",
        [str(user_id), notif_type, json.dumps(payload)],
    )


async def create_team_session(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
    req: CreateTeamSessionRequest,
) -> TeamSession:
    async with conn.cursor(row_factory=dict_row) as cur, conn.transaction():
        await cur.execute(
            """
                INSERT INTO public.team_sessions
                    (created_by, name, team_size, scoring_type,
                     team_score, team_score_s, team_score_reps, performed_at, notes)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
            [
                str(user_id),
                req.name,
                req.team_size,
                req.scoring_type,
                req.team_score,
                req.team_score_s,
                req.team_score_reps,
                req.performed_at,
                req.notes,
            ],
        )
        row = await cur.fetchone()
        assert row is not None
        session_id: uuid.UUID = row["id"]

        # Creator is always participant 0
        await cur.execute(
            "INSERT INTO public.team_session_participants "
            "(team_session_id, user_id) VALUES (%s, %s)",
            [str(session_id), str(user_id)],
        )
        for p in req.participants:
            # Skip if the request explicitly lists the creator themselves
            if p.user_id and p.user_id == user_id:
                continue
            await cur.execute(
                """
                    INSERT INTO public.team_session_participants
                        (team_session_id, user_id, workout_id, guest_name, role)
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                [
                    str(session_id),
                    str(p.user_id) if p.user_id else None,
                    str(p.workout_id) if p.workout_id else None,
                    _normalise_guest_name(p.guest_name),
                    p.role,
                ],
            )
            if p.user_id:
                notif_type = "team_session_linked" if p.workout_id else "workout_link_pending"
                await _create_notification(
                    cur,
                    user_id=p.user_id,
                    notif_type=notif_type,
                    payload={
                        "team_session_id": str(session_id),
                        "session_name": req.name,
                        "actor_user_id": str(user_id),
                    },
                )

    result = await _fetch_team_session(conn, team_session_id=session_id)
    assert result is not None
    return result


async def get_team_session(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
    team_session_id: uuid.UUID,
) -> TeamSession | None:
    return await _fetch_team_session(conn, team_session_id=team_session_id, user_id=user_id)


async def list_team_sessions(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
    before_id: uuid.UUID | None = None,
    limit: int = 20,
) -> list[TeamSessionSummary]:
    async with conn.cursor(row_factory=dict_row) as cur:
        if before_id is not None:
            await cur.execute(
                """
                SELECT ts.id, ts.created_by, ts.name, ts.team_size, ts.scoring_type,
                       ts.team_score, ts.team_score_s, ts.team_score_reps,
                       ts.status, ts.performed_at,
                       COUNT(tsp.id) AS participant_count
                FROM   public.team_sessions ts
                LEFT JOIN public.team_session_participants tsp ON tsp.team_session_id = ts.id
                WHERE  (ts.created_by = %s OR ts.id IN (
                           SELECT team_session_id FROM public.team_session_participants
                           WHERE user_id = %s
                        ))
                  AND  (ts.performed_at, ts.id) < (
                           SELECT (performed_at, id) FROM public.team_sessions WHERE id = %s
                       )
                GROUP  BY ts.id
                ORDER  BY ts.performed_at DESC, ts.id DESC
                LIMIT  %s
                """,
                [str(user_id), str(user_id), str(before_id), limit],
            )
        else:
            await cur.execute(
                """
                SELECT ts.id, ts.created_by, ts.name, ts.team_size, ts.scoring_type,
                       ts.team_score, ts.team_score_s, ts.team_score_reps,
                       ts.status, ts.performed_at,
                       COUNT(tsp.id) AS participant_count
                FROM   public.team_sessions ts
                LEFT JOIN public.team_session_participants tsp ON tsp.team_session_id = ts.id
                WHERE  (ts.created_by = %s OR ts.id IN (
                           SELECT team_session_id FROM public.team_session_participants
                           WHERE user_id = %s
                        ))
                GROUP  BY ts.id
                ORDER  BY ts.performed_at DESC, ts.id DESC
                LIMIT  %s
                """,
                [str(user_id), str(user_id), limit],
            )
        rows = await cur.fetchall()
        return [TeamSessionSummary(**r) for r in rows]


async def patch_team_session(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
    team_session_id: uuid.UUID,
    req: PatchTeamSessionRequest,
) -> TeamSession | None:
    fields = req.model_dump(exclude_none=True)
    if not fields:
        return await get_team_session(conn, user_id=user_id, team_session_id=team_session_id)

    set_clause = ", ".join(f"{k} = %s" for k in fields)
    values = list(fields.values()) + [str(team_session_id), str(user_id)]
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            f"UPDATE public.team_sessions SET {set_clause} "
            "WHERE id = %s AND created_by = %s RETURNING id",
            values,
        )
        row = await cur.fetchone()
    if row is None:
        return None
    return await _fetch_team_session(conn, team_session_id=team_session_id)


async def delete_team_session(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
    team_session_id: uuid.UUID,
) -> bool:
    async with conn.cursor() as cur:
        await cur.execute(
            "DELETE FROM public.team_sessions WHERE id = %s AND created_by = %s",
            [str(team_session_id), str(user_id)],
        )
        return cur.rowcount > 0


async def add_participant(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
    team_session_id: uuid.UUID,
    req: AddParticipantRequest,
) -> TeamSession | None:
    # Verify caller is the creator (RLS would also catch this, but be explicit)
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            "SELECT id FROM public.team_sessions WHERE id = %s AND created_by = %s",
            [str(team_session_id), str(user_id)],
        )
        if await cur.fetchone() is None:
            return None

        # psycopg.errors.UniqueViolation propagates to the caller (caught by router)
        await cur.execute(
            """
            INSERT INTO public.team_session_participants
                (team_session_id, user_id, workout_id, guest_name, role)
            VALUES (%s, %s, %s, %s, %s)
            """,
            [
                str(team_session_id),
                str(req.user_id) if req.user_id else None,
                str(req.workout_id) if req.workout_id else None,
                _normalise_guest_name(req.guest_name),
                req.role,
            ],
        )
        if req.user_id:
            notif_type = "team_session_linked" if req.workout_id else "workout_link_pending"
            await _create_notification(
                cur,
                user_id=req.user_id,
                notif_type=notif_type,
                payload={
                    "team_session_id": str(team_session_id),
                    "actor_user_id": str(user_id),
                },
            )

    return await _fetch_team_session(conn, team_session_id=team_session_id)


async def patch_participant(
    conn: psycopg.AsyncConnection[Any],
    *,
    team_session_id: uuid.UUID,
    target_user_id: uuid.UUID,
    req: PatchParticipantRequest,
) -> TeamSession | None:
    fields: dict[str, object] = {}
    if req.workout_id is not None:
        fields["workout_id"] = str(req.workout_id)
    if req.role is not None:
        fields["role"] = req.role

    if fields:
        set_clause = ", ".join(f"{k} = %s" for k in fields)
        values = list(fields.values()) + [str(team_session_id), str(target_user_id)]
        async with conn.cursor() as cur:
            await cur.execute(
                f"UPDATE public.team_session_participants SET {set_clause} "
                "WHERE team_session_id = %s AND user_id = %s",
                values,
            )

    return await _fetch_team_session(conn, team_session_id=team_session_id)


async def remove_participant(
    conn: psycopg.AsyncConnection[Any],
    *,
    team_session_id: uuid.UUID,
    target_user_id: uuid.UUID,
) -> bool:
    async with conn.cursor() as cur:
        await cur.execute(
            "DELETE FROM public.team_session_participants "
            "WHERE team_session_id = %s AND user_id = %s",
            [str(team_session_id), str(target_user_id)],
        )
        return cur.rowcount > 0


async def get_workout_team_session(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
    workout_id: uuid.UUID,
) -> TeamSession | None:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            "SELECT team_session_id FROM public.workouts WHERE id = %s AND user_id = %s",
            [str(workout_id), str(user_id)],
        )
        row = await cur.fetchone()
    if row is None or row["team_session_id"] is None:
        return None
    return await _fetch_team_session(conn, team_session_id=row["team_session_id"], user_id=user_id)


async def list_training_partners(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
) -> list[TrainingPartner]:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            SELECT
                tsp.user_id,
                tsp.guest_name,
                COALESCE(p.display_name, tsp.guest_name) AS display_name,
                COUNT(DISTINCT ts.id) AS session_count,
                NULL::text AS most_common_format
            FROM public.team_sessions ts
            JOIN public.team_session_participants my_part
                ON my_part.team_session_id = ts.id AND my_part.user_id = %s
            JOIN public.team_session_participants tsp
                ON tsp.team_session_id = ts.id
               AND (tsp.user_id != %s OR tsp.user_id IS NULL)
               AND NOT (tsp.user_id IS NULL AND tsp.guest_name IS NULL)
            LEFT JOIN public.profiles p ON p.id = tsp.user_id
            GROUP BY tsp.user_id, tsp.guest_name, p.display_name
            ORDER BY session_count DESC, display_name
            """,
            [str(user_id), str(user_id)],
        )
        rows = await cur.fetchall()
        return [TrainingPartner(**r) for r in rows]


async def get_role_suggestions(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
) -> list[str]:
    """Return the user's most-used roles (up to 10), most common first."""
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT role, COUNT(*) AS cnt
            FROM public.team_session_participants tsp
            JOIN public.team_sessions ts ON ts.id = tsp.team_session_id
            WHERE ts.created_by = %s AND tsp.role IS NOT NULL
            GROUP BY role
            ORDER BY cnt DESC
            LIMIT 10
            """,
            [str(user_id)],
        )
        rows = await cur.fetchall()
        return [r[0] for r in rows]


async def list_notifications(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
    include_read: bool = False,
) -> list[Notification]:
    async with conn.cursor(row_factory=dict_row) as cur:
        if include_read:
            await cur.execute(
                "SELECT * FROM public.notifications WHERE user_id = %s "
                "ORDER BY created_at DESC LIMIT 50",
                [str(user_id)],
            )
        else:
            await cur.execute(
                "SELECT * FROM public.notifications WHERE user_id = %s AND read_at IS NULL "
                "ORDER BY created_at DESC LIMIT 50",
                [str(user_id)],
            )
        rows = await cur.fetchall()
        return [Notification(**r) for r in rows]


async def mark_notification_read(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
    notification_id: uuid.UUID,
) -> Notification | None:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            "UPDATE public.notifications SET read_at = now() "
            "WHERE id = %s AND user_id = %s RETURNING *",
            [str(notification_id), str(user_id)],
        )
        row = await cur.fetchone()
    if row is None:
        return None
    return Notification(**row)
