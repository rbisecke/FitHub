"""Deterministic plan scaffold builder.

Pure computation — no I/O, no LLM calls, no external dependencies.
Takes a CreatePlanRequest and returns a fully-specified PlanScaffold that
drives both the LLM prompt and the post-LLM merge step.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.models.plan import (
    CreatePlanRequest,
    MesocycleScaffold,
    PlanScaffold,
    SessionSlot,
    WeekSlot,
)

# ---------------------------------------------------------------------------
# Phase targets
# ---------------------------------------------------------------------------


@dataclass
class PhaseTargets:
    intensity_min: float  # %1RM lower bound
    intensity_max: float  # %1RM upper bound
    rep_range: str  # descriptive e.g. "3-5"
    sets_per_pattern: int  # target weekly sets per movement pattern


PHASE_TARGETS: dict[str, PhaseTargets] = {
    "accumulation": PhaseTargets(65.0, 75.0, "8-12", 14),
    "intensification": PhaseTargets(75.0, 87.5, "3-6", 10),
    "realization": PhaseTargets(87.5, 97.5, "1-3", 6),
    "deload": PhaseTargets(50.0, 65.0, "5-8", 6),
}


# ---------------------------------------------------------------------------
# Mesocycle table
# Maps total_weeks -> (accumulation_weeks, intensification_weeks, realization_weeks).
# Deload weeks are layered on top by get_deload_weeks() — not counted here.
# ---------------------------------------------------------------------------

MESOCYCLE_TABLE: dict[int, tuple[int, int, int]] = {
    4: (2, 1, 1),
    5: (2, 2, 1),
    6: (3, 2, 1),
    7: (3, 2, 2),
    8: (4, 2, 2),
    9: (4, 3, 2),
    10: (5, 3, 2),
    11: (5, 3, 3),
    12: (5, 4, 3),
    13: (6, 4, 3),
    14: (6, 5, 3),
    15: (7, 5, 3),
    16: (7, 5, 4),
    17: (8, 5, 4),
    18: (8, 6, 4),
    19: (9, 6, 4),
    20: (9, 6, 5),
    21: (9, 7, 5),
    22: (10, 7, 5),
    23: (10, 7, 6),
    24: (10, 8, 6),
}


# ---------------------------------------------------------------------------
# MEV / MAV / MRV table
# Weekly set targets per movement pattern, per training age.
# (mev, mav, mrv) = minimum effective / maximum adaptive / maximum recoverable volume
# ---------------------------------------------------------------------------

MEV_MAV_MRV: dict[str, dict[str, tuple[int, int, int]]] = {
    "beginner": {
        "squat": (6, 10, 14),
        "hinge": (4, 8, 12),
        "push_vertical": (4, 8, 12),
        "push_horizontal": (4, 8, 12),
        "pull_vertical": (4, 8, 12),
        "pull_horizontal": (4, 8, 12),
        "carry": (2, 4, 6),
        "core": (4, 8, 12),
        "locomotion": (2, 4, 8),
    },
    "intermediate": {
        "squat": (8, 14, 20),
        "hinge": (6, 12, 18),
        "push_vertical": (6, 12, 18),
        "push_horizontal": (6, 12, 18),
        "pull_vertical": (6, 12, 18),
        "pull_horizontal": (6, 12, 18),
        "carry": (3, 6, 10),
        "core": (6, 12, 18),
        "locomotion": (3, 6, 12),
    },
    "advanced": {
        "squat": (10, 18, 25),
        "hinge": (8, 14, 22),
        "push_vertical": (8, 14, 22),
        "push_horizontal": (8, 14, 22),
        "pull_vertical": (8, 14, 22),
        "pull_horizontal": (8, 14, 22),
        "carry": (4, 8, 14),
        "core": (8, 16, 24),
        "locomotion": (4, 8, 16),
    },
}


# ---------------------------------------------------------------------------
# Session schedule
# Each entry: (day_of_week, session_type, intensity_hint)
# Days are 0=Mon through 6=Sun.
# ---------------------------------------------------------------------------

SESSION_SCHEDULE: dict[str, dict[int, list[tuple[int, str, str]]]] = {
    "general-crossfit": {
        2: [(1, "mixed", "hard"), (4, "mixed", "hard")],
        3: [(1, "strength", "hard"), (3, "metcon", "moderate"), (5, "mixed", "hard")],
        4: [
            (1, "strength", "hard"),
            (2, "metcon", "moderate"),
            (4, "strength", "hard"),
            (5, "metcon", "hard"),
        ],
        5: [
            (1, "strength", "hard"),
            (2, "metcon", "moderate"),
            (3, "strength", "hard"),
            (4, "metcon", "moderate"),
            (6, "mixed", "hard"),
        ],
        6: [
            (1, "strength", "hard"),
            (2, "metcon", "moderate"),
            (3, "strength", "hard"),
            (4, "metcon", "moderate"),
            (5, "mixed", "hard"),
            (6, "active_recovery", "easy"),
        ],
    },
    "strength-bias": {
        2: [(1, "strength", "hard"), (4, "strength", "hard")],
        3: [(1, "strength", "hard"), (3, "strength", "moderate"), (5, "strength", "hard")],
        4: [
            (1, "strength", "hard"),
            (2, "metcon", "easy"),
            (4, "strength", "hard"),
            (5, "strength", "moderate"),
        ],
        5: [
            (1, "strength", "hard"),
            (2, "strength", "moderate"),
            (3, "metcon", "easy"),
            (4, "strength", "hard"),
            (6, "strength", "moderate"),
        ],
        6: [
            (1, "strength", "hard"),
            (2, "strength", "moderate"),
            (3, "metcon", "easy"),
            (4, "strength", "hard"),
            (5, "strength", "moderate"),
            (6, "active_recovery", "easy"),
        ],
    },
    "travel-minimal": {
        2: [(1, "metcon", "hard"), (4, "metcon", "hard")],
        3: [(1, "strength", "hard"), (3, "metcon", "moderate"), (5, "metcon", "hard")],
        4: [
            (1, "strength", "moderate"),
            (2, "metcon", "hard"),
            (4, "strength", "moderate"),
            (5, "metcon", "hard"),
        ],
        5: [
            (1, "strength", "moderate"),
            (2, "metcon", "hard"),
            (3, "active_recovery", "easy"),
            (5, "strength", "moderate"),
            (6, "metcon", "hard"),
        ],
        6: [
            (1, "strength", "moderate"),
            (2, "metcon", "hard"),
            (3, "skill", "easy"),
            (4, "strength", "moderate"),
            (5, "metcon", "hard"),
            (6, "active_recovery", "easy"),
        ],
    },
    "aerobic-base": {
        2: [(1, "metcon", "moderate"), (4, "metcon", "moderate")],
        3: [(1, "metcon", "moderate"), (3, "metcon", "hard"), (5, "active_recovery", "easy")],
        4: [
            (1, "metcon", "moderate"),
            (2, "metcon", "hard"),
            (4, "metcon", "moderate"),
            (6, "active_recovery", "easy"),
        ],
        5: [
            (1, "metcon", "moderate"),
            (2, "metcon", "hard"),
            (3, "active_recovery", "easy"),
            (5, "metcon", "moderate"),
            (6, "metcon", "hard"),
        ],
        6: [
            (1, "metcon", "moderate"),
            (2, "metcon", "hard"),
            (3, "active_recovery", "easy"),
            (4, "metcon", "moderate"),
            (5, "metcon", "hard"),
            (6, "active_recovery", "easy"),
        ],
    },
    "bodyweight-calisthenics": {
        2: [(1, "strength", "hard"), (4, "skill", "moderate")],
        3: [(1, "strength", "hard"), (3, "skill", "moderate"), (5, "strength", "hard")],
        4: [
            (1, "strength", "hard"),
            (2, "skill", "moderate"),
            (4, "strength", "hard"),
            (6, "skill", "easy"),
        ],
        5: [
            (1, "strength", "hard"),
            (2, "skill", "moderate"),
            (3, "active_recovery", "easy"),
            (5, "strength", "hard"),
            (6, "skill", "moderate"),
        ],
        6: [
            (1, "strength", "hard"),
            (2, "skill", "moderate"),
            (3, "strength", "moderate"),
            (4, "skill", "easy"),
            (5, "strength", "hard"),
            (6, "active_recovery", "easy"),
        ],
    },
    "skill-acquisition": {
        2: [(1, "skill", "moderate"), (4, "skill", "moderate")],
        3: [(1, "skill", "moderate"), (3, "strength", "moderate"), (5, "skill", "hard")],
        4: [
            (1, "skill", "moderate"),
            (2, "strength", "moderate"),
            (4, "skill", "hard"),
            (6, "active_recovery", "easy"),
        ],
        5: [
            (1, "skill", "moderate"),
            (2, "strength", "moderate"),
            (3, "skill", "hard"),
            (5, "skill", "moderate"),
            (6, "metcon", "easy"),
        ],
        6: [
            (1, "skill", "moderate"),
            (2, "strength", "moderate"),
            (3, "skill", "hard"),
            (4, "active_recovery", "easy"),
            (5, "skill", "moderate"),
            (6, "metcon", "easy"),
        ],
    },
    "one-rm-peak": {
        2: [(1, "strength", "hard"), (4, "strength", "moderate")],
        3: [(1, "strength", "hard"), (3, "strength", "moderate"), (5, "metcon", "easy")],
        4: [
            (1, "strength", "hard"),
            (2, "metcon", "easy"),
            (4, "strength", "hard"),
            (5, "strength", "moderate"),
        ],
        5: [
            (1, "strength", "hard"),
            (2, "strength", "moderate"),
            (3, "metcon", "easy"),
            (5, "strength", "hard"),
            (6, "strength", "moderate"),
        ],
        6: [
            (1, "strength", "hard"),
            (2, "strength", "moderate"),
            (3, "metcon", "easy"),
            (4, "strength", "hard"),
            (5, "strength", "moderate"),
            (6, "active_recovery", "easy"),
        ],
    },
}

# Constant used by validate_and_correct_plan (lives in plan_generator / programming module).
MAX_HARD_DAYS_PER_WEEK = 4


# ---------------------------------------------------------------------------
# Public helpers
# ---------------------------------------------------------------------------


def compute_load_kg(one_rm_kg: float, phase: str) -> tuple[float, float]:
    """Return (min_kg, max_kg) working weight range for the given phase."""
    targets = PHASE_TARGETS.get(phase, PHASE_TARGETS["accumulation"])
    return (
        round(one_rm_kg * targets.intensity_min / 100, 1),
        round(one_rm_kg * targets.intensity_max / 100, 1),
    )


def get_deload_weeks(total_weeks: int, training_age: str) -> set[int]:
    """Return week numbers that should be deload weeks.

    Beginners deload every 3rd week; intermediates every 4th; advanced every 5th.
    The final week is always a deload when total_weeks >= 4.
    """
    freq = {"beginner": 3, "intermediate": 4, "advanced": 5}.get(training_age, 4)
    deloads = {w for w in range(freq, total_weeks + 1, freq)}
    if total_weeks >= 4:
        deloads.add(total_weeks)
    return deloads


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------


def _build_phase_map(
    total_weeks: int,
    deload_weeks: set[int],
    archetype: str,  # noqa: ARG001
) -> dict[int, str]:
    """Map each week number to its phase name."""
    if total_weeks not in MESOCYCLE_TABLE:
        key = min(MESOCYCLE_TABLE.keys(), key=lambda k: abs(k - total_weeks))
        acc, intens, real = MESOCYCLE_TABLE[key]
    else:
        acc, intens, real = MESOCYCLE_TABLE[total_weeks]

    phase_map: dict[int, str] = {}
    week = 1
    for _ in range(acc):
        phase_map[week] = "deload" if week in deload_weeks else "accumulation"
        week += 1
    for _ in range(intens):
        phase_map[week] = "deload" if week in deload_weeks else "intensification"
        week += 1
    for _ in range(real):
        phase_map[week] = "deload" if week in deload_weeks else "realization"
        week += 1
    while week <= total_weeks:
        phase_map[week] = "deload" if week in deload_weeks else "accumulation"
        week += 1
    return phase_map


def _volume_ramp_pct(week: int, total: int, deload_weeks: set[int]) -> float:
    """0.0 = MEV, 1.0 = MAV. Ramps linearly; resets after deload."""
    working_weeks = [w for w in range(1, total + 1) if w not in deload_weeks]
    if week in deload_weeks or not working_weeks:
        return 0.0
    idx = working_weeks.index(week) if week in working_weeks else 0
    return min(idx / max(len(working_weeks) - 1, 1), 1.0)


def _build_mesocycles(phase_map: dict[int, str]) -> list[MesocycleScaffold]:
    """Collapse contiguous same-phase weeks into mesocycle blocks."""
    if not phase_map:
        return []
    result: list[MesocycleScaffold] = []
    sorted_weeks = sorted(phase_map.keys())
    cur_phase = phase_map[sorted_weeks[0]]
    start = sorted_weeks[0]
    for w in sorted_weeks[1:]:
        if phase_map[w] != cur_phase:
            result.append(
                MesocycleScaffold(
                    name=cur_phase.replace("_", " ").title(),
                    phase=cur_phase,  # type: ignore[arg-type]
                    week_start=start,
                    week_end=w - 1,
                )
            )
            cur_phase = phase_map[w]
            start = w
    result.append(
        MesocycleScaffold(
            name=cur_phase.replace("_", " ").title(),
            phase=cur_phase,  # type: ignore[arg-type]
            week_start=start,
            week_end=sorted_weeks[-1],
        )
    )
    return result


# ---------------------------------------------------------------------------
# Main orchestrator
# ---------------------------------------------------------------------------


def build_scaffold(req: CreatePlanRequest) -> PlanScaffold:
    """Build the deterministic plan structure. No I/O, no LLM calls."""
    total_weeks = (
        req.max_duration_weeks
        if req.archetype == "skill-acquisition" and req.max_duration_weeks
        else req.weeks
    )
    deload_weeks = get_deload_weeks(total_weeks, req.training_age)
    mev_mav_mrv = MEV_MAV_MRV.get(req.training_age, MEV_MAV_MRV["intermediate"])
    session_slots = SESSION_SCHEDULE[req.archetype][req.days_per_week]

    phase_map = _build_phase_map(total_weeks, deload_weeks, req.archetype)
    mesocycles = _build_mesocycles(phase_map)

    weeks: list[WeekSlot] = []
    for week_num in range(1, total_weeks + 1):
        phase = phase_map[week_num]
        phase_targets = PHASE_TARGETS.get(phase, PHASE_TARGETS["accumulation"])

        ramp_pct = _volume_ramp_pct(week_num, total_weeks, deload_weeks)
        volume_targets = {
            pattern: int(mev + (mav - mev) * ramp_pct)
            for pattern, (mev, mav, _mrv) in mev_mav_mrv.items()
        }
        if phase == "deload":
            volume_targets = {p: max(mev_mav_mrv[p][0], v // 2) for p, v in volume_targets.items()}

        load_intensity = phase_targets.intensity_min if req.current_1rm_kg else None

        slots = [
            SessionSlot(
                day_of_week=s[0],
                session_type=s[1],  # type: ignore[arg-type]
                intensity_hint=s[2],  # type: ignore[arg-type]
            )
            for s in session_slots
        ]
        if week_num in deload_weeks:
            slots = [
                SessionSlot(
                    s.day_of_week,
                    s.session_type,
                    "easy" if s.intensity_hint == "hard" else s.intensity_hint,
                )
                for s in slots
            ]

        weeks.append(
            WeekSlot(
                week_number=week_num,
                phase=phase,  # type: ignore[arg-type]
                sessions=slots,
                target_volume_sets=volume_targets,
                target_intensity_pct=load_intensity,
            )
        )

    return PlanScaffold(
        archetype=req.archetype,
        total_weeks=total_weeks,
        mesocycles=mesocycles,
        weeks=weeks,
        deload_weeks=deload_weeks,
        target_movement_id=req.target_movement_id,
        equipment_tags=list(req.equipment),
    )
