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
    movement_name: str | None = None
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
    pace_s: int | None
    pace_distance_m: int
    set_index: int | None
    order_index: int
    is_pr: bool
    notes: str | None
    variant_annotation: str | None
    rpe: Decimal | None
    rpe_target: Decimal | None
    rir: int | None
    rest_s: int | None
    mean_velocity_ms: Decimal | None
    peak_velocity_ms: Decimal | None
    estimated_1rm_kg: Decimal | None
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
    pace_s: int | None = None
    pace_distance_m: int = Field(default=500, gt=0)
    set_index: int | None = None
    order_index: int = Field(default=0, ge=0)
    is_pr: bool = False
    notes: str | None = None
    variant_annotation: str | None = None
    rpe: Decimal | None = Field(default=None, ge=0, le=10)
    rpe_target: Decimal | None = Field(default=None, ge=0, le=10)
    rir: int | None = Field(default=None, ge=0, le=10)
    rest_s: int | None = Field(default=None, ge=0)
    mean_velocity_ms: Decimal | None = Field(default=None, ge=0)
    peak_velocity_ms: Decimal | None = Field(default=None, ge=0)
