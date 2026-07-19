"""Add scaled boolean to results (BG-25).

A per-result Rx'd (false) / Scaled (true) flag. The design doc (01 §2.7, §5.5)
gives the qualifier a display on history/detail rows, but until now there was no
capture path and no column for it to land in. The AI log parser (functional §4.1)
already emits a `scaled` value that had no persisted home; this column is that
home, and the manual Rx'd/Scaled entry toggle writes it directly.

NOT NULL DEFAULT false: every historical row is treated as Rx'd, which matches
the prior display behavior (no qualifier rendered == Rx'd).

public.results carries blanket (not column-scoped) grants to authenticated and
service_role (migration 0f53ca56f0ef), so the new column needs no additional
GRANT — same reasoning documented in 0072.

Revision ID: 0077_result_scaled
Revises: 0076_profile_goal_equipment
Create Date: 2026-07-19
"""

from alembic import op

revision: str = "0077_result_scaled"
down_revision: str | None = "0076_profile_goal_equipment"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE public.results ADD COLUMN IF NOT EXISTS scaled BOOLEAN NOT NULL DEFAULT false"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE public.results DROP COLUMN IF EXISTS scaled")
