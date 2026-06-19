from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from enum import StrEnum

from pydantic import BaseModel, Field


class ResultType(StrEnum):
    weight = "weight"
    reps = "reps"
    time = "time"
    distance = "distance"
    calories = "calories"
    height = "height"
    rounds_reps = "rounds_reps"
    watts = "watts"
    pace = "pace"


class Result(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    workout_id: uuid.UUID
    movement_id: uuid.UUID | None
    result_type: ResultType
    load_kg: Decimal | None
    reps: int | None
    time_s: int | None
    distance_m: Decimal | None
    calories: int | None
    height_cm: Decimal | None
    rounds: int | None
    partial_reps: int | None
    watts: int | None
    pace_s_500m: int | None
    set_index: int | None
    order_index: int
    is_pr: bool
    notes: str | None
    created_at: datetime
    updated_at: datetime


class CreateResultRequest(BaseModel):
    movement_id: uuid.UUID | None = None
    result_type: ResultType
    load_kg: Decimal | None = None
    reps: int | None = None
    time_s: int | None = None
    distance_m: Decimal | None = None
    calories: int | None = None
    height_cm: Decimal | None = None
    rounds: int | None = None
    partial_reps: int | None = None
    watts: int | None = None
    pace_s_500m: int | None = None
    set_index: int | None = None
    order_index: int = Field(default=0, ge=0)
    is_pr: bool = False
    notes: str | None = None
