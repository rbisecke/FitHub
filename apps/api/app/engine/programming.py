"""Deterministic programming KB and plan validator."""

from __future__ import annotations

from dataclasses import dataclass

# ── Volume landmarks (weekly sets per movement pattern) ───────────────────────

VOLUME_LANDMARKS: dict[str, dict[str, int]] = {
    "beginner": {"min": 6, "hypertrophy": 10, "max": 14},
    "intermediate": {"min": 8, "hypertrophy": 14, "max": 20},
    "advanced": {"min": 10, "hypertrophy": 18, "max": 25},
}

# ── Hard session limits ───────────────────────────────────────────────────────

MAX_HARD_DAYS_PER_WEEK = 4
MIN_REST_DAYS_PER_WEEK = 2

# ── Block length ranges (weeks) ───────────────────────────────────────────────

BLOCK_LENGTHS: dict[str, tuple[int, int]] = {
    "accumulation": (3, 5),
    "intensification": (2, 4),
    "deload": (1, 2),
    "peak": (1, 3),
}

# ── Intensity bands (%1RM) ────────────────────────────────────────────────────

INTENSITY_BANDS: dict[str, tuple[int, int]] = {
    "strength": (80, 95),
    "hypertrophy": (65, 80),
    "endurance": (50, 70),
}

# ── Gymnastics prerequisites ──────────────────────────────────────────────────

GYMNASTICS_PREREQS: dict[str, list[str]] = {
    "muscle_up": ["pull_up", "dip"],
    "handstand_pushup": ["pike_pushup", "wall_walk"],
    "bar_muscle_up": ["pull_up", "kipping_pull_up"],
}


@dataclass
class PlanValidationError:
    code: str
    message: str
    week: int | None = None


def validate_plan(plan: dict[str, object], training_age: str) -> list[PlanValidationError]:
    """Deterministic plan validation against KB constraints. Returns [] on pass."""
    errors: list[PlanValidationError] = []
    landmarks = VOLUME_LANDMARKS.get(training_age, VOLUME_LANDMARKS["intermediate"])

    weeks = plan.get("weeks", [])
    if not isinstance(weeks, list):
        return errors

    for week_num, week in enumerate(weeks, start=1):
        if not isinstance(week, dict):
            continue
        sessions = week.get("sessions", [])
        if not isinstance(sessions, list):
            continue

        hard_days = sum(
            1 for s in sessions if isinstance(s, dict) and s.get("intensity_level") == "hard"
        )
        if hard_days > MAX_HARD_DAYS_PER_WEEK:
            errors.append(
                PlanValidationError(
                    code="too_many_hard_days",
                    message=(
                        f"Week {week_num}: {hard_days} hard days > max {MAX_HARD_DAYS_PER_WEEK}"
                    ),
                    week=week_num,
                )
            )

        rest_days = sum(
            1
            for s in sessions
            if isinstance(s, dict) and s.get("session_type") in ("rest", "active_recovery")
        )
        if rest_days < MIN_REST_DAYS_PER_WEEK:
            errors.append(
                PlanValidationError(
                    code="insufficient_rest",
                    message=(
                        f"Week {week_num}: only {rest_days} rest days,"
                        f" need ≥ {MIN_REST_DAYS_PER_WEEK}"
                    ),
                    week=week_num,
                )
            )

        volume_by_pattern: dict[str, int] = {}
        for s in sessions:
            if not isinstance(s, dict):
                continue
            for item in s.get("items", []):
                if not isinstance(item, dict):
                    continue
                pattern = str(item.get("movement_pattern", "other"))
                sets = item.get("sets")
                volume_by_pattern[pattern] = volume_by_pattern.get(pattern, 0) + (
                    int(sets) if isinstance(sets, int) else 1
                )

        for pattern, sets in volume_by_pattern.items():
            if sets > landmarks["max"]:
                errors.append(
                    PlanValidationError(
                        code="volume_exceeded",
                        message=(
                            f"Week {week_num}: {pattern} volume {sets} > max {landmarks['max']}"
                        ),
                        week=week_num,
                    )
                )

    return errors
