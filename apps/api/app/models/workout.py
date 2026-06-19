from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from enum import StrEnum

from pydantic import BaseModel, Field

from app.models.result import CreateResultRequest, Result


class SessionType(StrEnum):
    strength = "strength"
    metcon = "metcon"
    skill = "skill"
    mixed = "mixed"
    rest = "rest"
    deload = "deload"
    active_recovery = "active_recovery"


class WorkoutFormat(StrEnum):
    strength = "strength"
    amrap = "amrap"
    emom = "emom"
    for_time = "for_time"
    tabata = "tabata"
    intervals = "intervals"
    chipper = "chipper"
    benchmark = "benchmark"
    open = "open"
    partner = "partner"
    team = "team"


class Workout(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    performed_at: datetime
    title: str | None
    short_hash: str
    notes: str | None
    bodyweight_kg: Decimal | None
    session_type: SessionType | None
    workout_format: WorkoutFormat | None
    time_cap_s: int | None
    location: str | None
    session_rpe: Decimal | None
    duration_s: int | None
    perceived_load_au: int | None
    volume_load_kg: Decimal | None
    avg_hr: int | None
    max_hr: int | None
    trimp_au: Decimal | None
    created_at: datetime
    updated_at: datetime
    results: list[Result] = Field(default_factory=list)


class WorkoutSummary(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    performed_at: datetime
    title: str | None
    short_hash: str
    notes: str | None
    bodyweight_kg: Decimal | None
    session_type: SessionType | None
    workout_format: WorkoutFormat | None
    time_cap_s: int | None
    location: str | None
    session_rpe: Decimal | None
    duration_s: int | None
    perceived_load_au: int | None
    volume_load_kg: Decimal | None
    avg_hr: int | None
    max_hr: int | None
    trimp_au: Decimal | None
    created_at: datetime
    updated_at: datetime
    result_count: int = 0


class CreateWorkoutRequest(BaseModel):
    performed_at: datetime
    title: str | None = None
    notes: str | None = None
    bodyweight_kg: Decimal | None = Field(default=None, gt=0, le=600)
    session_type: SessionType | None = None
    workout_format: WorkoutFormat | None = None
    time_cap_s: int | None = Field(default=None, gt=0)
    location: str | None = None
    session_rpe: Decimal | None = Field(default=None, ge=0, le=10)
    duration_s: int | None = Field(default=None, gt=0)
    results: list[CreateResultRequest] = Field(default_factory=list)


class PatchWorkoutRequest(BaseModel):
    performed_at: datetime | None = None
    title: str | None = None
    notes: str | None = None
    bodyweight_kg: Decimal | None = Field(default=None, gt=0, le=600)
    session_type: SessionType | None = None
    workout_format: WorkoutFormat | None = None
    time_cap_s: int | None = Field(default=None, gt=0)
    location: str | None = None
    session_rpe: Decimal | None = Field(default=None, ge=0, le=10)
    duration_s: int | None = Field(default=None, gt=0)


class WorkoutListResponse(BaseModel):
    items: list[WorkoutSummary]
    next_cursor: str | None
