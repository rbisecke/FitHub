"""DB schema hygiene: drop redundant plans column-grants, add equipment tag CHECK.

Two independent low-severity findings from the programming-flexibility review,
both confined to schema metadata rather than live data:

  1. DB1 — migration 0071 added five column-level GRANT statements (INSERT and
     UPDATE on equipment, days_per_week, target_movement_id, max_duration_weeks,
     current_1rm_kg) to public.plans for both authenticated and service_role.
     Those grants are pure no-ops: public.plans already carries blanket,
     non-column-restricted GRANT SELECT, INSERT, UPDATE, DELETE for
     authenticated (migration 0027_plan_schema) and for service_role
     (migration 0063_service_role_grants_and_search_path). A blanket
     table-level grant already covers every column, so the five column-level
     grants added nothing — they only misleadingly imply that plans uses
     column-level privilege restriction the way public.movements genuinely
     does (see 0069_movements_equipment_required, which grants INSERT/UPDATE
     on just the equipment_required column with no covering blanket grant).
     Revoking them here changes nothing about who can write what; real access
     to plans is entirely governed by the still-untouched blanket grants.

  2. DB2 — public.movements.equipment_required (added in
     0069_movements_equipment_required) has never had a DB-level constraint
     on its tag vocabulary. Validity is enforced only by
     apps/api/scripts/seed_movement_equipment.py's validate_tags(), which a
     future direct UPDATE or admin tool bypassing that script would skip
     entirely. This adds a CHECK mirroring that script's VALID_TAGS constant
     as a DB-level backstop, using the same <@ (contained-by) array operator
     already used to query this column in
     apps/api/app/routers/movements.py and apps/api/app/ai/plan_generator.py.
     The tag list below is copied verbatim from VALID_TAGS in
     apps/api/scripts/seed_movement_equipment.py — keep the two in sync
     manually if the vocabulary ever changes.

Note: the design doc names this revision 0075_equipment_check_grant_cleanup, but
that string is 34 characters and alembic_version.version_num is varchar(32) --
upgrading with it fails with StringDataRightTruncation. Shortened to
0075_equip_check_grant_cleanup (30 chars) to fit.

Revision ID: 0075_equip_check_grant_cleanup
Revises: 0074_mesocycle_week_ck_relax
Create Date: 2026-07-17
"""

from alembic import op

revision = "0075_equip_check_grant_cleanup"
down_revision = "0074_mesocycle_week_ck_relax"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # DB1 — revoke exactly the five column-level grants 0071 added; the blanket
    # table-level grants from 0027/0063 are untouched and remain in force.
    op.execute(
        """ALTER TABLE public.movements
           ADD CONSTRAINT equipment_required_valid_tags CHECK (
               equipment_required <@ ARRAY[
                   'barbell', 'rack', 'dumbbells', 'kettlebell', 'pull_up_bar',
                   'rings', 'rower', 'bike', 'ski', 'bodyweight', 'jump_rope',
                   'resistance_band'
               ]::TEXT[]
           )"""
    )

    op.execute(
        """REVOKE INSERT (equipment, days_per_week, target_movement_id,
                          max_duration_weeks, current_1rm_kg)
           ON public.plans FROM authenticated, service_role"""
    )
    op.execute(
        """REVOKE UPDATE (equipment, days_per_week, target_movement_id,
                          max_duration_weeks, current_1rm_kg)
           ON public.plans FROM authenticated, service_role"""
    )


def downgrade() -> None:
    # DB2 first: DROP CONSTRAINT always succeeds regardless of existing data,
    # unlike re-ADDing it (which could fail on rows written after upgrade with
    # a tag outside VALID_TAGS) — same asymmetry noted in
    # 0074_mesocycle_week_ck_relax's downgrade for its own constraint restores.
    op.execute(
        "ALTER TABLE public.movements DROP CONSTRAINT IF EXISTS equipment_required_valid_tags"
    )

    # DB1: restore exactly what 0071 originally granted.
    op.execute(
        """GRANT INSERT (equipment, days_per_week, target_movement_id,
                         max_duration_weeks, current_1rm_kg)
           ON public.plans TO authenticated, service_role"""
    )
    op.execute(
        """GRANT UPDATE (equipment, days_per_week, target_movement_id,
                         max_duration_weeks, current_1rm_kg)
           ON public.plans TO authenticated, service_role"""
    )
