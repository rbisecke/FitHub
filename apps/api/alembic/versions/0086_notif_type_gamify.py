"""Extend notifications.type CHECK with the three gamification notification types.

Revision ID: 0086_notif_type_gamify
Revises: 0085_streak_freeze_tables
Create Date: 2026-07-22

Adds `streak_at_risk`, `freeze_consumed`, `streak_milestone` to the CHECK
constraint on `public.notifications.type` (BG-16/BG-17/BG-18). Only
`freeze_consumed` and `streak_milestone` are fired by this pass's code
(the streak-freeze reconciliation in `app/repositories/streak.py`);
`streak_at_risk` is extended now so a later backend pass (the scheduled-
trigger notification work) doesn't need its own migration touching this
same constraint.

The existing constraint name (`notifications_type_check`) was confirmed
against the local dev DB via `pg_constraint` rather than assumed.
"""

from __future__ import annotations

from alembic import op

revision: str = "0086_notif_type_gamify"
down_revision: str | None = "0085_streak_freeze_tables"
branch_labels: str | None = None
depends_on: str | None = None

_OLD_TYPES = ("team_session_linked", "team_session_updated", "workout_link_pending")
_NEW_TYPES = (
    *_OLD_TYPES,
    "streak_at_risk",
    "freeze_consumed",
    "streak_milestone",
)


def _check_sql(types: tuple[str, ...]) -> str:
    values = ", ".join(f"'{t}'" for t in types)
    return f"CHECK (type IN ({values}))"


def upgrade() -> None:
    op.execute("ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check")
    op.execute(
        f"ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check "
        f"{_check_sql(_NEW_TYPES)}"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check")
    op.execute(
        f"ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check "
        f"{_check_sql(_OLD_TYPES)}"
    )
