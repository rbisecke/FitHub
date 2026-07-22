"""Use clock_timestamp() for coach_messages.created_at, not now().

Revision ID: 0081_coach_msgs_clock_ts
Revises: 0080_coach_sessions_updated_idx
Create Date: 2026-07-21

`write_message` inserts the user turn and the assistant turn as two separate
statements within the same request/transaction. Postgres's `now()` (and
`CURRENT_TIMESTAMP`) is stable for the whole transaction, so both INSERTs
got the IDENTICAL `created_at` value — confirmed empirically: a real
session's user/assistant pair shared the same timestamp down to the
microsecond. `ORDER BY created_at` (both in `list_messages`'s pagination and
`fetch_session_messages_history`'s LLM-context window) therefore had an
undefined tiebreak between a turn's two messages — it happened to read
correctly under `ASC` only by coincidence of physical row/scan order, and
broke as soon as `list_messages` was changed to `ORDER BY created_at DESC`
for the most-recent-window pagination fix.

`clock_timestamp()` is evaluated fresh at each statement regardless of the
enclosing transaction, giving each write within the same request a distinct,
monotonically increasing timestamp.
"""

from __future__ import annotations

from alembic import op

revision = "0081_coach_msgs_clock_ts"
down_revision = "0080_coach_sessions_updated_idx"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE public.coach_messages
            ALTER COLUMN created_at SET DEFAULT clock_timestamp()
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE public.coach_messages
            ALTER COLUMN created_at SET DEFAULT now()
    """)
