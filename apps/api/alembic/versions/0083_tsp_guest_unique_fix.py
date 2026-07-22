"""Fix guest-participant uniqueness so a session can hold more than one guest.

Revision ID: 0083_tsp_guest_unique_fix
Revises: 0082_tsp_workout_unique
Create Date: 2026-07-22

`team_session_participants` was created (6b0fd0828bf6) with
`UNIQUE NULLS NOT DISTINCT (team_session_id, user_id)`, intended to stop
the same registered user appearing twice in one session. But
`NULLS NOT DISTINCT` treats every `user_id IS NULL` row (i.e. every guest)
as equal to every other for uniqueness purposes — so the constraint also
silently caps a session at exactly ONE guest participant, since a second
`INSERT` with `user_id = NULL` collides with the first.

This migration drops that constraint and replaces it with a **partial**
unique index that only applies to real (non-null) user ids, so guest rows
are excluded from the uniqueness check entirely and a session can hold any
number of guests. Registered-user duplication is still prevented exactly
as before.
"""

from __future__ import annotations

from alembic import op

revision = "0083_tsp_guest_unique_fix"
down_revision = "0082_tsp_workout_unique"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE public.team_session_participants "
        "DROP CONSTRAINT team_session_participants_team_session_id_user_id_key"
    )
    op.execute(
        "CREATE UNIQUE INDEX tsp_team_session_user_unique_idx "
        "ON public.team_session_participants (team_session_id, user_id) "
        "WHERE user_id IS NOT NULL"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS tsp_team_session_user_unique_idx")
    op.execute(
        "ALTER TABLE public.team_session_participants "
        "ADD CONSTRAINT team_session_participants_team_session_id_user_id_key "
        "UNIQUE NULLS NOT DISTINCT (team_session_id, user_id)"
    )
