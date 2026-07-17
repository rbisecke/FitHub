"""Link results rows back to the planned_item they fulfilled.

Revision ID: 0072_results_planned_item_link
Revises: 0071_plans_scaffold_fields
Create Date: 2026-07-16
"""

from alembic import op

revision = "0072_results_planned_item_link"
down_revision = "0071_plans_scaffold_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # planned_item_id: nullable, advisory FK back to the plan item a logged result
    # fulfilled — same precedent as 0071's plans.target_movement_id.
    op.execute(
        "ALTER TABLE public.results"
        " ADD COLUMN planned_item_id UUID REFERENCES public.planned_items(id) ON DELETE SET NULL"
    )

    op.execute(
        "CREATE INDEX ix_results_planned_item_id ON public.results (planned_item_id)"
        " WHERE planned_item_id IS NOT NULL"
    )

    # results already grants blanket SELECT/INSERT/UPDATE/DELETE to authenticated and
    # service_role (migration 0f53ca56f0ef), not column-scoped, so no additional GRANT
    # is needed for this new nullable column.


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_results_planned_item_id")
    op.execute("ALTER TABLE public.results DROP COLUMN IF EXISTS planned_item_id")
