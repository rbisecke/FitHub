from __future__ import annotations

from pydantic import BaseModel


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
