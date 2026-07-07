"""fix missing ON DELETE clauses on plan_tasks.plan_id and workouts.benchmark_id

Revision ID: 0056_fk_cascade_benchmark
Revises: 0055_dc_ingest_prefix_idx
Create Date: 2026-07-07
"""

from __future__ import annotations

from alembic import op

revision: str = "0056_fk_cascade_benchmark"
down_revision: str = "0055_dc_ingest_prefix_idx"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # DB1: plan_tasks.plan_id — no CASCADE means deleting a plan leaves orphan tasks
    op.execute(
        """
        ALTER TABLE public.plan_tasks
            DROP CONSTRAINT IF EXISTS plan_tasks_plan_id_fkey;
        ALTER TABLE public.plan_tasks
            ADD CONSTRAINT plan_tasks_plan_id_fkey
            FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE CASCADE;
        """
    )

    # DB2: workouts.benchmark_id — no SET NULL means deleting a benchmark raises FK error
    op.execute(
        """
        ALTER TABLE public.workouts
            DROP CONSTRAINT IF EXISTS workouts_benchmark_id_fkey;
        ALTER TABLE public.workouts
            ADD CONSTRAINT workouts_benchmark_id_fkey
            FOREIGN KEY (benchmark_id) REFERENCES public.benchmarks(id)
            ON DELETE SET NULL;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE public.workouts
            DROP CONSTRAINT IF EXISTS workouts_benchmark_id_fkey;
        ALTER TABLE public.workouts
            ADD CONSTRAINT workouts_benchmark_id_fkey
            FOREIGN KEY (benchmark_id) REFERENCES public.benchmarks(id);
        """
    )
    op.execute(
        """
        ALTER TABLE public.plan_tasks
            DROP CONSTRAINT IF EXISTS plan_tasks_plan_id_fkey;
        ALTER TABLE public.plan_tasks
            ADD CONSTRAINT plan_tasks_plan_id_fkey
            FOREIGN KEY (plan_id) REFERENCES public.plans(id);
        """
    )
