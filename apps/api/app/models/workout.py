from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.result import CreateResultRequest, Result


class Workout(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    performed_at: datetime
    title: str | None
    short_hash: str
    notes: str | None
    bodyweight_kg: Decimal | None
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
    created_at: datetime
    updated_at: datetime
    result_count: int = 0


class CreateWorkoutRequest(BaseModel):
    performed_at: datetime
    title: str | None = None
    notes: str | None = None
    bodyweight_kg: Decimal | None = Field(default=None, gt=0, le=600)
    results: list[CreateResultRequest] = Field(default_factory=list)


class PatchWorkoutRequest(BaseModel):
    performed_at: datetime | None = None
    title: str | None = None
    notes: str | None = None
    bodyweight_kg: Decimal | None = Field(default=None, gt=0, le=600)


class WorkoutListResponse(BaseModel):
    items: list[WorkoutSummary]
    next_cursor: str | None
