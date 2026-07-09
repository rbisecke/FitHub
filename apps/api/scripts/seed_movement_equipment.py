"""Seed equipment_required for existing movements in the catalog.

Usage:
    DATABASE_URL=postgresql://... uv run python apps/api/scripts/seed_movement_equipment.py

The script is idempotent: re-running it overwrites with the same values.
Runs as a human admin operation after migration 0068, not at app startup.
"""

from __future__ import annotations

import os
import sys

import psycopg

DB_DSN = os.environ.get("DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:54322/postgres")

VALID_TAGS: frozenset[str] = frozenset(
    {
        "barbell",
        "rack",
        "dumbbells",
        "kettlebell",
        "pull_up_bar",
        "rings",
        "rower",
        "bike",
        "ski",
        "bodyweight",
        "jump_rope",
        "resistance_band",
    }
)

# Maps movement name (exact, as stored in the DB) to the list of equipment tags
# required to perform it.
# Tags: barbell, rack, dumbbells, kettlebell, pull_up_bar, rings,
#        rower, bike, ski, bodyweight, jump_rope, resistance_band
EQUIPMENT: dict[str, list[str]] = {
    # ── Barbell strength ─────────────────────────────────────────────────────
    "Back Squat": ["barbell", "rack"],
    "Front Squat": ["barbell", "rack"],
    "Overhead Squat": ["barbell"],
    "Deadlift": ["barbell"],
    "Romanian Deadlift": ["barbell"],
    "Sumo Deadlift": ["barbell"],
    "Good Morning": ["barbell"],
    "Strict Press": ["barbell"],
    "Push Press": ["barbell"],
    "Push Jerk": ["barbell"],
    "Split Jerk": ["barbell"],
    "Bench Press": ["barbell", "rack"],
    "Barbell Row": ["barbell"],
    "Pendlay Row": ["barbell"],
    "Barbell Hip Thrust": ["barbell"],
    "Zercher Squat": ["barbell"],
    # ── Weightlifting ────────────────────────────────────────────────────────
    "Snatch": ["barbell"],
    "Power Snatch": ["barbell"],
    "Hang Snatch": ["barbell"],
    "Hang Power Snatch": ["barbell"],
    "Clean": ["barbell"],
    "Power Clean": ["barbell"],
    "Hang Clean": ["barbell"],
    "Hang Power Clean": ["barbell"],
    "Clean and Jerk": ["barbell"],
    "Squat Clean": ["barbell"],
    "Muscle Snatch": ["barbell"],
    # ── Gymnastics / pull_up_bar ─────────────────────────────────────────────
    "Pull-Up": ["pull_up_bar"],
    "Chest-to-Bar Pull-Up": ["pull_up_bar"],
    "Toes-to-Bar": ["pull_up_bar"],
    "Hanging Knee Raise": ["pull_up_bar"],
    "Bar Muscle-Up": ["pull_up_bar"],
    "Kipping Pull-Up": ["pull_up_bar"],
    # ── Gymnastics / rings ────────────────────────────────────────────────────
    "Ring Dip": ["rings"],
    "Ring Muscle-Up": ["rings"],
    "Ring Row": ["rings"],
    "Ring Push-Up": ["rings"],
    "False Grip Ring Row": ["rings"],
    # ── Bodyweight only ───────────────────────────────────────────────────────
    "Air Squat": ["bodyweight"],
    "Push-Up": ["bodyweight"],
    "Burpee": ["bodyweight"],
    "Box Jump": ["bodyweight"],
    "Sit-Up": ["bodyweight"],
    "GHD Sit-Up": ["bodyweight"],
    "Handstand Push-Up": ["bodyweight"],
    "Pistol Squat": ["bodyweight"],
    "Lunge": ["bodyweight"],
    "Step-Up": ["bodyweight"],
    "Broad Jump": ["bodyweight"],
    "V-Up": ["bodyweight"],
    "Plank": ["bodyweight"],
    "Superman": ["bodyweight"],
    "Hip Extension": ["bodyweight"],
    "Dip": ["bodyweight"],
    # ── Dumbbells ─────────────────────────────────────────────────────────────
    "Dumbbell Thruster": ["dumbbells"],
    "Dumbbell Snatch": ["dumbbells"],
    "Dumbbell Clean": ["dumbbells"],
    "Dumbbell Deadlift": ["dumbbells"],
    "Dumbbell Press": ["dumbbells"],
    "Dumbbell Row": ["dumbbells"],
    "Dumbbell Lunge": ["dumbbells"],
    "Dumbbell Box Step-Up": ["dumbbells"],
    # ── Kettlebell ────────────────────────────────────────────────────────────
    "Kettlebell Swing": ["kettlebell"],
    "Kettlebell Clean": ["kettlebell"],
    "Kettlebell Press": ["kettlebell"],
    "Kettlebell Snatch": ["kettlebell"],
    "Turkish Get-Up": ["kettlebell"],
    "Kettlebell Row": ["kettlebell"],
    "Kettlebell Goblet Squat": ["kettlebell"],
    # ── Cardio machines ───────────────────────────────────────────────────────
    "Row": ["rower"],
    "Assault Bike": ["bike"],
    "Echo Bike": ["bike"],
    "Ski Erg": ["ski"],
    # ── Jump rope ─────────────────────────────────────────────────────────────
    "Double-Under": ["jump_rope"],
    "Single-Under": ["jump_rope"],
    # ── Resistance band ───────────────────────────────────────────────────────
    "Banded Pull-Apart": ["resistance_band"],
    "Banded Distraction": ["resistance_band"],
    "Banded Good Morning": ["resistance_band"],
    # ── Barbell combos and medball ─────────────────────────────────────────────
    "Thruster": ["barbell"],
    "Wall Ball": ["bodyweight"],  # med ball counted as bodyweight-adjacent
}


def validate_tags(equipment: dict[str, list[str]]) -> None:
    """Raise ValueError if any tag in the seed dict is not in VALID_TAGS."""
    bad: list[str] = []
    for movement, tags in equipment.items():
        for tag in tags:
            if tag not in VALID_TAGS:
                bad.append(f"  '{movement}': invalid tag '{tag}'")
    if bad:
        raise ValueError("Invalid equipment tags found:\n" + "\n".join(bad))


def seed(conn: psycopg.Connection) -> None:  # type: ignore[type-arg]
    """Run the equipment seed inside the provided connection's transaction."""
    rows = [(tags, name) for name, tags in EQUIPMENT.items()]

    with conn.cursor() as cur:
        cur.executemany(
            """
            UPDATE public.movements
            SET    equipment_required = %s
            WHERE  LOWER(name) = LOWER(%s)
            """,
            rows,
        )
        updated = cur.rowcount

    # Check which names had no matching row in the DB.
    names_lower = [n.lower() for n in EQUIPMENT]
    with conn.cursor() as cur:
        cur.execute(
            "SELECT LOWER(name) FROM public.movements WHERE LOWER(name) = ANY(%s)",
            (names_lower,),
        )
        found_lower = {row[0] for row in cur.fetchall()}

    missing = [n for n in EQUIPMENT if n.lower() not in found_lower]
    for name in missing:
        print(
            f"WARNING: movement not found in DB (name mismatch?): '{name}'",
            file=sys.stderr,
        )

    print(f"Updated {updated} rows across {len(rows)} movements ({len(missing)} warnings).")


def main() -> None:
    validate_tags(EQUIPMENT)

    try:
        with psycopg.connect(DB_DSN) as conn:
            try:
                seed(conn)
                conn.commit()
            except Exception:
                conn.rollback()
                raise
    except psycopg.Error as exc:
        print(f"Database error: {exc}", file=sys.stderr)
        sys.exit(1)
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
