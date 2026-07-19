from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum

from pydantic import BaseModel, Field

from app.models.result import ResultType


class Modality(StrEnum):
    strength = "strength"
    weightlifting = "weightlifting"
    gymnastics = "gymnastics"
    mono_structural = "mono_structural"
    plyometric = "plyometric"
    carry = "carry"
    strongman = "strongman"


class ExecutionStyle(StrEnum):
    strict = "strict"
    kipping = "kipping"
    butterfly = "butterfly"
    touch_and_go = "touch_and_go"
    dead_stop = "dead_stop"
    rebound = "rebound"


class MovementPattern(StrEnum):
    squat = "squat"
    hinge = "hinge"
    push_horizontal = "push_horizontal"
    push_vertical = "push_vertical"
    pull_horizontal = "pull_horizontal"
    pull_vertical = "pull_vertical"
    carry = "carry"
    rotation = "rotation"
    locomotion = "locomotion"


class LimbStyle(StrEnum):
    bilateral = "bilateral"
    unilateral = "unilateral"
    alternating = "alternating"


_TEMPO_RE = r"^[0-9X]{1,2}[0-9X]{1,2}[0-9X]{1,2}[0-9X]{1,2}$"


class Movement(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    base_movement: str
    modality: Modality
    start_position: str | None
    catch_position: str | None
    pause_position: str | None
    tempo: str | None
    execution_style: ExecutionStyle | None
    movement_pattern: MovementPattern | None
    limb_style: LimbStyle | None
    implement: str | None
    default_result_types: list[ResultType]
    default_result_type: ResultType | None
    is_official: bool
    created_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


class CreateMovementRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    slug: str = Field(..., min_length=1, max_length=200, pattern=r"^[a-z0-9-]+$")
    base_movement: str = Field(..., min_length=1, max_length=200)
    modality: Modality
    start_position: str | None = Field(default=None, max_length=200)
    catch_position: str | None = Field(default=None, max_length=200)
    pause_position: str | None = Field(default=None, max_length=200)
    tempo: str | None = Field(default=None, pattern=_TEMPO_RE)
    execution_style: ExecutionStyle | None = None
    movement_pattern: MovementPattern | None = None
    limb_style: LimbStyle | None = None
    implement: str | None = Field(default=None, max_length=100)
    default_result_types: list[ResultType] = Field(default_factory=list, max_length=10)
    default_result_type: ResultType | None = None


class LastResult(BaseModel):
    result_type: ResultType
    load_kg: Decimal | None
    reps: int | None
    time_s: int | None
    distance_m: Decimal | None
    rounds: int | None
    partial_reps: int | None
    calories: int | None
    watts: int | None
    performed_at: date


class PersonalRecordResult(BaseModel):
    movement_id: uuid.UUID
    result_type: ResultType
    load_kg: Decimal | None = None
    reps: int | None = None
    time_s: int | None = None
    distance_m: Decimal | None = None
    estimated_1rm_kg: Decimal | None = None
    achieved_at: date


class MovementSubstituteOut(BaseModel):
    id: uuid.UUID
    name: str
    movement_pattern: MovementPattern
    equipment_required: list[str]


class SkillContextOut(BaseModel):
    """The real, history-aware skill-prerequisite chain for a target movement.

    `available` is False when the movement has no defined prerequisite chain
    (its slug isn't a SKILL_PREREQUISITES key) — a legitimate, expected state
    for most movements, not an error. In that case every other field is empty/
    null and the frontend renders "No prerequisite ladder for this skill"
    rather than an empty ladder.
    """

    available: bool
    target_skill: str | None = None
    prerequisite_chain: list[str] = Field(default_factory=list)
    confirmed_prerequisites: list[str] = Field(default_factory=list)
    current_entry_point: str | None = None
