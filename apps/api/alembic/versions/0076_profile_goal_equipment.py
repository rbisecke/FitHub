"""Add primary_goal and equipment_access to profiles.

Two new persisted onboarding/AI-input fields (design doc 08 §2, backend gaps
BG-19 + BG-20):

  * primary_goal — the member's single primary training goal, one of seven
    values. Feeds the AI plan generator (Programming & Plans). Nullable: it is
    NULL for every account created before this migration and for anyone who
    skips the goal onboarding step.

  * equipment_access — the equipment a member has, a multi-valued set drawn
    from a fixed vocabulary. Also feeds Programming & Plans. Stored as TEXT[]
    to mirror public.movements.equipment_required (0069) rather than JSONB, and
    guarded by the same `<@` contained-by CHECK pattern used there and in 0075.
    Nullable: NULL means the equipment step was never answered, distinct from
    ARRAY['none'] which means the member explicitly has no equipment.

Both columns get a column-level GRANT UPDATE to authenticated, matching the
existing per-column grant discipline on public.profiles (0035, 0039) — the
table has no blanket authenticated UPDATE grant, so a new writable column must
be granted explicitly or the RLS self_update policy can never reach it.

Revision ID: 0076_profile_goal_equipment
Revises: 0075_equip_check_grant_cleanup
Create Date: 2026-07-19
"""

from alembic import op

revision: str = "0076_profile_goal_equipment"
down_revision: str | None = "0075_equip_check_grant_cleanup"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE public.profiles
          ADD COLUMN IF NOT EXISTS primary_goal TEXT
            CHECK (primary_goal IN (
                'build_strength', 'gain_muscle', 'lose_weight',
                'improve_conditioning', 'compete', 'return_from_break',
                'general_fitness'
            )),
          ADD COLUMN IF NOT EXISTS equipment_access TEXT[]
            CHECK (
                equipment_access <@ ARRAY[
                    'barbell', 'dumbbells', 'kettlebells', 'rig_pull_up',
                    'rower_erg', 'machines', 'none'
                ]::TEXT[]
                -- 'none' (bodyweight only) is mutually exclusive with real
                -- equipment; DB backstop mirrors the Pydantic validator so a
                -- writer bypassing the app layer cannot persist a mixed set.
                AND (
                    NOT ('none' = ANY(equipment_access))
                    OR array_length(equipment_access, 1) = 1
                )
                -- empty array is not a valid answer (NULL = unanswered instead)
                AND array_length(equipment_access, 1) >= 1
            )
    """)

    # profiles has no blanket authenticated UPDATE grant (0035/0039 style):
    # each writable column is granted explicitly.
    op.execute("""
        GRANT UPDATE(primary_goal, equipment_access)
            ON public.profiles TO authenticated
    """)


def downgrade() -> None:
    op.execute(
        "REVOKE UPDATE(primary_goal, equipment_access) ON public.profiles FROM authenticated"
    )
    op.execute("ALTER TABLE public.profiles DROP COLUMN IF EXISTS equipment_access")
    op.execute("ALTER TABLE public.profiles DROP COLUMN IF EXISTS primary_goal")
