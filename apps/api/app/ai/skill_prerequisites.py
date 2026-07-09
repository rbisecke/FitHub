"""Skill prerequisite chains and history builder for skill-acquisition plans."""

from __future__ import annotations

import logging

import psycopg
import psycopg.rows

from app.ai.plan_generator import build_user_history

log = logging.getLogger(__name__)

# Ordered prerequisite chains for each target skill.
# The list runs from entry-level prerequisite to the target skill (last element).
# The LLM is told where in the chain the athlete currently sits; it programmes
# from that point forward.
SKILL_PREREQUISITES: dict[str, list[str]] = {
    # ── Tier 1: common CrossFit milestone skills ───────────────────────────────
    "bar-muscle-up": [
        "Strict Pull-Up",
        "Chest-to-Bar Pull-Up",  # strict
        "Kipping Pull-Up",
        "Kipping Chest-to-Bar Pull-Up",
        "Bar Muscle-Up",
    ],
    "ring-muscle-up": [
        "Ring Row",
        "Strict Pull-Up",
        "Ring Dip",
        "Kipping Pull-Up",
        "False Grip Ring Row",
        "Strict Ring Muscle-Up",
        "Ring Muscle-Up",
    ],
    "handstand-walk": [
        "Pike Push-Up",
        "Wall Walk",
        "Handstand Hold (Wall)",
        "Handstand Hold (Freestanding)",
        "Handstand Walk",
    ],
    "double-under": [
        "Single-Under",
        "Power Jump (penguin)",
        "Double Under",
    ],
    "kipping-pull-up": [
        "Dead Hang",
        "Scapular Pull-Up",
        "Strict Pull-Up",
        "Kip Swing",
        "Kipping Pull-Up",
    ],
    "toes-to-bar": [
        "Hanging Knee Raise",
        "Hanging Leg Raise",
        "Kip Swing",
        "Toes-to-Bar",
    ],
    "snatch": [
        "Overhead Squat",
        "Snatch Balance",
        "Hang Power Snatch",
        "Hang Squat Snatch",
        "Power Snatch",
        "Snatch",
    ],
    "clean-and-jerk": [
        "Front Squat",
        "Hang Power Clean",
        "Hang Squat Clean",
        "Power Clean",
        "Squat Clean",
        "Push Jerk",
        "Split Jerk",
        "Clean and Jerk",
    ],
    # ── Tier 2: advanced / specialist skills ──────────────────────────────────
    "handstand-push-up-kipping": [
        "Pike Push-Up",
        "Handstand Hold (Wall)",
        "Strict Handstand Push-Up",
        "Kip Swing",
        "Kipping Handstand Push-Up",
    ],
    "legless-rope-climb": [
        "Ring Row",
        "Strict Pull-Up",
        "Rope Climb (feet)",
        "Legless Rope Climb",
    ],
    "pistol-squat": [
        "Air Squat",
        "Bulgarian Split Squat",
        "Shrimp Squat",
        "Assisted Pistol Squat",
        "Pistol Squat",
    ],
    "overhead-squat": [
        "PVC Overhead Squat",
        "Barbell Overhead Squat",  # empty bar
        "Overhead Squat",
    ],
    "split-jerk": [
        "Push Press",
        "Push Jerk",
        "Split Jerk (footwork drill)",
        "Split Jerk",
    ],
    "turkish-get-up": [
        "Goblet Squat",
        "Half Turkish Get-Up",
        "Turkish Get-Up (light)",
        "Turkish Get-Up",
    ],
}


async def build_user_history_skill(
    user_id: str,
    db: psycopg.AsyncConnection[object],
    target_skill: str,
) -> dict[str, object]:
    """Extend the base history with prerequisite-chain awareness for skill-acquisition.

    Queries recent workouts for the target movement and all prerequisites in
    the chain, then determines where in the progression the athlete currently
    sits. Returns the standard history dict augmented with a 'skill_context' key.

    All movement names written into the returned dict come from SKILL_PREREQUISITES
    (not user input), so no XML sandboxing is needed for those values. The
    user_id is only used as a parameterized query argument, never interpolated
    into strings returned to callers.
    """
    history = await build_user_history(user_id, db)

    chain = SKILL_PREREQUISITES.get(target_skill)
    if not chain:
        # Unknown skill slug — return base history unchanged
        log.warning("build_user_history_skill: unknown target_skill=%r", target_skill)
        return history

    # Pull distinct movement names logged by this user in the last 90 days.
    # Parameterized query; user_id never appears in the output string.
    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            """
            SELECT DISTINCT m.name
            FROM results r
            JOIN movements m ON m.id = r.movement_id
            JOIN workouts w ON w.id = r.workout_id
            WHERE w.user_id = %s
              AND w.performed_at::date >= CURRENT_DATE - INTERVAL '90 days'
            LIMIT 500
            """,
            [user_id],
        )
        logged_names = {row["name"] for row in await cur.fetchall()}

    # Walk the chain; current entry point is the first prerequisite not yet logged.
    current_position = chain[0]  # default: start from the beginning
    for movement in chain:
        if movement not in logged_names:
            current_position = movement
            break
    else:
        # All prerequisites confirmed — athlete is ready to work the skill directly.
        current_position = chain[-1]

    confirmed = [m for m in chain if m in logged_names]

    history["skill_context"] = {
        "target_skill": target_skill,
        "prerequisite_chain": chain,
        "confirmed_prerequisites": confirmed,
        "current_entry_point": current_position,
    }
    return history
