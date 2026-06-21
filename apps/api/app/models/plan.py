"""Pydantic models for the training plan endpoints."""

from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


class CreatePlanRequest(BaseModel):
    goal: Literal["general_fitness", "strength", "endurance", "competition_prep"]
    title: str
    start_date: date
    weeks: int = Field(ge=4, le=24)
    training_age: Literal["beginner", "intermediate", "advanced"]


class PlanTaskResponse(BaseModel):
    task_id: str
    status: str
    plan_id: str | None = None
    error: str | None = None


class PlanSummary(BaseModel):
    id: str
    goal: str
    title: str
    branch_name: str
    weeks: int
    status: str
    start_date: date
    end_date: date
    created_at: str


class PlannedItemOut(BaseModel):
    id: str
    movement_name: str
    sets: int | None
    reps: str | None
    load_pct_1rm: float | None
    load_kg: float | None
    notes: str | None
    item_order: int


class PlannedSessionOut(BaseModel):
    id: str
    mesocycle_id: str
    scheduled_date: date
    session_type: str
    title: str
    notes: str | None
    status: str
    items: list[PlannedItemOut] = []


class MesocycleOut(BaseModel):
    id: str
    name: str
    phase: str
    week_start: int
    week_end: int
    focus: str | None


class PlanDetail(BaseModel):
    id: str
    goal: str
    title: str
    branch_name: str
    weeks: int
    status: str
    start_date: date
    end_date: date
    training_age: str | None
    created_at: str
    mesocycles: list[MesocycleOut]
    sessions: list[PlannedSessionOut]


class PlannedItemPatch(BaseModel):
    item_id: str | None = None
    movement_name: str
    sets: int | None = None
    reps: str | None = None
    load_pct_1rm: float | None = None
    load_kg: float | None = None
    notes: str | None = None
    item_order: int = 0


class SessionPatch(BaseModel):
    session_id: str
    new_title: str | None = None
    new_notes: str | None = None
    modified_items: list[PlannedItemPatch] = []


class PlanRevisionDiff(BaseModel):
    rationale: str = Field(..., min_length=10, max_length=800)
    changed_sessions: list[SessionPatch]


class PlanRevisionRequest(BaseModel):
    feedback: str = Field(..., min_length=5, max_length=500)
