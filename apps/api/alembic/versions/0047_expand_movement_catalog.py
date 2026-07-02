"""expand_movement_catalog — add snatch/clean variants and common CrossFit movements

Revision ID: 0047_expand_movement_catalog
Revises: 0046_create_error_events
Create Date: 2026-07-02

"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "0047_expand_movement_catalog"
down_revision: str | Sequence[str] | None = "0046_create_error_events"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Columns: name, slug, base_movement, modality, default_result_types,
#          default_result_type, primary_muscle_group, is_official
_MOVEMENTS: list[tuple[str, str, str, str, str, str | None, str | None]] = [
    # ── Weightlifting: Snatch family ─────────────────────────────────────────
    (
        "Power Snatch",
        "power-snatch",
        "Snatch",
        "weightlifting",
        "ARRAY['weight','reps']",
        "weight",
        "legs",
    ),
    (
        "Hang Snatch",
        "hang-snatch",
        "Snatch",
        "weightlifting",
        "ARRAY['weight','reps']",
        "weight",
        "legs",
    ),
    (
        "Hang Power Snatch",
        "hang-power-snatch",
        "Snatch",
        "weightlifting",
        "ARRAY['weight','reps']",
        "weight",
        "legs",
    ),
    (
        "High Hang Snatch",
        "high-hang-snatch",
        "Snatch",
        "weightlifting",
        "ARRAY['weight','reps']",
        "weight",
        "legs",
    ),
    (
        "High Hang Power Snatch",
        "high-hang-power-snatch",
        "Snatch",
        "weightlifting",
        "ARRAY['weight','reps']",
        "weight",
        "legs",
    ),
    (
        "Muscle Snatch",
        "muscle-snatch",
        "Snatch",
        "weightlifting",
        "ARRAY['weight','reps']",
        "weight",
        "legs",
    ),
    (
        "Snatch Balance",
        "snatch-balance",
        "Snatch",
        "weightlifting",
        "ARRAY['weight','reps']",
        "weight",
        "legs",
    ),
    (
        "Snatch Pull",
        "snatch-pull",
        "Snatch",
        "weightlifting",
        "ARRAY['weight','reps']",
        "weight",
        "legs",
    ),
    (
        "Snatch Grip Deadlift",
        "snatch-grip-deadlift",
        "Snatch",
        "weightlifting",
        "ARRAY['weight','reps']",
        "weight",
        "legs",
    ),
    # ── Weightlifting: Clean family ──────────────────────────────────────────
    (
        "Power Clean",
        "power-clean",
        "Clean",
        "weightlifting",
        "ARRAY['weight','reps']",
        "weight",
        "legs",
    ),
    (
        "Hang Clean",
        "hang-clean",
        "Clean",
        "weightlifting",
        "ARRAY['weight','reps']",
        "weight",
        "legs",
    ),
    (
        "Hang Power Clean",
        "hang-power-clean",
        "Clean",
        "weightlifting",
        "ARRAY['weight','reps']",
        "weight",
        "legs",
    ),
    (
        "High Hang Clean",
        "high-hang-clean",
        "Clean",
        "weightlifting",
        "ARRAY['weight','reps']",
        "weight",
        "legs",
    ),
    (
        "High Hang Power Clean",
        "high-hang-power-clean",
        "Clean",
        "weightlifting",
        "ARRAY['weight','reps']",
        "weight",
        "legs",
    ),
    (
        "Muscle Clean",
        "muscle-clean",
        "Clean",
        "weightlifting",
        "ARRAY['weight','reps']",
        "weight",
        "legs",
    ),
    (
        "Clean Pull",
        "clean-pull",
        "Clean",
        "weightlifting",
        "ARRAY['weight','reps']",
        "weight",
        "legs",
    ),
    (
        "Clean Grip Deadlift",
        "clean-grip-deadlift",
        "Clean",
        "weightlifting",
        "ARRAY['weight','reps']",
        "weight",
        "legs",
    ),
    # ── Weightlifting: Jerk family ───────────────────────────────────────────
    (
        "Split Jerk",
        "split-jerk",
        "Jerk",
        "weightlifting",
        "ARRAY['weight','reps']",
        "weight",
        "push",
    ),
    ("Push Jerk", "push-jerk", "Jerk", "weightlifting", "ARRAY['weight','reps']", "weight", "push"),
    (
        "Power Jerk",
        "power-jerk",
        "Jerk",
        "weightlifting",
        "ARRAY['weight','reps']",
        "weight",
        "push",
    ),
    # ── Strength: Press family ───────────────────────────────────────────────
    ("Push Press", "push-press", "Press", "strength", "ARRAY['weight','reps']", "weight", "push"),
    # ── Strength: Deadlift variants ──────────────────────────────────────────
    (
        "Romanian Deadlift",
        "romanian-deadlift",
        "Deadlift",
        "strength",
        "ARRAY['weight','reps']",
        "weight",
        "legs",
    ),
    (
        "Sumo Deadlift",
        "sumo-deadlift",
        "Deadlift",
        "strength",
        "ARRAY['weight','reps']",
        "weight",
        "legs",
    ),
    (
        "Trap Bar Deadlift",
        "trap-bar-deadlift",
        "Deadlift",
        "strength",
        "ARRAY['weight','reps']",
        "weight",
        "legs",
    ),
    (
        "Good Morning",
        "good-morning",
        "Deadlift",
        "strength",
        "ARRAY['weight','reps']",
        "weight",
        "legs",
    ),
    # ── Strength: Squat variants ─────────────────────────────────────────────
    ("Box Squat", "box-squat", "Squat", "strength", "ARRAY['weight','reps']", "weight", "legs"),
    (
        "Goblet Squat",
        "goblet-squat",
        "Squat",
        "strength",
        "ARRAY['weight','reps']",
        "weight",
        "legs",
    ),
    (
        "Bulgarian Split Squat",
        "bulgarian-split-squat",
        "Squat",
        "strength",
        "ARRAY['weight','reps']",
        "weight",
        "legs",
    ),
    (
        "Zercher Squat",
        "zercher-squat",
        "Squat",
        "strength",
        "ARRAY['weight','reps']",
        "weight",
        "legs",
    ),
    # ── Gymnastics: Pull variants ────────────────────────────────────────────
    (
        "Chest-to-Bar Pull-Up",
        "chest-to-bar-pull-up",
        "Pull-Up",
        "gymnastics",
        "ARRAY['reps']",
        "reps",
        "pull",
    ),
    ("Bar Muscle-Up", "bar-muscle-up", "Muscle-Up", "gymnastics", "ARRAY['reps']", "reps", "pull"),
    ("Strict Pull-Up", "strict-pull-up", "Pull-Up", "gymnastics", "ARRAY['reps']", "reps", "pull"),
    (
        "Weighted Pull-Up",
        "weighted-pull-up",
        "Pull-Up",
        "gymnastics",
        "ARRAY['reps','weight']",
        "reps",
        "pull",
    ),
    ("Rope Climb", "rope-climb", "Rope Climb", "gymnastics", "ARRAY['reps']", "reps", "pull"),
    # ── Gymnastics: Push variants ────────────────────────────────────────────
    ("Push-Up", "push-up", "Push-Up", "gymnastics", "ARRAY['reps']", "reps", "push"),
    ("Ring Push-Up", "ring-push-up", "Push-Up", "gymnastics", "ARRAY['reps']", "reps", "push"),
    (
        "Strict Handstand Push-Up",
        "strict-handstand-push-up",
        "Push-Up",
        "gymnastics",
        "ARRAY['reps']",
        "reps",
        "push",
    ),
    ("Dip", "dip", "Dip", "gymnastics", "ARRAY['reps']", "reps", "push"),
    ("Ring Dip", "ring-dip", "Dip", "gymnastics", "ARRAY['reps']", "reps", "push"),
    # ── Gymnastics: Core / skill ─────────────────────────────────────────────
    ("Toes-to-Bar", "toes-to-bar", "Toes-to-Bar", "gymnastics", "ARRAY['reps']", "reps", "core"),
    (
        "Knees-to-Elbows",
        "knees-to-elbows",
        "Toes-to-Bar",
        "gymnastics",
        "ARRAY['reps']",
        "reps",
        "core",
    ),
    ("GHD Sit-Up", "ghd-sit-up", "GHD", "gymnastics", "ARRAY['reps']", "reps", "core"),
    ("Hip Extension", "hip-extension", "GHD", "gymnastics", "ARRAY['reps']", "reps", "legs"),
    ("L-Sit", "l-sit", "L-Sit", "gymnastics", "ARRAY['time']", "time", "core"),
    ("Wall Walk", "wall-walk", "Wall Walk", "gymnastics", "ARRAY['reps']", "reps", "push"),
    ("Pistol Squat", "pistol-squat", "Squat", "gymnastics", "ARRAY['reps']", "reps", "legs"),
    ("Wall Ball", "wall-ball", "Wall Ball", "gymnastics", "ARRAY['reps']", "reps", "legs"),
    # ── Plyometric ───────────────────────────────────────────────────────────
    ("Box Jump", "box-jump", "Box Jump", "plyometric", "ARRAY['reps']", "reps", "legs"),
    ("Box Jump Over", "box-jump-over", "Box Jump", "plyometric", "ARRAY['reps']", "reps", "legs"),
    ("Broad Jump", "broad-jump", "Jump", "plyometric", "ARRAY['reps']", "reps", "legs"),
    # ── Mono-structural ──────────────────────────────────────────────────────
    (
        "Assault Bike",
        "assault-bike",
        "Bike",
        "mono_structural",
        "ARRAY['calories','time','distance']",
        "calories",
        "conditioning",
    ),
    (
        "Bike Erg",
        "bike-erg",
        "Bike",
        "mono_structural",
        "ARRAY['calories','time','distance']",
        "calories",
        "conditioning",
    ),
    (
        "Ski Erg",
        "ski-erg",
        "Ski",
        "mono_structural",
        "ARRAY['calories','time','distance']",
        "calories",
        "conditioning",
    ),
    (
        "Double Under",
        "double-under",
        "Jump Rope",
        "mono_structural",
        "ARRAY['reps']",
        "reps",
        "conditioning",
    ),
    (
        "Single Under",
        "single-under",
        "Jump Rope",
        "mono_structural",
        "ARRAY['reps']",
        "reps",
        "conditioning",
    ),
    ("Burpee", "burpee", "Burpee", "mono_structural", "ARRAY['reps']", "reps", "conditioning"),
    (
        "Burpee Box Jump Over",
        "burpee-box-jump-over",
        "Burpee",
        "mono_structural",
        "ARRAY['reps']",
        "reps",
        "conditioning",
    ),
]


def upgrade() -> None:
    for (
        name,
        slug,
        base_movement,
        modality,
        result_types_expr,
        default_result_type,
        muscle_group,
    ) in _MOVEMENTS:
        dr_type_sql = f"'{default_result_type}'" if default_result_type else "NULL"
        mg_sql = f"'{muscle_group}'" if muscle_group else "NULL"
        op.execute(f"""
            INSERT INTO public.movements
                (name, slug, base_movement, modality,
                 default_result_types, default_result_type,
                 primary_muscle_group, is_official)
            VALUES (
                '{name}', '{slug}', '{base_movement}', '{modality}',
                {result_types_expr}, {dr_type_sql},
                {mg_sql}, true
            )
            ON CONFLICT (slug) DO NOTHING
        """)


def downgrade() -> None:
    slugs = ", ".join(f"'{slug}'" for _, slug, *_ in _MOVEMENTS)
    op.execute(f"""
        DELETE FROM public.movements
        WHERE slug IN ({slugs})
          AND is_official = true
    """)
