"""FORCE RLS on benchmarks, document zero-policy intent, add NOT NULL to timestamps

Revision ID: 0058_rls_and_not_null
Revises: 0057_add_missing_indexes
Create Date: 2026-07-07
"""

from __future__ import annotations

import sqlalchemy as sa

from alembic import op

revision: str = "0058_rls_and_not_null"
down_revision: str = "0057_add_missing_indexes"
branch_labels = None
depends_on = None

# DB3: columns that must not have NULLs before adding NOT NULL constraint.
# All were created with DEFAULT now(), so NULLs are only possible if someone
# explicitly inserted NULL. The RuntimeError below is a safety guard.
_TIMESTAMP_CHECKS: list[tuple[str, str]] = [
    ("coach_interactions", "created_at"),
    ("plans", "created_at"),
    ("adaptations", "proposed_at"),
    ("injuries", "reported_at"),
    ("coach_sessions", "created_at"),
    ("coach_messages", "created_at"),
]


def upgrade() -> None:
    # DB3: FORCE RLS on benchmarks so the table owner also respects RLS.
    # The existing SELECT policy (USING (true)) gives all authenticated users
    # read access; FORCE makes that policy apply to superusers/table owner too.
    op.execute("ALTER TABLE public.benchmarks FORCE ROW LEVEL SECURITY")

    # DB4: access_requests and error_events are backend service-role only.
    # Explicit RESTRICTIVE policies make the zero-authenticated-access intent
    # visible to tooling (pg_policies) rather than relying on the implicit
    # "no policies = deny" default.
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies
                WHERE tablename = 'access_requests' AND policyname = 'backend_only'
            ) THEN
                EXECUTE 'CREATE POLICY backend_only ON public.access_requests
                         AS RESTRICTIVE USING (false)';
            END IF;
        END $$
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies
                WHERE tablename = 'error_events' AND policyname = 'backend_only'
            ) THEN
                EXECUTE 'CREATE POLICY backend_only ON public.error_events
                         AS RESTRICTIVE USING (false)';
            END IF;
        END $$
        """
    )

    # DB7: Add NOT NULL to timestamp columns that have always had DEFAULT now()
    # but were created without an explicit NOT NULL constraint.
    conn = op.get_bind()
    for table, col in _TIMESTAMP_CHECKS:
        count = conn.execute(
            sa.text(f"SELECT COUNT(*) FROM public.{table} WHERE {col} IS NULL")
        ).scalar()
        if count and count > 0:
            raise RuntimeError(
                f"public.{table}.{col} has {count} NULL rows — backfill before adding NOT NULL"
            )
        op.execute(sa.text(f"ALTER TABLE public.{table} ALTER COLUMN {col} SET NOT NULL"))


def downgrade() -> None:
    for table, col in reversed(_TIMESTAMP_CHECKS):
        op.execute(sa.text(f"ALTER TABLE public.{table} ALTER COLUMN {col} DROP NOT NULL"))

    op.execute("DROP POLICY IF EXISTS backend_only ON public.error_events")
    op.execute("DROP POLICY IF EXISTS backend_only ON public.access_requests")

    op.execute("ALTER TABLE public.benchmarks NO FORCE ROW LEVEL SECURITY")
