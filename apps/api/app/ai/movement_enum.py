"""Runtime movement Enum builder and instructor-compatible plan-fill schemas.

build_movement_enum() produces a string Enum from the available movement pool so
that instructor can constrain the LLM to only select movements that exist in the
database.  The fill schemas (ExerciseSelection, SessionFill, WeekFill, PlanFill)
are the structured-output targets passed to the LLM as response_model — they carry
the LLM's movement choices and prose while the deterministic scaffold owns all
numerical values (sets, load, rep ranges, session types).
"""

from __future__ import annotations

import re
from enum import Enum
from typing import Annotated

from pydantic import BaseModel, Field


def build_movement_enum(movements: list[dict[str, object]]) -> type[Enum]:
    """Build a string Enum class from a list of movement dicts.

    Each dict must have at least a "name" key.  The Enum values are the original
    movement name strings so that the LLM's selected value can be stored directly
    in the DB without translation.  Keys are UPPER_SNAKE_CASE identifiers derived
    from the name.

    Duplicate names produce unique keys with a numeric suffix (_2, _3, ...).
    Because Python's Enum treats members sharing the same value as aliases, the
    value for the Nth duplicate is also suffixed: "Name (N)" -- this keeps every
    entry as a distinct, selectable member.

    Args:
        movements: List of movement dicts, each with at least {"name": str}.

    Returns:
        A new Enum subclass named "MovementEnum" where each member's .value is
        the (possibly suffixed) movement name string.
    """
    members: dict[str, str] = {}
    seen_keys: dict[str, int] = {}

    for m in movements:
        name = str(m.get("name", ""))
        if not name:
            continue

        # Convert to UPPER_SNAKE_CASE: strip special chars, collapse whitespace.
        base_key = re.sub(r"[^a-zA-Z0-9\s]", "", name)
        base_key = re.sub(r"\s+", "_", base_key.strip()).upper()
        if not base_key:
            base_key = "MOVEMENT"

        if base_key in seen_keys:
            seen_keys[base_key] += 1
            suffix = seen_keys[base_key]
            key = f"{base_key}_{suffix}"
            # Enum treats members with identical values as aliases; append the
            # suffix to the value too so each duplicate is a distinct member.
            value = f"{name} ({suffix})"
        else:
            seen_keys[base_key] = 1
            key = base_key
            value = name

        members[key] = value

    return Enum("MovementEnum", members, type=str)  # type: ignore[return-value]


# ---------------------------------------------------------------------------
# Instructor-compatible structured-output schemas
# ---------------------------------------------------------------------------
# These models are passed as response_model to the LLM call.  The scaffold
# layer owns all numerical values (sets, load %, rep ranges, session types);
# the LLM only fills in movement names, titles, and notes.


class ExerciseSelection(BaseModel):
    """One exercise chosen by the LLM for a session slot."""

    movement_name: str = Field(
        description="Name of the movement, exactly as it appears in the movement pool."
    )
    sets: Annotated[int, Field(ge=1, le=10)] = Field(
        description="Number of sets (1-10).  Scaffold will override this value."
    )
    reps_or_duration: str = Field(
        description=('Reps or time/distance string: "5", "21-15-9", "400m", "2:00", "AMRAP".')
    )
    load_pct: Annotated[float, Field(ge=0.0, le=1.0)] | None = Field(
        default=None,
        description=("Fraction of 1RM (0.0-1.0).  None for bodyweight or cardio movements."),
    )
    notes: str | None = Field(
        default=None,
        description="Optional coaching cue or contextual note for this exercise.",
    )


class SessionFill(BaseModel):
    """LLM-generated content for one session slot."""

    session_type: str = Field(
        description=(
            "Session type matching the scaffold slot: "
            "strength | metcon | skill | mixed | active_recovery | rest."
        )
    )
    exercises: Annotated[list[ExerciseSelection], Field(min_length=3, max_length=8)] = Field(
        description="Movement selections for this session (3-8 exercises)."
    )


class WeekFill(BaseModel):
    """LLM-generated content for one training week."""

    week_number: Annotated[int, Field(ge=1)] = Field(description="1-based week number.")
    sessions: list[SessionFill] = Field(description="One SessionFill per session slot.")


class PlanFill(BaseModel):
    """Full LLM-generated plan fill: movement choices and prose across all weeks."""

    archetype: str = Field(description="The training archetype this plan targets.")
    weeks: list[WeekFill] = Field(description="One WeekFill per training week.")
    coaching_notes: str | None = Field(
        default=None,
        description="Optional high-level coaching notes for the athlete.",
    )
