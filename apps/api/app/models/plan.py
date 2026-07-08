"""Pydantic models for the training plan endpoints."""

from __future__ import annotations

import uuid
from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


class CreatePlanRequest(BaseModel):
    goal: Literal["general_fitness", "strength", "endurance", "competition_prep"]
    title: str = Field(max_length=200)
    start_date: date
    weeks: int = Field(ge=4, le=24)
    training_age: Literal["beginner", "intermediate", "advanced"]


class PlanTaskResponse(BaseModel):
    task_id: str
    status: str
    plan_id: uuid.UUID | None = None
    error: str | None = None


class PlanBase(BaseModel):
    """Shared fields between PlanSummary and PlanDetail."""

    id: uuid.UUID
    goal: Literal["general_fitness", "strength", "endurance", "competition_prep"]
    title: str
    branch_name: str
    weeks: int
    status: Literal["active", "archived", "draft"]
    start_date: date
    end_date: date
    created_at: str


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
    phase: Literal["accumulation", "intensification", "deload", "peak", "test"]
    week_start: int
    week_end: int
    focus: str | None


class PlanDetail(PlanBase):
    training_age: Literal["beginner", "intermediate", "advanced"] | None
    mesocycles: list[MesocycleOut]
    sessions: list[PlannedSessionOut]


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
