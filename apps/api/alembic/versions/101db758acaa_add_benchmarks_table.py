"""add_benchmarks_table

Revision ID: 101db758acaa
Revises: 6b0fd0828bf6
Create Date: 2026-06-19 21:31:35.440051

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "101db758acaa"
down_revision: str | Sequence[str] | None = "6b0fd0828bf6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("""
        CREATE TABLE public.benchmarks (
            id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
            name        TEXT        NOT NULL UNIQUE,
            description TEXT,
            notes       TEXT,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        ALTER TABLE public.workouts
            ADD COLUMN benchmark_id UUID REFERENCES public.benchmarks(id);

        ALTER TABLE public.benchmarks ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "benchmarks_select_authenticated"
            ON public.benchmarks FOR SELECT
            TO authenticated USING (true);
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("""
        DROP POLICY IF EXISTS "benchmarks_select_authenticated" ON public.benchmarks;
        ALTER TABLE public.workouts DROP COLUMN IF EXISTS benchmark_id;
        DROP TABLE IF EXISTS public.benchmarks;
    """)
