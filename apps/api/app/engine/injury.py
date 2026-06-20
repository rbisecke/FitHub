"""Injury train-around engine — fully deterministic, no LLM."""

from __future__ import annotations

CONTRAINDICATIONS: dict[str, list[str]] = {
    "shoulder": [
        "overhead_squat",
        "snatch",
        "push_jerk",
        "pull_up",
        "muscle_up",
        "handstand_pushup",
        "dip",
        "thruster",
    ],
    "knee": [
        "pistol_squat",
        "box_jump",
        "air_squat",
        "back_squat",
        "front_squat",
        "clean",
        "lunge",
    ],
    "lower_back": ["deadlift", "good_morning", "snatch", "clean", "ghr", "back_squat"],
    "wrist": ["handstand", "handstand_pushup", "muscle_up", "overhead_squat", "snatch"],
    "hip": ["pistol_squat", "clean", "snatch", "air_squat", "box_jump"],
    "elbow": ["muscle_up", "dip", "handstand_pushup", "overhead_squat"],
    "ankle": ["box_jump", "pistol_squat", "running", "double_under"],
    "neck": ["overhead_squat", "snatch", "push_jerk", "back_squat"],
    "other": [],
}

SUBSTITUTES: dict[tuple[str, str], list[str]] = {
    ("knee", "air_squat"): ["Goblet Squat (heel elevated)", "Box Squat", "Leg Press"],
    ("knee", "box_jump"): ["Step-up", "Seated Box Jump", "Bike Erg"],
    ("knee", "pistol_squat"): ["Assisted Pistol (TRX)", "Single-leg Press"],
    ("knee", "back_squat"): ["Goblet Squat", "Box Squat", "Leg Press"],
    ("knee", "front_squat"): ["Goblet Squat", "Safety Bar Squat"],
    ("knee", "lunge"): ["Step-up", "Hip Thrust", "Reverse Hyper"],
    ("shoulder", "pull_up"): ["Ring Row", "Lat Pulldown", "Banded Pull-apart"],
    ("shoulder", "push_jerk"): ["Dumbbell Push Press (light)", "Landmine Press"],
    ("shoulder", "thruster"): ["Dumbbell Front Squat", "Goblet Squat + Press (light)"],
    ("shoulder", "dip"): ["Tricep Pushdown", "Close-grip Bench (light)"],
    ("lower_back", "deadlift"): ["Trap Bar Deadlift", "Romanian DL (light)", "Kettlebell Swing"],
    ("lower_back", "back_squat"): ["Goblet Squat", "Box Squat (high)"],
    ("lower_back", "clean"): ["Dumbbell Power Clean", "Kettlebell Swing"],
    ("wrist", "handstand"): ["Pike Hold", "Shoulder Taps (fists)"],
    ("wrist", "muscle_up"): ["Banded Ring Row", "Lat Pulldown"],
    ("hip", "clean"): ["Dumbbell Power Clean", "Kettlebell Swing"],
    ("hip", "pistol_squat"): ["Step-up", "Single-leg Press"],
    ("ankle", "box_jump"): ["Step-up", "Seated Box Jump"],
    ("ankle", "running"): ["Bike Erg", "Row Erg", "Ski Erg"],
}

RED_FLAG_PATTERNS: list[str] = [
    "tore",
    "popped",
    "snapped",
    "numbness",
    "tingling",
    "radiating",
    "locked",
    "swollen",
    "can't move",
    "cannot move",
]


def has_red_flags(notes: str | None, pain_level: int) -> bool:
    if pain_level >= 8:
        return True
    if notes:
        lower = notes.lower()
        return any(flag in lower for flag in RED_FLAG_PATTERNS)
    return False


def resolve_substitution(body_region: str, movement_name: str) -> list[str]:
    key = (body_region, movement_name.lower().replace(" ", "_"))
    return SUBSTITUTES.get(key, [])


def get_contraindicated_movements(body_region: str) -> list[str]:
    return CONTRAINDICATIONS.get(body_region, [])
