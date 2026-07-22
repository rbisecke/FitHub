"""Fix streak_freeze_events uniqueness so multiple milestones can grant in one week.

Revision ID: 0087_streak_freeze_fix
Revises: 0086_notif_type_gamify
Create Date: 2026-07-22

Migration 0085 added `UNIQUE (user_id, week_key, event_type)`, intended to
stop the same week from being double-consumed. But every 'granted' event
in a single computation shares the same `week_key` (the week the milestone
ladder was evaluated against — see `app/repositories/streak.py`), and this
constraint doesn't include `milestone` — so a user crossing more than one
milestone at once (e.g. a first-ever computation for a long-time user
crossing 4, 8, *and* 12 in the same call) had its second and third grants
silently rejected by this constraint (caught by the code's own
`UniqueViolation` handler, which is designed to treat that as "already
granted by a concurrent caller" — an integration test surfaced this).

Fix: the (user_id, week_key, event_type) constraint only needs to apply to
'consumed' events (a given week can only be consumed once) — 'granted'
events are already made idempotent by the pre-existing
`(user_id, milestone)` constraint, so they don't need `week_key`
uniqueness at all. Replace the blanket 3-column constraint with a partial
unique index scoped to `event_type = 'consumed'`.
"""

from __future__ import annotations

from alembic import op

revision: str = "0087_streak_freeze_fix"
down_revision: str | None = "0086_notif_type_gamify"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE public.streak_freeze_events "
        "DROP CONSTRAINT streak_freeze_events_user_id_week_key_event_type_key"
    )
    op.execute(
        "CREATE UNIQUE INDEX streak_freeze_events_consumed_week_unique_idx "
        "ON public.streak_freeze_events (user_id, week_key) "
        "WHERE event_type = 'consumed'"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS streak_freeze_events_consumed_week_unique_idx")
    op.execute(
        "ALTER TABLE public.streak_freeze_events "
        "ADD CONSTRAINT streak_freeze_events_user_id_week_key_event_type_key "
        "UNIQUE (user_id, week_key, event_type)"
    )
