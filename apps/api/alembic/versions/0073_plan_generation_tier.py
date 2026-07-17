"""Add generation_tier and corrections columns to plan_tasks for plan-generation transparency.

Revision ID: 0073_plan_generation_tier
Revises: 0072_results_planned_item_link
Create Date: 2026-07-16
"""

from alembic import op

revision = "0073_plan_generation_tier"
down_revision = "0072_results_planned_item_link"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # generation_tier: nullable — existing rows and the STUB_LLM=true stub path
    # never resolve a tier (assemble_plan short-circuits before _call_llm ever
    # runs), so they simply leave it NULL. See AI3: fallback-tier plans were
    # previously indistinguishable from genuine AI-personalized plans.
    op.execute(
        "ALTER TABLE public.plan_tasks"
        " ADD COLUMN generation_tier TEXT"
        " CHECK (generation_tier IN ('ai', 'deterministic_substitution', 'static_fallback'))"
    )

    # corrections: NOT NULL DEFAULT '[]'::jsonb — every row (including
    # pre-existing ones backfilled by this ALTER) gets a well-formed empty
    # array rather than NULL, so callers never need a null-check. See B5:
    # plan corrections were logged server-side only and never surfaced.
    op.execute(
        "ALTER TABLE public.plan_tasks ADD COLUMN corrections JSONB NOT NULL DEFAULT '[]'::jsonb"
    )

    # plan_tasks already grants blanket SELECT/INSERT/UPDATE/DELETE to
    # authenticated (migration 0027_plan_schema), not column-scoped, so no
    # additional GRANT is needed for these new columns.


def downgrade() -> None:
    op.execute("ALTER TABLE public.plan_tasks DROP COLUMN IF EXISTS corrections")
    op.execute("ALTER TABLE public.plan_tasks DROP COLUMN IF EXISTS generation_tier")
