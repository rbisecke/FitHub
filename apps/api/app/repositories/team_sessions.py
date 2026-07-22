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
        display_name=p.get("display_name"),
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
        _participant_obj = """
            json_build_object(
                'id', tsp.id,
                'team_session_id', tsp.team_session_id,
                'user_id', tsp.user_id,
                'workout_id', tsp.workout_id,
                'guest_name', tsp.guest_name,
                'role', tsp.role,
                'joined_at', tsp.joined_at,
                'display_name', COALESCE(p.display_name, tsp.guest_name)
            )
        """
        if user_id is not None:
            await cur.execute(
                f"""
                SELECT ts.*,
                       json_agg(
                           {_participant_obj} ORDER BY tsp.joined_at
                       ) FILTER (WHERE tsp.id IS NOT NULL) AS participants_json
                FROM   public.team_sessions ts
                LEFT JOIN public.team_session_participants tsp ON tsp.team_session_id = ts.id
                LEFT JOIN public.profiles p ON p.id = tsp.user_id
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
                [str(team_session_id), user_id, user_id],
            )
        else:
            await cur.execute(
                f"""
                SELECT ts.*,
                       json_agg(
                           {_participant_obj} ORDER BY tsp.joined_at
                       ) FILTER (WHERE tsp.id IS NOT NULL) AS participants_json
                FROM   public.team_sessions ts
                LEFT JOIN public.team_session_participants tsp ON tsp.team_session_id = ts.id
                LEFT JOIN public.profiles p ON p.id = tsp.user_id
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
        [user_id, notif_type, json.dumps(payload)],
    )


async def _fetch_display_name(
    cur: psycopg.AsyncCursor[dict[str, Any]], *, user_id: uuid.UUID
) -> str | None:
    """Cheap single-column lookup — no existing lookup-by-id helper for
    display_name in app/repositories/profile.py (get_profile requires an
    email + avatar_url and does more than needed here)."""
    await cur.execute("SELECT display_name FROM public.profiles WHERE id = %s", [user_id])
    row = await cur.fetchone()
    return row["display_name"] if row else None


async def _build_notification_payload(
    cur: psycopg.AsyncCursor[dict[str, Any]],
    *,
    team_session_id: uuid.UUID,
    session_name: str | None,
    actor_user_id: uuid.UUID,
) -> dict[str, object]:
    """Build the {team_session_id, session_name, actor_user_id, actor_name}
    payload shared by every team-session notification type (BG-06/BG-14).

    Every message line the frontend renders is
    "{actor display name} {verb phrase} '{session_name}'" and must never fall
    back to "Someone" — so both session_name and actor_name are always
    populated here rather than left for the client to resolve.
    """
    actor_name = await _fetch_display_name(cur, user_id=actor_user_id)
    return {
        "team_session_id": str(team_session_id),
        "session_name": session_name,
        "actor_user_id": str(actor_user_id),
        "actor_name": actor_name,
    }


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
                     team_score, team_score_s, team_score_reps, performed_at, notes, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
            [
                user_id,
                req.name,
                req.team_size,
                req.scoring_type,
                req.team_score,
                req.team_score_s,
                req.team_score_reps,
                req.performed_at,
                req.notes,
                req.status,
            ],
        )
        row = await cur.fetchone()
        if row is None:
            raise RuntimeError("Team session INSERT returned no row")
        session_id: uuid.UUID = row["id"]

        # Creator is always participant 0.  If req.workout_id is supplied,
        # link it to the creator's participant row and stamp workouts.team_session_id.
        if req.workout_id is not None:
            # Clear any other participant row (any session) currently holding this
            # workout, so relinking reads as an atomic "move" rather than leaving
            # a stale reference behind in its previous session.
            await cur.execute(
                "UPDATE public.team_session_participants SET workout_id = NULL "
                "WHERE workout_id = %s",
                [str(req.workout_id)],
            )
            await cur.execute(
                "INSERT INTO public.team_session_participants "
                "(team_session_id, user_id, workout_id) VALUES (%s, %s, %s)",
                [str(session_id), user_id, str(req.workout_id)],
            )
            await cur.execute(
                "UPDATE public.workouts SET team_session_id = %s WHERE id = %s AND user_id = %s",
                [str(session_id), str(req.workout_id), user_id],
            )
        else:
            await cur.execute(
                "INSERT INTO public.team_session_participants "
                "(team_session_id, user_id) VALUES (%s, %s)",
                [str(session_id), user_id],
            )
        participants_to_insert = [
            (
                str(session_id),
                str(p.user_id) if p.user_id else None,
                str(p.workout_id) if p.workout_id else None,
                _normalise_guest_name(p.guest_name),
                p.role,
            )
            for p in req.participants
            if not (p.user_id and p.user_id == user_id)
        ]
        if participants_to_insert:
            await cur.executemany(
                """
                INSERT INTO public.team_session_participants
                    (team_session_id, user_id, workout_id, guest_name, role)
                VALUES (%s, %s, %s, %s, %s)
                """,
                participants_to_insert,
            )
        notif_recipients = [p for p in req.participants if p.user_id and p.user_id != user_id]
        if notif_recipients:
            payload = await _build_notification_payload(
                cur, team_session_id=session_id, session_name=req.name, actor_user_id=user_id
            )
            notif_rows = [
                (
                    p.user_id,
                    "team_session_linked" if p.workout_id else "workout_link_pending",
                    json.dumps(payload),
                )
                for p in notif_recipients
            ]
            await cur.executemany(
                "INSERT INTO public.notifications (user_id, type, payload) VALUES (%s, %s, %s)",
                notif_rows,
            )

    result = await _fetch_team_session(conn, team_session_id=session_id)
    if result is None:
        raise RuntimeError("Team session not found after update")
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
                       COUNT(tsp.id) AS participant_count,
                       COUNT(tsp.id) FILTER (WHERE tsp.workout_id IS NOT NULL) AS logged_count
                FROM   public.team_sessions ts
                LEFT JOIN public.team_session_participants tsp ON tsp.team_session_id = ts.id
                WHERE  (ts.created_by = %s OR ts.id IN (
                           SELECT team_session_id FROM public.team_session_participants
                           WHERE user_id = %s
                        ))
                  AND  (ts.performed_at, ts.id) < (
                           SELECT performed_at, id FROM public.team_sessions
                           WHERE id = %s
                             AND (
                                 created_by = %s
                                 OR id IN (
                                     SELECT team_session_id FROM public.team_session_participants
                                     WHERE user_id = %s
                                 )
                             )
                       )
                GROUP  BY ts.id
                ORDER  BY ts.performed_at DESC, ts.id DESC
                LIMIT  %s
                """,
                [user_id, user_id, str(before_id), user_id, user_id, limit],
            )
        else:
            await cur.execute(
                """
                SELECT ts.id, ts.created_by, ts.name, ts.team_size, ts.scoring_type,
                       ts.team_score, ts.team_score_s, ts.team_score_reps,
                       ts.status, ts.performed_at,
                       COUNT(tsp.id) AS participant_count,
                       COUNT(tsp.id) FILTER (WHERE tsp.workout_id IS NOT NULL) AS logged_count
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
                [user_id, user_id, limit],
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
    values = list(fields.values()) + [str(team_session_id), user_id]
    async with conn.transaction(), conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            f"UPDATE public.team_sessions SET {set_clause} "
            "WHERE id = %s AND created_by = %s RETURNING id, name",
            values,
        )
        row = await cur.fetchone()
        if row is None:
            return None

        # BG-07: fire team_session_updated for every OTHER participant with a
        # real user_id (skip the actor themselves, skip guests — no
        # notification channel). This is the same generic edit-notification
        # the Finalize flow relies on (finalize is just PATCH .../status).
        await cur.execute(
            "SELECT DISTINCT user_id FROM public.team_session_participants "
            "WHERE team_session_id = %s AND user_id IS NOT NULL AND user_id != %s",
            [str(team_session_id), user_id],
        )
        recipients = await cur.fetchall()
        if recipients:
            payload = await _build_notification_payload(
                cur,
                team_session_id=team_session_id,
                session_name=row["name"],
                actor_user_id=user_id,
            )
            notif_rows = [
                (r["user_id"], "team_session_updated", json.dumps(payload)) for r in recipients
            ]
            await cur.executemany(
                "INSERT INTO public.notifications (user_id, type, payload) VALUES (%s, %s, %s)",
                notif_rows,
            )
    return await get_team_session(conn, user_id=user_id, team_session_id=team_session_id)


async def delete_team_session(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
    team_session_id: uuid.UUID,
) -> bool:
    async with conn.cursor() as cur:
        await cur.execute(
            "DELETE FROM public.team_sessions WHERE id = %s AND created_by = %s",
            [str(team_session_id), user_id],
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
    async with conn.transaction(), conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            "SELECT id, name FROM public.team_sessions WHERE id = %s AND created_by = %s",
            [str(team_session_id), user_id],
        )
        session_row = await cur.fetchone()
        if session_row is None:
            return None

        if req.workout_id is not None:
            # Clear any other participant row (any session) currently holding this
            # workout, so relinking reads as an atomic "move" rather than leaving
            # a stale reference behind in its previous session.
            await cur.execute(
                "UPDATE public.team_session_participants SET workout_id = NULL "
                "WHERE workout_id = %s",
                [str(req.workout_id)],
            )

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
            payload = await _build_notification_payload(
                cur,
                team_session_id=team_session_id,
                session_name=session_row["name"],
                actor_user_id=user_id,
            )
            await _create_notification(
                cur,
                user_id=req.user_id,
                notif_type=notif_type,
                payload=payload,
            )

    return await _fetch_team_session(conn, team_session_id=team_session_id)


async def get_participant(
    conn: psycopg.AsyncConnection[Any],
    *,
    team_session_id: uuid.UUID,
    participant_id: uuid.UUID,
) -> dict[str, Any] | None:
    """Fetch a single participant row scoped to its session, keyed by surrogate id.

    Used by the router to resolve a participant row's user_id before deciding
    the self-action authorization check — callers must not assume the row
    exists just because a participant_id was supplied on the path.
    """
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            "SELECT * FROM public.team_session_participants WHERE id = %s AND team_session_id = %s",
            [str(participant_id), str(team_session_id)],
        )
        return await cur.fetchone()


async def patch_participant(
    conn: psycopg.AsyncConnection[Any],
    *,
    team_session_id: uuid.UUID,
    participant_id: uuid.UUID,
    actor_user_id: uuid.UUID,
    req: PatchParticipantRequest,
) -> TeamSession | None:
    fields: dict[str, object] = {}
    if req.workout_id is not None:
        fields["workout_id"] = str(req.workout_id)
    if req.role is not None:
        fields["role"] = req.role

    if fields:
        set_clause = ", ".join(f"{k} = %s" for k in fields)
        values = list(fields.values()) + [str(team_session_id), str(participant_id)]
        async with conn.transaction(), conn.cursor(row_factory=dict_row) as cur:
            if req.workout_id is not None:
                # Clear any other participant row (any session) currently holding
                # this workout, so relinking reads as an atomic "move" rather than
                # leaving a stale reference behind in its previous session.
                await cur.execute(
                    "UPDATE public.team_session_participants SET workout_id = NULL "
                    "WHERE workout_id = %s AND id != %s",
                    [str(req.workout_id), str(participant_id)],
                )
            await cur.execute(
                f"UPDATE public.team_session_participants SET {set_clause} "
                "WHERE team_session_id = %s AND id = %s "
                "RETURNING user_id, workout_id",
                values,
            )
            row = await cur.fetchone()
            if row is None:
                return None

            # Notify only when: a real workout_id was just set, the participant
            # is a registered user (guests have no notification channel), and
            # someone other than the participant themselves made the change.
            if (
                req.workout_id is not None
                and row["user_id"] is not None
                and row["user_id"] != actor_user_id
            ):
                await cur.execute(
                    "SELECT name FROM public.team_sessions WHERE id = %s",
                    [str(team_session_id)],
                )
                session_row = await cur.fetchone()
                session_name = session_row["name"] if session_row else None
                payload = await _build_notification_payload(
                    cur,
                    team_session_id=team_session_id,
                    session_name=session_name,
                    actor_user_id=actor_user_id,
                )
                await _create_notification(
                    cur,
                    user_id=row["user_id"],
                    notif_type="team_session_linked",
                    payload=payload,
                )

    return await _fetch_team_session(conn, team_session_id=team_session_id)


async def remove_participant(
    conn: psycopg.AsyncConnection[Any],
    *,
    team_session_id: uuid.UUID,
    participant_id: uuid.UUID,
) -> bool:
    async with conn.cursor() as cur:
        await cur.execute(
            "DELETE FROM public.team_session_participants WHERE team_session_id = %s AND id = %s",
            [str(team_session_id), str(participant_id)],
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
            [str(workout_id), user_id],
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
            LIMIT 100
            """,
            [user_id, user_id],
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
            [user_id],
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
                [user_id],
            )
        else:
            await cur.execute(
                "SELECT * FROM public.notifications WHERE user_id = %s AND read_at IS NULL "
                "ORDER BY created_at DESC LIMIT 50",
                [user_id],
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
            [str(notification_id), user_id],
        )
        row = await cur.fetchone()
    if row is None:
        return None
    return Notification(**row)


async def add_training_partner(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
    partner_id: uuid.UUID,
) -> TrainingPartner | None:
    """Insert a training_partners row. Returns None if the relationship already exists."""
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            INSERT INTO public.training_partners (user_id, partner_id)
            VALUES (%s, %s)
            ON CONFLICT (user_id, partner_id) DO NOTHING
            RETURNING partner_id
            """,
            (user_id, partner_id),
        )
        inserted = await cur.fetchone()
        if not inserted:
            return None  # relationship already exists

        await cur.execute(
            """
            SELECT id AS user_id, display_name
            FROM public.profiles
            WHERE id = %s
            """,
            (partner_id,),
        )
        profile = await cur.fetchone()
        if not profile:
            return None

        display = profile["display_name"] or str(partner_id)
        return TrainingPartner(
            user_id=profile["user_id"],
            guest_name=None,
            display_name=display,
            session_count=0,
            most_common_format=None,
        )
