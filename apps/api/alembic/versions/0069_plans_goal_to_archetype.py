"""Rename plans.goal to archetype and expand to 7 valid values.

Revision ID: 0069_goal_to_archetype
Revises: 0068_equipment_required
Create Date: 2026-07-09

The upgrade is a 5-step sequence so no row is left with a NULL archetype
before the NOT NULL constraint is applied:
  1. Add nullable archetype column.
  2-5. Back-fill each of the 4 old goal values.
  6. Safety-net: collapse any remaining NULLs to general-crossfit.
  7. Set NOT NULL.
  8. Drop the goal column.
  9. Add CHECK constraint for the 7 valid archetype values.

Downgrade reverses this: drops the CHECK constraint, re-adds goal,
maps known archetype values back (strength-bias -> strength, aerobic-base ->
endurance), collapses everything else to general_fitness, sets NOT NULL on
goal, then drops archetype.
"""

from alembic import op

revision = "0069_goal_to_archetype"
down_revision = "0068_equipment_required"
branch_labels = None
depends_on = None

_VALID_ARCHETYPES = (
    "'general-crossfit'",
    "'strength-bias'",
    "'travel-minimal'",
    "'aerobic-base'",
    "'bodyweight-calisthenics'",
    "'skill-acquisition'",
    "'one-rm-peak'",
)

_CHECK_EXPR = f"archetype IN ({', '.join(_VALID_ARCHETYPES)})"


def upgrade() -> None:
    # Step 1: add nullable column so existing rows are not immediately invalid.
    op.execute("ALTER TABLE public.plans ADD COLUMN archetype TEXT")

    # Steps 2-5: migrate every known goal value.
    op.execute(
        "UPDATE public.plans SET archetype = 'general-crossfit' WHERE goal = 'general_fitness'"
    )
    op.execute("UPDATE public.plans SET archetype = 'strength-bias' WHERE goal = 'strength'")
    op.execute("UPDATE public.plans SET archetype = 'aerobic-base' WHERE goal = 'endurance'")
    # competition_prep has no exact equivalent; closest is general-crossfit.
    op.execute(
        "UPDATE public.plans SET archetype = 'general-crossfit' WHERE goal = 'competition_prep'"
    )

    # Step 6: safety net -- any NULL archetype (e.g. from an unknown goal value
    # introduced outside normal app flow) falls back to general-crossfit so
    # the NOT NULL constraint never fails.
    op.execute("UPDATE public.plans SET archetype = 'general-crossfit' WHERE archetype IS NULL")

    # Step 7: enforce NOT NULL now that every row has a value.
    op.execute("ALTER TABLE public.plans ALTER COLUMN archetype SET NOT NULL")

    # Step 8: remove the old column.
    op.execute("ALTER TABLE public.plans DROP COLUMN goal")

    # Step 9: add CHECK constraint for the 7 valid archetype values.
    op.execute(f"ALTER TABLE public.plans ADD CONSTRAINT ck_plans_archetype CHECK ({_CHECK_EXPR})")


def downgrade() -> None:
    # Remove the CHECK constraint before touching values.
    op.execute("ALTER TABLE public.plans DROP CONSTRAINT IF EXISTS ck_plans_archetype")

    # Re-add goal as nullable initially so we can populate it before enforcing
    # NOT NULL. Include the original CHECK to maintain integrity during the fill.
    op.execute(
        "ALTER TABLE public.plans ADD COLUMN goal TEXT"
        " CHECK (goal IN ('general_fitness','strength','endurance','competition_prep'))"
    )

    # Map the two archetypes that have a direct goal equivalent back.
    op.execute("UPDATE public.plans SET goal = 'strength' WHERE archetype = 'strength-bias'")
    op.execute("UPDATE public.plans SET goal = 'endurance' WHERE archetype = 'aerobic-base'")

    # Everything else (general-crossfit and the four new archetypes added in
    # this migration) collapses back to general_fitness -- the safest default.
    op.execute("UPDATE public.plans SET goal = 'general_fitness' WHERE goal IS NULL")

    # Enforce NOT NULL now that every row has a value.
    op.execute("ALTER TABLE public.plans ALTER COLUMN goal SET NOT NULL")

    # Drop the archetype column.
    op.execute("ALTER TABLE public.plans DROP COLUMN archetype")
