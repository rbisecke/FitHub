"""Add profiles.last_active_at for the nightly streak-at-risk job.

Revision ID: 0088_profiles_last_active
Revises: 0087_streak_freeze_fix
Create Date: 2026-07-22

Backs `app/jobs/gamification.py`'s nightly `check_streak_at_risk` job (Domain
07 §I / BG-16): lets it skip any user who has already opened the app today,
so the reminder only reaches users who genuinely haven't been active.

Touched by `app/dependencies/common.py`'s `require_invited` (runs on every
authenticated request) rather than any single endpoint, and only written
when stale (NULL or more than 5 minutes old) to avoid an UPDATE on every
request. Stored in UTC, consistent with the rest of this schema.

Deliberately NOT added to the `authenticated` role's column-level UPDATE
grant (unlike handle/display_name/etc. in migration fa30352182ee) — this
column is only ever written by the backend's own privileged Postgres
connection, never by a direct Supabase client write.
"""

from __future__ import annotations

from alembic import op

revision: str = "0088_profiles_last_active"
down_revision: str | None = "0087_streak_freeze_fix"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.execute("ALTER TABLE public.profiles ADD COLUMN last_active_at timestamptz")


def downgrade() -> None:
    op.execute("ALTER TABLE public.profiles DROP COLUMN IF EXISTS last_active_at")
