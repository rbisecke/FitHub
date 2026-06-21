"""Create wearable schema: data_connections, metric_samples, derived_metrics.

Revision ID: 0026_wearable_schema
Revises: 0025_coaching_embeddings
Create Date: 2026-06-20
"""

from __future__ import annotations

from alembic import op

revision: str = "0026_wearable_schema"
down_revision: str = "0025_coaching_embeddings"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE data_connections (
            id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            provider          TEXT NOT NULL CHECK (
                                  provider IN ('apple_health','oura','strava','garmin','whoop')
                              ),
            access_token_enc  BYTEA,
            refresh_token_enc BYTEA,
            token_expires_at  TIMESTAMPTZ,
            config            JSONB NOT NULL DEFAULT '{}',
            last_synced_at    TIMESTAMPTZ,
            sync_status       TEXT DEFAULT 'idle'
                              CHECK (sync_status IN ('idle','syncing','error')),
            created_at        TIMESTAMPTZ DEFAULT now(),
            UNIQUE (user_id, provider)
        )
    """)
    op.execute("ALTER TABLE data_connections ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY "owner access" ON data_connections
            USING (user_id = (SELECT auth.uid()))
    """)
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON data_connections TO authenticated")

    op.execute("""
        CREATE TABLE metric_samples (
            id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            type            TEXT NOT NULL,
            value           NUMERIC NOT NULL,
            unit            TEXT NOT NULL,
            source          TEXT NOT NULL,
            source_priority INT NOT NULL,
            started_at      TIMESTAMPTZ NOT NULL,
            external_id     TEXT,
            created_at      TIMESTAMPTZ DEFAULT now(),
            UNIQUE (user_id, type, started_at, source)
        )
    """)
    op.execute("""
        CREATE INDEX metric_samples_user_type
            ON metric_samples (user_id, type, started_at DESC)
    """)
    op.execute("ALTER TABLE metric_samples ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY "owner access" ON metric_samples
            USING (user_id = (SELECT auth.uid()))
    """)
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON metric_samples TO authenticated")

    op.execute("""
        CREATE TABLE derived_metrics (
            id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            date             DATE NOT NULL,
            recovery_score   NUMERIC(4,3),
            strain_score     NUMERIC(4,3),
            hooper_index     NUMERIC(4,2),
            coverage         NUMERIC(4,3),
            confidence_tier  TEXT,
            baseline_days    INT,
            computed_at      TIMESTAMPTZ DEFAULT now(),
            UNIQUE (user_id, date)
        )
    """)
    op.execute("ALTER TABLE derived_metrics ENABLE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY "owner access" ON derived_metrics
            USING (user_id = (SELECT auth.uid()))
    """)
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON derived_metrics TO authenticated")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS derived_metrics CASCADE")
    op.execute("DROP TABLE IF EXISTS metric_samples CASCADE")
    op.execute("DROP TABLE IF EXISTS data_connections CASCADE")
