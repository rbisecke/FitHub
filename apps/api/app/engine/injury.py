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
        "push_press",
        "strict_press",
        "handstand_walk",
    ],
    "knee": [
        "pistol_squat",
        "box_jump",
        "air_squat",
        "back_squat",
        "front_squat",
        "clean",
        "lunge",
        "running",
        "wall_ball",
        "thruster",
        "double_under",
    ],
    "lower_back": [
        "deadlift",
        "good_morning",
        "snatch",
        "clean",
        "ghr",
        "back_squat",
        "sit_up",
        "ghd_situp",
        "toes_to_bar",
        "rowing",
        "kettlebell_swing",
        "burpee",
    ],
    "wrist": ["handstand", "handstand_pushup", "muscle_up", "overhead_squat", "snatch"],
    "hip": [
        "pistol_squat",
        "clean",
        "snatch",
        "air_squat",
        "box_jump",
        "deadlift",
        "front_squat",
        "back_squat",
        "lunge",
        "running",
        "sumo_deadlift",
    ],
    "elbow": [
        "muscle_up",
        "dip",
        "handstand_pushup",
        "overhead_squat",
        "pull_up",
        "ring_row",
        "rope_climb",
        "push_press",
        "farmer_carry",
    ],
    "ankle": ["box_jump", "pistol_squat", "running", "double_under"],
    "neck": ["overhead_squat", "snatch", "push_jerk", "back_squat"],
    "other": [],
    # --- muscle belly regions ---
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
        "back_squat",
        "box_jump",
        "sprint",
        "running",
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
    # --- soft-tissue / connective structures ---
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
    # --- foot / plantar ---
    "arch": [
        "box_jump",
        "double_under",
        "single_under",
        "running",
        "rope_climb",
        "wall_walk",
        "burpee",
        "walking_lunge",
    ],
    "achilles": [
        "box_jump",
        "double_under",
        "single_under",
        "running",
        "sprint",
        "rope_climb",
        "wall_ball",
        "burpee",
        "pistol_squat",
    ],
    "shin": [
        "running",
        "sprint",
        "double_under",
        "single_under",
        "box_jump",
        "burpee",
        "wall_ball",
    ],
    # --- tendon / soft tissue additions ---
    "patellar_tendon": [
        "box_jump",
        "double_under",
        "running",
        "lunge",
        "wall_ball",
        "thruster",
        "pistol_squat",
        "back_squat",
        "front_squat",
        "burpee",
        "step_up",
    ],
    "rotator_cuff": [
        "strict_press",
        "push_press",
        "push_jerk",
        "split_jerk",
        "overhead_squat",
        "snatch",
        "handstand",
        "handstand_pushup",
        "handstand_walk",
        "thruster",
        "kipping_pullup",
        "muscle_up",
        "dip",
        "ring_dip",
    ],
    "lateral_elbow": [
        "barbell_row",
        "pull_up",
        "deadlift",
        "farmer_carry",
        "rope_climb",
        "kettlebell_swing",
        "ring_row",
    ],
    # --- joint additions ---
    "groin": [
        "back_squat",
        "front_squat",
        "sumo_deadlift",
        "air_squat",
        "pistol_squat",
        "lunge",
        "running",
        "sprint",
        "box_jump",
        "kettlebell_swing",
    ],
    "si_joint": [
        "single_leg_deadlift",
        "lunge",
        "pistol_squat",
        "split_jerk",
        "running",
        "box_jump",
        "step_up",
        "ghd_situp",
    ],
    "medial_elbow": [
        "rope_climb",
        "muscle_up",
        "rowing",
        "clean",
        "pull_up",
        "wall_ball",
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
    ("knee", "running"): ["Bike Erg", "Row Erg", "Ski Erg"],
    ("knee", "wall_ball"): ["Dumbbell Push Press", "Box Step-up + Press"],
    ("knee", "thruster"): ["Dumbbell Push Press", "Front Squat (partial ROM)"],
    ("knee", "double_under"): ["Row Erg", "Bike Erg", "Single-unders"],
    ("shoulder", "pull_up"): ["Ring Row", "Lat Pulldown", "Banded Pull-apart"],
    ("shoulder", "push_jerk"): ["Dumbbell Push Press (light)", "Landmine Press"],
    ("shoulder", "thruster"): ["Dumbbell Front Squat", "Goblet Squat + Press (light)"],
    ("shoulder", "dip"): ["Tricep Pushdown", "Close-grip Bench (light)"],
    ("shoulder", "overhead_squat"): ["Front Squat", "Goblet Squat"],
    ("shoulder", "snatch"): ["Power Clean", "Kettlebell Swing", "Dumbbell Romanian DL"],
    ("shoulder", "muscle_up"): ["Ring Row + Push-up", "Lat Pulldown"],
    ("shoulder", "handstand_pushup"): ["Landmine Press", "Pike Hold"],
    ("shoulder", "push_press"): ["Landmine Press", "Dumbbell Press (light)"],
    ("shoulder", "strict_press"): ["Landmine Press", "Cable Lateral Raise"],
    ("lower_back", "deadlift"): ["Trap Bar Deadlift", "Romanian DL (light)", "Kettlebell Swing"],
    ("lower_back", "back_squat"): ["Goblet Squat", "Box Squat (high)"],
    ("lower_back", "clean"): ["Dumbbell Power Clean", "Kettlebell Swing"],
    ("lower_back", "sit_up"): ["Hollow Hold", "Plank", "Dead Bug"],
    ("lower_back", "ghd_situp"): ["Hollow Hold", "Plank", "Weighted Crunch (small ROM)"],
    ("lower_back", "toes_to_bar"): ["Hanging Knee Raise (slow)", "Hollow Rock", "Plank"],
    ("lower_back", "rowing"): ["Bike Erg", "Ski Erg", "Assault Bike"],
    ("lower_back", "kettlebell_swing"): [
        "Hip Thrust",
        "Banded Pull-through",
        "Romanian DL (light)",
    ],
    ("lower_back", "burpee"): ["Sprawl (no jump)", "Bike Erg", "Row Erg"],
    ("lower_back", "snatch"): ["Power Clean (no overhead catch)", "Kettlebell Swing (light)"],
    ("wrist", "handstand"): ["Pike Hold", "Shoulder Taps (fists)"],
    ("wrist", "muscle_up"): ["Banded Ring Row", "Lat Pulldown"],
    ("hip", "clean"): ["Dumbbell Power Clean", "Kettlebell Swing"],
    ("hip", "pistol_squat"): ["Step-up", "Single-leg Press"],
    ("hip", "deadlift"): [
        "Trap Bar Deadlift (higher starting position)",
        "Leg Press",
        "Hip Thrust",
    ],
    ("hip", "front_squat"): ["Goblet Squat (partial ROM, heels elevated)", "Leg Press"],
    ("hip", "back_squat"): ["Goblet Squat (partial ROM)", "Box Squat (high box)", "Leg Press"],
    ("hip", "lunge"): ["Step-up (short stride)", "Hip Thrust", "Leg Press"],
    ("hip", "running"): ["Bike Erg", "Row Erg", "Ski Erg"],
    ("hip", "air_squat"): ["Goblet Squat (heels elevated, partial ROM)", "Leg Press"],
    ("hip", "sumo_deadlift"): ["Trap Bar Deadlift (narrow stance)", "Leg Press", "Hip Thrust"],
    ("elbow", "muscle_up"): ["Ring Row + Push-up", "Lat Pulldown"],
    ("elbow", "dip"): ["Tricep Pushdown", "Lat Pulldown"],
    ("elbow", "handstand_pushup"): ["Pike Hold", "Landmine Press"],
    ("elbow", "overhead_squat"): ["Front Squat", "Goblet Squat"],
    ("elbow", "pull_up"): ["Lat Pulldown (light)", "Band Pull-apart", "Ring Row (very low angle)"],
    ("elbow", "ring_row"): ["Lat Pulldown (light)", "Band Pull-apart"],
    ("elbow", "rope_climb"): ["Rope Pull (seated, arms only)", "Lat Pulldown"],
    ("elbow", "push_press"): ["Landmine Press", "Dumbbell Press (light)"],
    ("elbow", "farmer_carry"): ["Goblet Carry (wrist neutral)", "Suitcase Carry with strap"],
    ("ankle", "box_jump"): ["Step-up", "Seated Box Jump"],
    ("ankle", "running"): ["Bike Erg", "Row Erg", "Ski Erg"],
    ("ankle", "double_under"): ["Single-unders", "Row Erg", "Bike Erg"],
    ("ankle", "pistol_squat"): ["Assisted Pistol (reduced ROM)", "Single-leg Press"],
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
    ("glute", "back_squat"): ["Goblet Squat (hip-neutral)", "Leg Press", "Hip Thrust"],
    ("glute", "box_jump"): ["Step-up", "Bike Erg", "Seated Box Jump"],
    ("glute", "sprint"): ["Bike Erg (sprint interval)", "Row Erg (sprint)"],
    ("glute", "running"): ["Bike Erg", "Row Erg", "Ski Erg"],
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
    # --- arch ---
    ("arch", "box_jump"): ["Step-up (box)", "Seated Box Jump", "Bike Erg"],
    ("arch", "double_under"): ["Row Erg", "Bike Erg", "Ski Erg"],
    ("arch", "single_under"): ["Row Erg", "Bike Erg", "Assault Bike"],
    ("arch", "running"): ["Row Erg", "Bike Erg", "Ski Erg"],
    ("arch", "rope_climb"): ["Rope Pull (seated, feet on floor)", "Ring Row", "Lat Pulldown"],
    ("arch", "burpee"): ["Sprawl (no jump)", "Bike Erg", "Row Erg"],
    ("arch", "walking_lunge"): ["Reverse Lunge (reduced stride)", "Step-up", "Goblet Squat"],
    # --- achilles ---
    ("achilles", "box_jump"): ["Step-up (slow, no jump)", "Seated Box Jump", "Bike Erg"],
    ("achilles", "double_under"): ["Row Erg", "Bike Erg", "Ski Erg"],
    ("achilles", "single_under"): ["Row Erg", "Bike Erg", "Assault Bike"],
    ("achilles", "running"): ["Row Erg", "Bike Erg", "Ski Erg"],
    ("achilles", "sprint"): ["Bike Erg (sprint interval)", "Row Erg (sprint)"],
    ("achilles", "rope_climb"): ["Rope Pull (seated, feet on floor)", "Ring Row", "Lat Pulldown"],
    ("achilles", "wall_ball"): ["Dumbbell Push Press", "Box Step-up + Press"],
    ("achilles", "burpee"): ["Sprawl (no jump)", "Bike Erg"],
    ("achilles", "pistol_squat"): ["Assisted Pistol (reduced ROM)", "Single-leg Press"],
    # --- shin ---
    ("shin", "running"): ["Row Erg", "Bike Erg", "Ski Erg"],
    ("shin", "sprint"): ["Bike Erg (sprint interval)", "Row Erg (sprint)"],
    ("shin", "double_under"): ["Row Erg", "Bike Erg", "Ski Erg"],
    ("shin", "single_under"): ["Row Erg", "Bike Erg"],
    ("shin", "box_jump"): ["Step-up", "Seated Box Jump", "Bike Erg"],
    ("shin", "burpee"): ["Sprawl (no jump)", "Bike Erg"],
    ("shin", "wall_ball"): ["Dumbbell Push Press", "Box Step-up + Press"],
    # --- patellar_tendon ---
    ("patellar_tendon", "box_jump"): ["Box Step-up", "Bike Erg", "Row Erg"],
    ("patellar_tendon", "double_under"): ["Row Erg", "Bike Erg", "Ski Erg"],
    ("patellar_tendon", "running"): ["Bike Erg", "Row Erg", "Ski Erg"],
    ("patellar_tendon", "lunge"): ["Hip Thrust", "Deadlift", "Step-up (short box, slow)"],
    ("patellar_tendon", "wall_ball"): ["Dumbbell Push Press", "Box Step-up + Press"],
    ("patellar_tendon", "thruster"): ["Dumbbell Push Press", "Front Squat (parallel, light)"],
    ("patellar_tendon", "back_squat"): [
        "Box Squat (parallel, no bounce)",
        "Goblet Squat (partial ROM)",
        "Leg Press",
    ],
    ("patellar_tendon", "front_squat"): ["Goblet Squat (partial ROM)", "Leg Press"],
    ("patellar_tendon", "burpee"): ["Sprawl (no jump)", "Bike Erg"],
    ("patellar_tendon", "pistol_squat"): ["Assisted Pistol (reduced ROM)", "Single-leg Press"],
    ("patellar_tendon", "step_up"): ["Hip Thrust", "Leg Press", "Goblet Squat (partial ROM)"],
    # --- rotator_cuff ---
    ("rotator_cuff", "strict_press"): ["Landmine Press", "Cable Lateral Raise", "Band Pull-apart"],
    ("rotator_cuff", "push_press"): ["Landmine Press", "Dumbbell Press (30-45 deg incline)"],
    ("rotator_cuff", "push_jerk"): ["Landmine Press", "Goblet Squat + Light Press"],
    ("rotator_cuff", "overhead_squat"): ["Front Squat", "Goblet Squat"],
    ("rotator_cuff", "snatch"): ["Power Clean", "Kettlebell Swing", "Dumbbell Romanian DL"],
    ("rotator_cuff", "thruster"): ["Front Squat", "Goblet Squat", "Dumbbell Thruster (light)"],
    ("rotator_cuff", "handstand_pushup"): ["Pike Push-up (partial ROM)", "Landmine Press"],
    ("rotator_cuff", "kipping_pullup"): [
        "Strict Pull-up (slow, pain-free ROM)",
        "Ring Row",
        "Lat Pulldown",
    ],
    ("rotator_cuff", "pull_up"): ["Ring Row (shallow angle)", "Lat Pulldown", "Banded Row"],
    ("rotator_cuff", "muscle_up"): ["Ring Row + Push-up (separate)", "Lat Pulldown"],
    ("rotator_cuff", "dip"): ["Tricep Pushdown", "Lat Pulldown"],
    ("rotator_cuff", "ring_dip"): ["Tricep Pushdown", "Banded Pushdown"],
    # --- lateral_elbow ---
    ("lateral_elbow", "barbell_row"): [
        "Cable Row (neutral grip)",
        "Dumbbell Row (neutral grip)",
        "Ring Row (neutral grip)",
    ],
    ("lateral_elbow", "pull_up"): [
        "Neutral-grip Pull-up",
        "Lat Pulldown (neutral grip)",
        "Ring Row (neutral grip)",
    ],
    ("lateral_elbow", "deadlift"): [
        "Deadlift with straps (reduces wrist extension demand)",
        "Leg Press",
    ],
    ("lateral_elbow", "rope_climb"): ["Rope Pull (seated, neutral wrist)", "Lat Pulldown"],
    ("lateral_elbow", "farmer_carry"): ["Farmer Carry with straps", "Goblet Carry (neutral wrist)"],
    ("lateral_elbow", "ring_row"): ["Ring Row (neutral grip)", "Lat Pulldown (neutral grip)"],
    # --- groin ---
    ("groin", "back_squat"): [
        "Narrow-stance Goblet Squat",
        "Box Squat (narrow stance)",
        "Leg Press (narrow)",
    ],
    ("groin", "front_squat"): ["Goblet Squat (narrow)", "Leg Press"],
    ("groin", "running"): ["Row Erg", "Bike Erg", "Ski Erg"],
    ("groin", "sprint"): ["Bike Erg (sprint interval)", "Row Erg (sprint)"],
    ("groin", "lunge"): ["Hip Thrust (neutral stance)", "Step-up (narrow stride)", "Leg Press"],
    ("groin", "box_jump"): ["Step-up", "Seated Box Jump", "Bike Erg"],
    ("groin", "sumo_deadlift"): [
        "Conventional Deadlift (narrow)",
        "Trap Bar Deadlift",
        "Leg Press",
    ],
    ("groin", "air_squat"): ["Goblet Squat (narrow stance)", "Leg Press"],
    ("groin", "pistol_squat"): ["Goblet Squat (symmetric)", "Box Squat", "Leg Press"],
    ("groin", "kettlebell_swing"): ["Hip Thrust", "Romanian DL", "Glute Bridge"],
    # --- si_joint ---
    ("si_joint", "single_leg_deadlift"): [
        "Romanian DL (bilateral)",
        "Hip Thrust (bilateral)",
        "Leg Press",
    ],
    ("si_joint", "lunge"): ["Goblet Squat (symmetric)", "Hip Thrust (symmetric)", "Leg Press"],
    ("si_joint", "running"): ["Row Erg", "Bike Erg", "Ski Erg"],
    ("si_joint", "pistol_squat"): ["Goblet Squat (symmetric)", "Box Squat (symmetric)"],
    ("si_joint", "split_jerk"): ["Push Press (bilateral)", "Dumbbell Push Press"],
    ("si_joint", "ghd_situp"): ["Hollow Hold", "Plank", "Weighted Crunch (small ROM)"],
    ("si_joint", "box_jump"): ["Step-up (symmetric landing)", "Bike Erg", "Seated Box Jump"],
    ("si_joint", "step_up"): ["Goblet Squat (symmetric)", "Leg Press", "Hip Thrust (bilateral)"],
    # --- medial_elbow ---
    ("medial_elbow", "pull_up"): [
        "Neutral-grip Pull-up",
        "Lat Pulldown (pronated)",
        "Ring Row (pronated)",
    ],
    ("medial_elbow", "rope_climb"): ["Rope Pull (seated, pronated grip)", "Lat Pulldown"],
    ("medial_elbow", "rowing"): ["Bike Erg", "Ski Erg", "Assault Bike"],
    ("medial_elbow", "clean"): ["Dumbbell Power Clean (neutral grip)", "Kettlebell Swing"],
    ("medial_elbow", "muscle_up"): ["Ring Row + Push-up (separate)", "Lat Pulldown"],
    ("medial_elbow", "wall_ball"): ["Dumbbell Push Press", "Box Step-up + Press"],
}

# Regions where injuries are chronic/overuse conditions, not acute rupture events.
# For these regions, acute-rupture language in notes ("tore", "popped", "snapped")
# does NOT trigger requires_referral — only pain_level >= 8 does.
CHRONIC_REGIONS: frozenset[str] = frozenset(
    {
        "it_band",
        "hip_flexor",
        "forearm",
        "arch",
        "achilles",
        "patellar_tendon",
        "rotator_cuff",
        "lateral_elbow",
        "medial_elbow",
    }
)

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


def union_contraindications(
    injuries: list[tuple[str, bool]],
) -> dict[str, list[str]]:
    """Return {movement: [body_regions_that_block_it]} for a set of active injuries.

    Each element of injuries is (body_region, requires_referral).
    Referral-flagged injuries block ALL movements for their region — the athlete
    should not train that area at all until cleared by a physio.
    """
    blocked: dict[str, list[str]] = {}
    for body_region, _ in injuries:
        for movement in CONTRAINDICATIONS.get(body_region, []):
            blocked.setdefault(movement, []).append(body_region)
    return blocked
