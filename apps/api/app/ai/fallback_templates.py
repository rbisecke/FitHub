"""Static fallback plan templates (Tier 3 in the 3-tier retry chain).

These contain no user data — they are pure constants used when all LLM
attempts fail. One entry per archetype; the caller replicates the week
template across the requested plan duration.

Structure matches the legacy plan dict that _plan_fill_to_draft and
_create_plan_records consume.
"""

from __future__ import annotations

FALLBACK_SESSIONS: dict[str, dict[str, object]] = {
    "general-crossfit": {
        "mesocycles": [
            {
                "name": "Accumulation",
                "phase": "accumulation",
                "week_start": 1,
                "week_end": 4,
                "focus": None,
            },
            {"name": "Deload", "phase": "deload", "week_start": 5, "week_end": 6, "focus": None},
        ],
        "weeks": [
            {
                "week": 1,
                "sessions": [
                    {
                        "day_offset": 0,
                        "session_type": "strength",
                        "title": "Lower Push",
                        "intensity_level": "hard",
                        "items": [
                            {
                                "movement_name": "Back Squat",
                                "sets": 5,
                                "reps": "5",
                                "load_pct_1rm": 75.0,
                                "movement_pattern": "squat",
                                "notes": None,
                            },
                            {
                                "movement_name": "Romanian Deadlift",
                                "sets": 3,
                                "reps": "8",
                                "load_pct_1rm": 65.0,
                                "movement_pattern": "hinge",
                                "notes": None,
                            },
                            {
                                "movement_name": "Push-up",
                                "sets": 3,
                                "reps": "15",
                                "load_pct_1rm": None,
                                "movement_pattern": "push",
                                "notes": None,
                            },
                        ],
                    },
                    {
                        "day_offset": 2,
                        "session_type": "metcon",
                        "title": "Mixed Modal",
                        "intensity_level": "moderate",
                        "items": [
                            {
                                "movement_name": "Air Squat",
                                "sets": 3,
                                "reps": "21-15-9",
                                "load_pct_1rm": None,
                                "movement_pattern": "squat",
                                "notes": None,
                            },
                            {
                                "movement_name": "Push-up",
                                "sets": 3,
                                "reps": "21-15-9",
                                "load_pct_1rm": None,
                                "movement_pattern": "push",
                                "notes": None,
                            },
                            {
                                "movement_name": "Sit-up",
                                "sets": 3,
                                "reps": "21-15-9",
                                "load_pct_1rm": None,
                                "movement_pattern": "core",
                                "notes": None,
                            },
                        ],
                    },
                    {
                        "day_offset": 4,
                        "session_type": "strength",
                        "title": "Upper Pull",
                        "intensity_level": "hard",
                        "items": [
                            {
                                "movement_name": "Deadlift",
                                "sets": 5,
                                "reps": "3",
                                "load_pct_1rm": 80.0,
                                "movement_pattern": "hinge",
                                "notes": None,
                            },
                            {
                                "movement_name": "Pull-up",
                                "sets": 3,
                                "reps": "8",
                                "load_pct_1rm": None,
                                "movement_pattern": "pull",
                                "notes": None,
                            },
                            {
                                "movement_name": "Push-up",
                                "sets": 3,
                                "reps": "10",
                                "load_pct_1rm": None,
                                "movement_pattern": "push",
                                "notes": None,
                            },
                        ],
                    },
                ],
            }
        ],
    },
    "strength-bias": {
        "mesocycles": [
            {
                "name": "Hypertrophy",
                "phase": "accumulation",
                "week_start": 1,
                "week_end": 4,
                "focus": None,
            },
            {
                "name": "Strength",
                "phase": "intensification",
                "week_start": 5,
                "week_end": 8,
                "focus": None,
            },
            {"name": "Deload", "phase": "deload", "week_start": 9, "week_end": 10, "focus": None},
        ],
        "weeks": [
            {
                "week": 1,
                "sessions": [
                    {
                        "day_offset": 0,
                        "session_type": "strength",
                        "title": "Lower A",
                        "intensity_level": "hard",
                        "items": [
                            {
                                "movement_name": "Back Squat",
                                "sets": 5,
                                "reps": "5",
                                "load_pct_1rm": 80.0,
                                "movement_pattern": "squat",
                                "notes": None,
                            },
                            {
                                "movement_name": "Romanian Deadlift",
                                "sets": 4,
                                "reps": "6",
                                "load_pct_1rm": 70.0,
                                "movement_pattern": "hinge",
                                "notes": None,
                            },
                            {
                                "movement_name": "Lunge",
                                "sets": 3,
                                "reps": "10",
                                "load_pct_1rm": None,
                                "movement_pattern": "squat",
                                "notes": None,
                            },
                        ],
                    },
                    {
                        "day_offset": 2,
                        "session_type": "strength",
                        "title": "Upper A",
                        "intensity_level": "hard",
                        "items": [
                            {
                                "movement_name": "Bench Press",
                                "sets": 5,
                                "reps": "5",
                                "load_pct_1rm": 80.0,
                                "movement_pattern": "push",
                                "notes": None,
                            },
                            {
                                "movement_name": "Barbell Row",
                                "sets": 4,
                                "reps": "6",
                                "load_pct_1rm": 70.0,
                                "movement_pattern": "pull",
                                "notes": None,
                            },
                            {
                                "movement_name": "Push-up",
                                "sets": 3,
                                "reps": "10",
                                "load_pct_1rm": None,
                                "movement_pattern": "push",
                                "notes": None,
                            },
                        ],
                    },
                    {
                        "day_offset": 4,
                        "session_type": "strength",
                        "title": "Lower B",
                        "intensity_level": "moderate",
                        "items": [
                            {
                                "movement_name": "Deadlift",
                                "sets": 5,
                                "reps": "5",
                                "load_pct_1rm": 80.0,
                                "movement_pattern": "hinge",
                                "notes": None,
                            },
                            {
                                "movement_name": "Air Squat",
                                "sets": 3,
                                "reps": "15",
                                "load_pct_1rm": None,
                                "movement_pattern": "squat",
                                "notes": None,
                            },
                            {
                                "movement_name": "Sit-up",
                                "sets": 3,
                                "reps": "15",
                                "load_pct_1rm": None,
                                "movement_pattern": "core",
                                "notes": None,
                            },
                        ],
                    },
                ],
            }
        ],
    },
    "travel-minimal": {
        "mesocycles": [
            {
                "name": "Base",
                "phase": "accumulation",
                "week_start": 1,
                "week_end": 4,
                "focus": None,
            },
            {"name": "Deload", "phase": "deload", "week_start": 5, "week_end": 6, "focus": None},
        ],
        "weeks": [
            {
                "week": 1,
                "sessions": [
                    {
                        "day_offset": 0,
                        "session_type": "metcon",
                        "title": "Push Day",
                        "intensity_level": "hard",
                        "items": [
                            {
                                "movement_name": "Push-up",
                                "sets": 5,
                                "reps": "15",
                                "load_pct_1rm": None,
                                "movement_pattern": "push",
                                "notes": None,
                            },
                            {
                                "movement_name": "Air Squat",
                                "sets": 5,
                                "reps": "20",
                                "load_pct_1rm": None,
                                "movement_pattern": "squat",
                                "notes": None,
                            },
                            {
                                "movement_name": "Burpee",
                                "sets": 3,
                                "reps": "10",
                                "load_pct_1rm": None,
                                "movement_pattern": "total",
                                "notes": None,
                            },
                        ],
                    },
                    {
                        "day_offset": 2,
                        "session_type": "metcon",
                        "title": "Hinge Day",
                        "intensity_level": "moderate",
                        "items": [
                            {
                                "movement_name": "Good Morning",
                                "sets": 4,
                                "reps": "12",
                                "load_pct_1rm": None,
                                "movement_pattern": "hinge",
                                "notes": None,
                            },
                            {
                                "movement_name": "Sit-up",
                                "sets": 4,
                                "reps": "20",
                                "load_pct_1rm": None,
                                "movement_pattern": "core",
                                "notes": None,
                            },
                            {
                                "movement_name": "Burpee",
                                "sets": 3,
                                "reps": "8",
                                "load_pct_1rm": None,
                                "movement_pattern": "total",
                                "notes": None,
                            },
                        ],
                    },
                    {
                        "day_offset": 4,
                        "session_type": "conditioning",
                        "title": "Cardio",
                        "intensity_level": "moderate",
                        "items": [
                            {
                                "movement_name": "Burpee",
                                "sets": 4,
                                "reps": "15",
                                "load_pct_1rm": None,
                                "movement_pattern": "total",
                                "notes": None,
                            },
                            {
                                "movement_name": "Mountain Climber",
                                "sets": 4,
                                "reps": "30",
                                "load_pct_1rm": None,
                                "movement_pattern": "core",
                                "notes": None,
                            },
                            {
                                "movement_name": "Air Squat",
                                "sets": 3,
                                "reps": "20",
                                "load_pct_1rm": None,
                                "movement_pattern": "squat",
                                "notes": None,
                            },
                        ],
                    },
                ],
            }
        ],
    },
    "aerobic-base": {
        "mesocycles": [
            {
                "name": "Aerobic Development",
                "phase": "accumulation",
                "week_start": 1,
                "week_end": 6,
                "focus": None,
            },
            {"name": "Deload", "phase": "deload", "week_start": 7, "week_end": 8, "focus": None},
        ],
        "weeks": [
            {
                "week": 1,
                "sessions": [
                    {
                        "day_offset": 0,
                        "session_type": "conditioning",
                        "title": "Zone 2 A",
                        "intensity_level": "easy",
                        "items": [
                            {
                                "movement_name": "Row",
                                "sets": 1,
                                "reps": "20:00",
                                "load_pct_1rm": None,
                                "movement_pattern": "cardio",
                                "notes": "Zone 2 pace",
                            },
                            {
                                "movement_name": "Air Squat",
                                "sets": 3,
                                "reps": "15",
                                "load_pct_1rm": None,
                                "movement_pattern": "squat",
                                "notes": None,
                            },
                            {
                                "movement_name": "Push-up",
                                "sets": 3,
                                "reps": "10",
                                "load_pct_1rm": None,
                                "movement_pattern": "push",
                                "notes": None,
                            },
                        ],
                    },
                    {
                        "day_offset": 2,
                        "session_type": "conditioning",
                        "title": "Mixed Modal",
                        "intensity_level": "moderate",
                        "items": [
                            {
                                "movement_name": "Burpee",
                                "sets": 5,
                                "reps": "10",
                                "load_pct_1rm": None,
                                "movement_pattern": "total",
                                "notes": None,
                            },
                            {
                                "movement_name": "Air Squat",
                                "sets": 5,
                                "reps": "15",
                                "load_pct_1rm": None,
                                "movement_pattern": "squat",
                                "notes": None,
                            },
                            {
                                "movement_name": "Sit-up",
                                "sets": 5,
                                "reps": "15",
                                "load_pct_1rm": None,
                                "movement_pattern": "core",
                                "notes": None,
                            },
                        ],
                    },
                    {
                        "day_offset": 4,
                        "session_type": "conditioning",
                        "title": "Zone 2 B",
                        "intensity_level": "easy",
                        "items": [
                            {
                                "movement_name": "Row",
                                "sets": 1,
                                "reps": "25:00",
                                "load_pct_1rm": None,
                                "movement_pattern": "cardio",
                                "notes": "Zone 2 pace",
                            },
                            {
                                "movement_name": "Sit-up",
                                "sets": 3,
                                "reps": "20",
                                "load_pct_1rm": None,
                                "movement_pattern": "core",
                                "notes": None,
                            },
                            {
                                "movement_name": "Burpee",
                                "sets": 3,
                                "reps": "8",
                                "load_pct_1rm": None,
                                "movement_pattern": "total",
                                "notes": None,
                            },
                        ],
                    },
                ],
            }
        ],
    },
    "bodyweight-calisthenics": {
        "mesocycles": [
            {
                "name": "Skill Foundation",
                "phase": "accumulation",
                "week_start": 1,
                "week_end": 4,
                "focus": None,
            },
            {
                "name": "Volume",
                "phase": "intensification",
                "week_start": 5,
                "week_end": 8,
                "focus": None,
            },
            {"name": "Deload", "phase": "deload", "week_start": 9, "week_end": 10, "focus": None},
        ],
        "weeks": [
            {
                "week": 1,
                "sessions": [
                    {
                        "day_offset": 0,
                        "session_type": "strength",
                        "title": "Push Focus",
                        "intensity_level": "hard",
                        "items": [
                            {
                                "movement_name": "Push-up",
                                "sets": 5,
                                "reps": "15",
                                "load_pct_1rm": None,
                                "movement_pattern": "push",
                                "notes": "Full ROM",
                            },
                            {
                                "movement_name": "Tricep Dip",
                                "sets": 4,
                                "reps": "12",
                                "load_pct_1rm": None,
                                "movement_pattern": "push",
                                "notes": None,
                            },
                            {
                                "movement_name": "Plank",
                                "sets": 3,
                                "reps": "60s",
                                "load_pct_1rm": None,
                                "movement_pattern": "core",
                                "notes": None,
                            },
                        ],
                    },
                    {
                        "day_offset": 2,
                        "session_type": "strength",
                        "title": "Pull Focus",
                        "intensity_level": "hard",
                        "items": [
                            {
                                "movement_name": "Pull-up",
                                "sets": 5,
                                "reps": "8",
                                "load_pct_1rm": None,
                                "movement_pattern": "pull",
                                "notes": None,
                            },
                            {
                                "movement_name": "Inverted Row",
                                "sets": 4,
                                "reps": "10",
                                "load_pct_1rm": None,
                                "movement_pattern": "pull",
                                "notes": None,
                            },
                            {
                                "movement_name": "Sit-up",
                                "sets": 3,
                                "reps": "20",
                                "load_pct_1rm": None,
                                "movement_pattern": "core",
                                "notes": None,
                            },
                        ],
                    },
                    {
                        "day_offset": 4,
                        "session_type": "strength",
                        "title": "Legs Focus",
                        "intensity_level": "moderate",
                        "items": [
                            {
                                "movement_name": "Air Squat",
                                "sets": 5,
                                "reps": "20",
                                "load_pct_1rm": None,
                                "movement_pattern": "squat",
                                "notes": None,
                            },
                            {
                                "movement_name": "Lunge",
                                "sets": 4,
                                "reps": "12",
                                "load_pct_1rm": None,
                                "movement_pattern": "squat",
                                "notes": None,
                            },
                            {
                                "movement_name": "Burpee",
                                "sets": 3,
                                "reps": "10",
                                "load_pct_1rm": None,
                                "movement_pattern": "total",
                                "notes": None,
                            },
                        ],
                    },
                ],
            }
        ],
    },
    "skill-acquisition": {
        "mesocycles": [
            {
                "name": "Prerequisite Strength",
                "phase": "accumulation",
                "week_start": 1,
                "week_end": 4,
                "focus": None,
            },
            {
                "name": "Skill Practice",
                "phase": "intensification",
                "week_start": 5,
                "week_end": 8,
                "focus": None,
            },
            {"name": "Deload", "phase": "deload", "week_start": 9, "week_end": 10, "focus": None},
        ],
        "weeks": [
            {
                "week": 1,
                "sessions": [
                    {
                        "day_offset": 0,
                        "session_type": "skill",
                        "title": "Skill Day A",
                        "intensity_level": "moderate",
                        "items": [
                            {
                                "movement_name": "Pull-up",
                                "sets": 5,
                                "reps": "5",
                                "load_pct_1rm": None,
                                "movement_pattern": "pull",
                                "notes": "Strict",
                            },
                            {
                                "movement_name": "Ring Row",
                                "sets": 4,
                                "reps": "8",
                                "load_pct_1rm": None,
                                "movement_pattern": "pull",
                                "notes": None,
                            },
                            {
                                "movement_name": "Hollow Hold",
                                "sets": 3,
                                "reps": "30s",
                                "load_pct_1rm": None,
                                "movement_pattern": "core",
                                "notes": None,
                            },
                        ],
                    },
                    {
                        "day_offset": 2,
                        "session_type": "strength",
                        "title": "Strength Support",
                        "intensity_level": "hard",
                        "items": [
                            {
                                "movement_name": "Push-up",
                                "sets": 4,
                                "reps": "12",
                                "load_pct_1rm": None,
                                "movement_pattern": "push",
                                "notes": None,
                            },
                            {
                                "movement_name": "Air Squat",
                                "sets": 4,
                                "reps": "15",
                                "load_pct_1rm": None,
                                "movement_pattern": "squat",
                                "notes": None,
                            },
                            {
                                "movement_name": "Sit-up",
                                "sets": 3,
                                "reps": "20",
                                "load_pct_1rm": None,
                                "movement_pattern": "core",
                                "notes": None,
                            },
                        ],
                    },
                    {
                        "day_offset": 4,
                        "session_type": "skill",
                        "title": "Skill Day B",
                        "intensity_level": "moderate",
                        "items": [
                            {
                                "movement_name": "Pull-up",
                                "sets": 4,
                                "reps": "3",
                                "load_pct_1rm": None,
                                "movement_pattern": "pull",
                                "notes": "Focus on lat engagement",
                            },
                            {
                                "movement_name": "Push-up",
                                "sets": 3,
                                "reps": "10",
                                "load_pct_1rm": None,
                                "movement_pattern": "push",
                                "notes": None,
                            },
                            {
                                "movement_name": "Hollow Hold",
                                "sets": 3,
                                "reps": "20s",
                                "load_pct_1rm": None,
                                "movement_pattern": "core",
                                "notes": None,
                            },
                        ],
                    },
                ],
            }
        ],
    },
    "one-rm-peak": {
        "mesocycles": [
            {
                "name": "Volume",
                "phase": "accumulation",
                "week_start": 1,
                "week_end": 3,
                "focus": None,
            },
            {
                "name": "Intensification",
                "phase": "intensification",
                "week_start": 4,
                "week_end": 6,
                "focus": None,
            },
            {"name": "Peak", "phase": "peak", "week_start": 7, "week_end": 8, "focus": None},
            {
                "name": "Deload + Test",
                "phase": "deload",
                "week_start": 9,
                "week_end": 10,
                "focus": None,
            },
        ],
        "weeks": [
            {
                "week": 1,
                "sessions": [
                    {
                        "day_offset": 0,
                        "session_type": "strength",
                        "title": "Main Lift A",
                        "intensity_level": "hard",
                        "items": [
                            {
                                "movement_name": "Back Squat",
                                "sets": 5,
                                "reps": "5",
                                "load_pct_1rm": 75.0,
                                "movement_pattern": "squat",
                                "notes": None,
                            },
                            {
                                "movement_name": "Romanian Deadlift",
                                "sets": 3,
                                "reps": "8",
                                "load_pct_1rm": 60.0,
                                "movement_pattern": "hinge",
                                "notes": None,
                            },
                            {
                                "movement_name": "Lunge",
                                "sets": 3,
                                "reps": "10",
                                "load_pct_1rm": None,
                                "movement_pattern": "squat",
                                "notes": None,
                            },
                        ],
                    },
                    {
                        "day_offset": 2,
                        "session_type": "strength",
                        "title": "Accessory",
                        "intensity_level": "moderate",
                        "items": [
                            {
                                "movement_name": "Push-up",
                                "sets": 4,
                                "reps": "12",
                                "load_pct_1rm": None,
                                "movement_pattern": "push",
                                "notes": None,
                            },
                            {
                                "movement_name": "Pull-up",
                                "sets": 4,
                                "reps": "8",
                                "load_pct_1rm": None,
                                "movement_pattern": "pull",
                                "notes": None,
                            },
                            {
                                "movement_name": "Sit-up",
                                "sets": 3,
                                "reps": "15",
                                "load_pct_1rm": None,
                                "movement_pattern": "core",
                                "notes": None,
                            },
                        ],
                    },
                    {
                        "day_offset": 4,
                        "session_type": "strength",
                        "title": "Main Lift B",
                        "intensity_level": "hard",
                        "items": [
                            {
                                "movement_name": "Deadlift",
                                "sets": 5,
                                "reps": "5",
                                "load_pct_1rm": 80.0,
                                "movement_pattern": "hinge",
                                "notes": None,
                            },
                            {
                                "movement_name": "Air Squat",
                                "sets": 3,
                                "reps": "15",
                                "load_pct_1rm": None,
                                "movement_pattern": "squat",
                                "notes": None,
                            },
                            {
                                "movement_name": "Push-up",
                                "sets": 3,
                                "reps": "10",
                                "load_pct_1rm": None,
                                "movement_pattern": "push",
                                "notes": None,
                            },
                        ],
                    },
                ],
            }
        ],
    },
}
