"""Pydantic models for the training plan endpoints."""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, model_validator

log = logging.getLogger(__name__)

_ARCHETYPE = Literal[
    "general-crossfit",
    "strength-bias",
    "travel-minimal",
    "aerobic-base",
    "bodyweight-calisthenics",
    "skill-acquisition",
    "one-rm-peak",
]


class CreatePlanRequest(BaseModel):
    archetype: _ARCHETYPE
    title: str = Field(max_length=200)
    start_date: date
    weeks: int = Field(ge=4, le=24)
    training_age: Literal["beginner", "intermediate", "advanced"]
    equipment: list[str] = Field(default_factory=list)
    days_per_week: int = Field(ge=2, le=6)
    target_movement_id: uuid.UUID | None = None
    max_duration_weeks: int | None = Field(default=None, ge=4, le=24)
    current_1rm_kg: float | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def check_archetype_constraints(self) -> CreatePlanRequest:
        if self.archetype == "skill-acquisition" and self.max_duration_weeks is None:
            raise ValueError("max_duration_weeks is required for skill-acquisition archetype")
        if (
            self.archetype in ("skill-acquisition", "one-rm-peak")
            and self.target_movement_id is None
        ):
            raise ValueError(
                "target_movement_id is required for skill-acquisition and one-rm-peak archetypes"
            )
        if self.archetype == "one-rm-peak" and self.current_1rm_kg is None:
            log.warning(
                "one-rm-peak plan created without current_1rm_kg; "
                "load percentages will be estimated"
            )
        return self


_GENERATION_TIER = Literal["ai", "deterministic_substitution", "static_fallback"]


class PlanTaskResponse(BaseModel):
    task_id: str
    status: Literal["pending", "running", "complete", "failed"]
    plan_id: uuid.UUID | None = None
    error: str | None = None
    generation_tier: _GENERATION_TIER | None = None
    corrections: list[str] = []


class PlanBase(BaseModel):
    """Shared fields between PlanSummary and PlanDetail."""

    id: uuid.UUID
    archetype: _ARCHETYPE
    title: str
    branch_name: str
    weeks: int
    status: Literal["active", "archived", "draft"]
    start_date: date
    end_date: date
    created_at: str
    training_age: Literal["beginner", "intermediate", "advanced"] | None = None


class PlanSummary(PlanBase):
    pass


class PlannedItemOut(BaseModel):
    id: uuid.UUID
    movement_name: str
    sets: int | None
    reps: str | None
    load_pct_1rm: float | None
    load_kg: float | None
    notes: str | None
    item_order: int


class PlannedSessionOut(BaseModel):
    id: uuid.UUID
    mesocycle_id: uuid.UUID
    scheduled_date: date
    session_type: Literal["strength", "metcon", "skill", "mixed", "rest", "active_recovery"]
    title: str
    notes: str | None
    status: Literal["prescribed", "completed", "skipped", "adapted"]
    items: list[PlannedItemOut] = []


class MesocycleOut(BaseModel):
    id: uuid.UUID
    name: str
    phase: Literal["accumulation", "intensification", "realization", "deload", "peak", "test"]
    week_start: int
    week_end: int
    focus: str | None


class PlanDetail(PlanBase):
    mesocycles: list[MesocycleOut]
    sessions: list[PlannedSessionOut]
    generation_tier: _GENERATION_TIER | None = None
    corrections: list[str] = []


class PlannedItemPatch(BaseModel):
    item_id: str | None = None
    movement_name: str = Field(max_length=100)
    sets: int | None = None
    reps: str | None = None
    load_pct_1rm: float | None = None
    load_kg: float | None = None
    notes: str | None = Field(default=None, max_length=500)
    item_order: int = 0


class SessionPatch(BaseModel):
    session_id: str
    new_title: str | None = Field(default=None, max_length=200)
    new_notes: str | None = Field(default=None, max_length=500)
    modified_items: list[PlannedItemPatch] = []


class PlanRevisionDiff(BaseModel):
    rationale: str = Field(..., min_length=10, max_length=800)
    changed_sessions: list[SessionPatch]


class PlanRevisionRequest(BaseModel):
    feedback: str = Field(..., min_length=5, max_length=500)


class LoggedSet(BaseModel):
    """One completed set logged against a prescribed plan item during session execution."""

    planned_item_id: uuid.UUID
    movement_id: uuid.UUID | None = None
    load_kg: Decimal | None = None
    reps: int | None = None
    rpe: Decimal | None = Field(default=None, ge=0, le=10)


class CompleteSessionRequest(BaseModel):
    logged_sets: list[LoggedSet] = Field(default_factory=list, max_length=200)
    bodyweight_kg: Decimal | None = Field(default=None, gt=0, le=600)


# ── Deterministic scaffold dataclasses ────────────────────────────────────────
# Plain data containers used by plan_scaffold.py (the deterministic layer).
# No Pydantic validation — these are stdlib dataclasses only.


@dataclass
class SessionSlot:
    """One session within a week: type, intensity, and which day it falls on."""

    day_of_week: int  # 0 = Monday, 6 = Sunday
    session_type: Literal["strength", "metcon", "skill", "mixed", "active_recovery", "rest"]
    intensity_hint: Literal["easy", "moderate", "hard"]


@dataclass
class WeekSlot:
    """One week of training, carrying its sessions and volume/intensity targets."""

    week_number: int
    phase: Literal["accumulation", "intensification", "realization", "deload"]
    sessions: list[SessionSlot]
    target_volume_sets: dict[str, int]  # movement pattern -> weekly set target
    target_intensity_pct: float | None  # None for metcon-dominant weeks
    is_deload: bool = False
    volume_multiplier: float = 1.0


@dataclass
class MesocycleScaffold:
    """A named training block (mesocycle) bounding a contiguous range of weeks."""

    name: str
    phase: Literal["accumulation", "intensification", "realization", "deload"]
    week_start: int
    week_end: int


@dataclass
class PlanScaffold:
    """
    Fully-specified training plan skeleton produced by the deterministic layer.

    Drives both the LLM prompt construction and the post-LLM merge step.
    All sports-science parameters live in plan_scaffold.py as constants; this
    dataclass is the output container.
    """

    archetype: str
    total_weeks: int
    mesocycles: list[MesocycleScaffold]
    weeks: list[WeekSlot]
    deload_weeks: set[int]
    target_movement_id: uuid.UUID | None
    equipment_tags: list[str]
