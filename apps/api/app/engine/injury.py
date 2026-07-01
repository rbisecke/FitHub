"""Injury train-around engine — fully deterministic, no LLM."""

from __future__ import annotations

CONTRAINDICATIONS: dict[str, list[str]] = {
    # --- existing joint regions ---
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
    # --- muscle belly regions (new) ---
    "hamstring": [
        "deadlift",
        "romanian_deadlift",
        "good_morning",
        "glute_ham_raise",
        "sprint",
        "box_jump",
        "kipping_pullup",
        "clean",
        "snatch",
        "wall_ball",
        "toes_to_bar",
    ],
    "quad": [
        "front_squat",
        "back_squat",
        "lunge",
        "box_jump",
        "pistol_squat",
        "running",
        "sprint",
        "thruster",
        "wall_ball",
        "step_up",
    ],
    "calf": [
        "double_under",
        "box_jump",
        "running",
        "sprint",
        "rope_climb",
        "wall_walk",
        "wall_ball",
        "thruster",
    ],
    "glute": [
        "hip_thrust",
        "glute_ham_raise",
        "deadlift",
        "single_leg_deadlift",
        "lunge",
    ],
    "upper_back": [
        "back_squat",
        "deadlift",
        "clean",
        "snatch",
        "muscle_up",
    ],
    "chest": [
        "pushup",
        "ring_pushup",
        "dip",
        "muscle_up",
        "bench_press",
        "ring_dip",
        "wall_ball",
        "push_press",
        "thruster",
    ],
    "bicep": [
        "pull_up",
        "muscle_up",
        "ring_row",
        "clean",
        "barbell_curl",
        "rope_climb",
        "rowing",
    ],
    "tricep": [
        "dip",
        "pushup",
        "muscle_up",
        "handstand_pushup",
        "close_grip_bench",
        "push_press",
        "push_jerk",
        "thruster",
        "wall_walk",
        "overhead_squat",
    ],
    "lat": [
        "pull_up",
        "muscle_up",
        "ring_row",
        "barbell_row",
        "rope_climb",
        "lat_pulldown",
    ],
    # --- soft-tissue / connective structures (new) ---
    # iliopsoas / rectus femoris — distinct from hip joint/labrum
    "hip_flexor": [
        "kipping_pullup",
        "toes_to_bar",
        "ghd_situp",
        "running",
        "sprint",
        "lunge",
        "front_squat",
    ],
    # iliotibial band syndrome — chronic overuse, distinct from lateral knee ligament
    "it_band": [
        "running",
        "cycling",
        "box_jump",
        "lunge",
        "step_up",
        "pistol_squat",
    ],
    # wrist flexor/extensor tendons + grip — distinct from wrist joint
    "forearm": [
        "pull_up",
        "deadlift",
        "barbell_row",
        "rope_climb",
        "kettlebell_swing",
        "muscle_up",
        "ring_row",
        "farmer_carry",
    ],
}

SUBSTITUTES: dict[tuple[str, str], list[str]] = {
    # --- existing entries ---
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
    # --- hamstring ---
    ("hamstring", "deadlift"): [
        "Trap Bar Deadlift (reduced ROM)",
        "Rack Pull (mid-shin)",
        "Kettlebell Deadlift",
    ],
    ("hamstring", "romanian_deadlift"): [
        "Single-leg Press",
        "Hip Thrust (partial ROM)",
        "Leg Curl (machine, light)",
    ],
    ("hamstring", "clean"): ["Dumbbell Power Clean", "Kettlebell Swing (light)"],
    ("hamstring", "good_morning"): ["Cat-cow", "Banded Pull-through"],
    ("hamstring", "box_jump"): ["Step-up (slow eccentric)", "Bike Erg", "Seated Box Jump"],
    ("hamstring", "sprint"): ["Bike Erg (low resistance)", "Row Erg", "Ski Erg"],
    ("hamstring", "glute_ham_raise"): [
        "Nordic Curl (assisted)",
        "Hip Thrust",
        "Single-leg Bridge",
    ],
    ("hamstring", "wall_ball"): ["Dumbbell Thruster (light)", "Push Press", "Box Step-up"],
    # --- quad ---
    ("quad", "front_squat"): ["Goblet Squat (partial ROM)", "Box Squat", "Leg Press"],
    ("quad", "back_squat"): ["Goblet Squat", "Box Squat (high)", "Leg Press"],
    ("quad", "lunge"): ["Step-up", "Hip Thrust", "Reverse Hyper"],
    ("quad", "box_jump"): ["Step-up", "Seated Box Jump", "Bike Erg"],
    ("quad", "running"): ["Bike Erg", "Row Erg", "Ski Erg"],
    # --- calf ---
    ("calf", "double_under"): ["Single-unders", "Row Erg", "Bike Erg"],
    ("calf", "box_jump"): ["Step-up", "Seated Box Jump", "Bike Erg"],
    ("calf", "running"): ["Bike Erg", "Row Erg", "Ski Erg"],
    ("calf", "rope_climb"): ["Rope Pull (seated)", "Ring Row", "Lat Pulldown"],
    # --- glute ---
    ("glute", "hip_thrust"): ["Single-leg Bridge", "Clamshell", "Banded Lateral Walk"],
    ("glute", "deadlift"): [
        "Trap Bar Deadlift (glute-focus cues)",
        "Leg Press",
        "Romanian DL (light)",
    ],
    ("glute", "lunge"): ["Step-up", "Hip Thrust (light)", "Leg Press"],
    # --- chest ---
    ("chest", "pushup"): ["Ring Row", "Lat Pulldown", "Dumbbell Row"],
    ("chest", "dip"): ["Tricep Pushdown", "Lat Pulldown"],
    ("chest", "ring_dip"): ["Tricep Pushdown", "Banded Pushdown"],
    # --- bicep ---
    ("bicep", "pull_up"): [
        "Lat Pulldown (supinated, light)",
        "Ring Row (feet elevated)",
        "Banded Pull-apart",
    ],
    ("bicep", "rope_climb"): [
        "Rope Pull (seated, light)",
        "Lat Pulldown",
        "Ring Row",
    ],
    ("bicep", "rowing"): ["Leg-only Row Erg", "Bike Erg", "Ski Erg (arms-only light)"],
    # --- tricep ---
    ("tricep", "dip"): [
        "Tricep Pushdown",
        "Lat Pulldown",
        "Close-grip Bench (very light)",
    ],
    ("tricep", "handstand_pushup"): [
        "Pike Hold",
        "Dumbbell Press (light)",
        "Landmine Press",
    ],
    # --- lat ---
    ("lat", "pull_up"): ["Ring Row", "Lat Pulldown (light)", "Banded Pull-apart"],
    ("lat", "barbell_row"): [
        "Seated Cable Row",
        "Dumbbell Row (light)",
        "Ring Row",
    ],
    ("lat", "rope_climb"): ["Rope Pull (seated)", "Lat Pulldown", "Ring Row"],
    # --- hip_flexor ---
    ("hip_flexor", "toes_to_bar"): [
        "Hanging Knee Raise (slow)",
        "V-up (partial)",
        "Hollow Hold",
    ],
    ("hip_flexor", "ghd_situp"): ["Weighted Sit-up", "Hollow Rock", "Plank"],
    ("hip_flexor", "running"): ["Bike Erg", "Row Erg", "Ski Erg"],
    ("hip_flexor", "lunge"): ["Step-up", "Hip Thrust", "Leg Press"],
    # --- it_band ---
    ("it_band", "running"): ["Bike Erg", "Row Erg", "Swim"],
    ("it_band", "lunge"): ["Step-up (narrow)", "Hip Thrust", "Leg Press"],
    ("it_band", "box_jump"): ["Step-up", "Seated Box Jump", "Bike Erg"],
    # --- forearm (straps modifier pattern) ---
    ("forearm", "deadlift"): [
        "Deadlift with straps (full load OK — grip bypassed)",
        "Trap Bar Deadlift with straps",
        "Leg Press (no grip requirement)",
    ],
    ("forearm", "pull_up"): [
        "Pull-up with lifting straps",
        "Lat Pulldown with straps",
        "Ring Row (false-grip bypass)",
    ],
    ("forearm", "barbell_row"): [
        "Barbell Row with straps (full load OK)",
        "Cable Row with wrist cuff",
        "Dumbbell Row (neutral grip, light)",
    ],
    ("forearm", "rope_climb"): [
        "Rope Pull (seated, feet on floor)",
        "Lat Pulldown",
        "Ring Row",
    ],
    ("forearm", "farmer_carry"): [
        "Farmer Carry with straps",
        "Goblet Carry (wrist neutral)",
        "Suitcase Carry with strap",
    ],
    ("forearm", "kettlebell_swing"): [
        "Kettlebell Swing with straps",
        "Hip Thrust",
        "Glute Bridge",
    ],
}

# Regions where injuries are chronic/overuse conditions, not acute rupture events.
# For these regions, acute-rupture language in notes ("tore", "popped", "snapped")
# does NOT trigger requires_referral — only pain_level >= 8 does.
CHRONIC_REGIONS: frozenset[str] = frozenset({"it_band", "hip_flexor", "forearm"})

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


def has_red_flags(notes: str | None, pain_level: int, body_region: str = "") -> bool:
    if pain_level >= 8:
        return True
    if notes and body_region not in CHRONIC_REGIONS:
        lower = notes.lower()
        return any(flag in lower for flag in RED_FLAG_PATTERNS)
    return False


def resolve_substitution(body_region: str, movement_name: str) -> list[str]:
    key = (body_region, movement_name.lower().replace(" ", "_"))
    return SUBSTITUTES.get(key, [])


def get_contraindicated_movements(body_region: str) -> list[str]:
    return CONTRAINDICATIONS.get(body_region, [])
