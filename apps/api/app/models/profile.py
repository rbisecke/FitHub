from __future__ import annotations

import datetime
import uuid
from typing import Annotated, Any, Literal

from pydantic import BaseModel, Field


class UserProfile(BaseModel):
    display_name: str | None
    email: str
    avatar_url: str | None
    timezone: str
    first_workout_date: str | None  # "YYYY-MM-DD" or None
    frequency_target_days: int  # 1–7
    graph_colour_mode: str  # 'intensity' | 'volume'
    weight_unit: str  # 'kg' | 'lb'
    checkin_enabled: bool
    onboarding_completed: bool
    # Extended profile fields
    bio: str | None = None
    location: str | None = None
    box_affiliation: str | None = None
    distance_unit: str = "km"  # 'km' | 'mi'
    training_level: str | None = (
        None  # 'recreational'|'intermediate'|'competitive'|'masters'|'elite'
    )
    training_since: str | None = None  # 'YYYY-MM-DD'


class ProfileStats(BaseModel):
    total_workouts: int
    total_prs: int
    best_streak_weeks: int
    movements_tracked: int


class PatchProfileRequest(BaseModel):
    frequency_target_days: int | None = None
    graph_colour_mode: str | None = None
    weight_unit: str | None = None  # maps to unit_preference column in DB
    checkin_enabled: bool | None = None
    onboarding_completed: bool | None = None
    # Extended patchable fields
    display_name: str | None = None
    bio: Annotated[str, Field(max_length=160)] | None = None
    location: str | None = None
    box_affiliation: str | None = None
    distance_unit: Literal["km", "mi"] | None = None
    training_level: (
        Literal["recreational", "intermediate", "competitive", "masters", "elite"] | None
    ) = None
    training_since: datetime.date | None = None


class PinnedMovement(BaseModel):
    movement_id: uuid.UUID
    movement_name: str
    modality: str
    display_order: int
    personal_record: dict[str, Any] | None = None


class SetPinnedMovementsRequest(BaseModel):
    movement_ids: list[uuid.UUID] = Field(default_factory=list, max_length=6)
