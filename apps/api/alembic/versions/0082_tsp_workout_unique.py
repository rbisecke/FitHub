"""Enforce a workout links to at most one team-session participant row.

Revision ID: 0082_tsp_workout_unique
Revises: 0081_coach_msgs_clock_ts
Create Date: 2026-07-22

Nothing previously prevented a workout from being silently reassigned
between team sessions: `workouts.team_session_id` is a single mutable
pointer, and when a workout got linked to session B while its
`team_session_participants` row in session A still referenced it via
`workout_id`, session A was left with a stale/dangling reference that
nobody cleared.

This migration adds a partial unique index on
`team_session_participants (workout_id) WHERE workout_id IS NOT NULL`,
guaranteeing at most one participant row across the entire table (any
session) can reference a given workout at a time. It replaces the
non-unique `tsp_workout_id_idx` added in 6b0fd0828bf6, which served the
same lookup pattern without the uniqueness guarantee.

Application code must clear (`workout_id = NULL`) any other participant
row already holding a workout_id before inserting/updating a new link,
in the same transaction as the new link — otherwise this index raises a
raw UniqueViolation.
"""

from __future__ import annotations

from alembic import op

revision = "0082_tsp_workout_unique"
down_revision = "0081_coach_msgs_clock_ts"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("DROP INDEX IF EXISTS tsp_workout_id_idx")
    op.execute(
        "CREATE UNIQUE INDEX tsp_workout_id_unique_idx "
        "ON public.team_session_participants (workout_id) "
        "WHERE workout_id IS NOT NULL"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS tsp_workout_id_unique_idx")
    op.execute(
        "CREATE INDEX tsp_workout_id_idx "
        "ON public.team_session_participants (workout_id) "
        "WHERE workout_id IS NOT NULL"
    )
