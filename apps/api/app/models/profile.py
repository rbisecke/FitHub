from __future__ import annotations

import datetime
import uuid
from typing import Annotated, Any, Literal

from pydantic import BaseModel, Field, field_validator

from app.models.movement import Modality

# Finite value sets shared by UserProfile (read) and PatchProfileRequest (write).
PrimaryGoal = Literal[
    "build_strength",
    "gain_muscle",
    "lose_weight",
    "improve_conditioning",
    "compete",
    "return_from_break",
    "general_fitness",
]

EquipmentAccess = Literal[
    "barbell",
    "dumbbells",
    "kettlebells",
    "rig_pull_up",
    "rower_erg",
    "machines",
    "none",
]


def _validate_equipment(value: list[EquipmentAccess] | None) -> list[EquipmentAccess] | None:
    """'none' (bodyweight only) is mutually exclusive with real equipment."""
    if value is not None and "none" in value and len(value) > 1:
        raise ValueError("'none' cannot be combined with other equipment")
    return value


class UserProfile(BaseModel):
    display_name: str | None
    email: str
    avatar_url: str | None
    timezone: str
    first_workout_date: str | None  # "YYYY-MM-DD" or None
    frequency_target_days: int  # 1–7
    graph_colour_mode: Literal["intensity", "volume"]
    weight_unit: Literal["kg", "lb"]
    checkin_enabled: bool
    onboarding_completed: bool
    # Extended profile fields
    bio: str | None = None
    location: str | None = None
    box_affiliation: str | None = None
    distance_unit: Literal["km", "mi"] = "km"
    training_level: (
        Literal["recreational", "intermediate", "competitive", "masters", "elite"] | None
    ) = None
    training_since: str | None = None  # 'YYYY-MM-DD'
    primary_goal: PrimaryGoal | None = None
    equipment_access: list[EquipmentAccess] | None = None


class ProfileStats(BaseModel):
    total_workouts: int
    total_prs: int
    best_streak_weeks: int
    movements_tracked: int


class PatchProfileRequest(BaseModel):
    frequency_target_days: int | None = Field(default=None, ge=1, le=7)
    graph_colour_mode: Literal["intensity", "volume"] | None = None
    weight_unit: Literal["kg", "lb"] | None = None  # maps to unit_preference column in DB
    checkin_enabled: bool | None = None
    onboarding_completed: bool | None = None
    # Extended patchable fields
    display_name: str | None = Field(default=None, max_length=50)
    bio: Annotated[str, Field(max_length=160)] | None = None
    location: str | None = Field(default=None, max_length=200)
    box_affiliation: str | None = Field(default=None, max_length=200)
    distance_unit: Literal["km", "mi"] | None = None
    training_level: (
        Literal["recreational", "intermediate", "competitive", "masters", "elite"] | None
    ) = None
    training_since: datetime.date | None = None
    primary_goal: PrimaryGoal | None = None
    # min_length keeps [] out: NULL means "unanswered", not "empty selection".
    equipment_access: list[EquipmentAccess] | None = Field(default=None, min_length=1)

    @field_validator("equipment_access")
    @classmethod
    def _check_equipment(cls, value: list[EquipmentAccess] | None) -> list[EquipmentAccess] | None:
        return _validate_equipment(value)


class PinnedMovement(BaseModel):
    movement_id: uuid.UUID
    movement_name: str
    modality: Modality
    display_order: int
    personal_record: dict[str, Any] | None = None


class SetPinnedMovementsRequest(BaseModel):
    movement_ids: list[uuid.UUID] = Field(default_factory=list, max_length=6)


class UserSearchResult(BaseModel):
    user_id: uuid.UUID
    display_name: str | None


class StreakState(BaseModel):
    """The one canonical, server-computed streak object (Domain 07 §D) —
    every surface renders from this rather than recomputing its own."""

    current_streak: int
    personal_best: int
    this_week_count: int
    frequency_target: int
    at_risk: bool
    is_comeback: bool
    freezes_remaining: int
    freeze_consumed_this_week: bool
