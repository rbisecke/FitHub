"""Create infra_current, infra_history, and deployment_events tables.

Revision ID: 0068_create_infra_monitoring
Revises: 0067_planned_sessions_index
Create Date: 2026-07-16
"""

from alembic import op

revision = "0068_create_infra_monitoring"
down_revision = "0067_planned_sessions_index"
branch_labels = None
depends_on = None

_TABLES = ("infra_current", "infra_history", "deployment_events")


def upgrade() -> None:
    # ── infra_current: one row per source, updated in-place ───────────────
    op.execute("""
        CREATE TABLE public.infra_current (
            source      text        NOT NULL PRIMARY KEY,
            status      text        NOT NULL DEFAULT 'unknown'
                            CHECK (status IN ('healthy', 'degraded', 'critical', 'unknown')),
            metrics     jsonb       NOT NULL DEFAULT '{}',
            checked_at  timestamptz NOT NULL DEFAULT now()
        )
    """)

    # Seed the three expected rows so the status bar renders "unknown" before
    # the first collector run, rather than showing nothing.
    op.execute("""
        INSERT INTO public.infra_current (source) VALUES ('supabase'), ('vercel'), ('railway')
    """)

    # ── infra_history: 60s-resolution ring buffer, pruned to 1 hour ───────
    op.execute("""
        CREATE TABLE public.infra_history (
            id           uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            source       text        NOT NULL,
            metrics      jsonb       NOT NULL,
            collected_at timestamptz NOT NULL DEFAULT now()
        )
    """)
    op.execute("""
        CREATE INDEX infra_history_source_time_idx
            ON public.infra_history (source, collected_at DESC)
    """)

    # ── deployment_events: append-only, deduped by platform deploy ID ─────
    op.execute("""
        CREATE TABLE public.deployment_events (
            id             uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
            platform_id    text        NOT NULL,
            platform       text        NOT NULL CHECK (platform IN ('vercel', 'railway')),
            service_name   text        NOT NULL,
            status         text        NOT NULL,
            commit_sha     text,
            commit_message text,
            branch         text,
            duration_ms    integer,
            error_message  text,
            occurred_at    timestamptz NOT NULL DEFAULT now(),
            UNIQUE (platform, platform_id)
        )
    """)
    op.execute("""
        CREATE INDEX deployment_events_platform_time_idx
            ON public.deployment_events (platform, occurred_at DESC)
    """)

    # RLS: admin-only tables, service_role access only — no authenticated
    # user should ever read or write these. FORCE makes the policy apply
    # even to the table owner. The explicit RESTRICTIVE backend_only policy
    # documents the zero-authenticated-access intent in pg_policies rather
    # than relying on the implicit "no policies = deny" default (matches
    # the access_requests / error_events pattern from 0058_rls_and_not_null).
    for table in _TABLES:
        op.execute(f"ALTER TABLE public.{table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE public.{table} FORCE ROW LEVEL SECURITY")
        op.execute(f"CREATE POLICY backend_only ON public.{table} AS RESTRICTIVE USING (false)")
        op.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON public.{table} TO service_role")


def downgrade() -> None:
    for table in reversed(_TABLES):
        op.execute(f"REVOKE SELECT, INSERT, UPDATE, DELETE ON public.{table} FROM service_role")
        op.execute(f"DROP POLICY IF EXISTS backend_only ON public.{table}")
        op.execute(f"DROP TABLE IF EXISTS public.{table}")
