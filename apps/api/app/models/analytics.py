from __future__ import annotations

from datetime import date

from pydantic import BaseModel


class DailyLoadPoint(BaseModel):
    day: date
    load_au: float
    atl: float
    ctl: float
    tsb: float
    acwr: float | None


class LoadModelResponse(BaseModel):
    series: list[DailyLoadPoint]
    acwr_now: float | None
    ctl_now: float
    atl_now: float
    tsb_now: float
    acwr_zone: str


class PersonalRecord(BaseModel):
    movement_id: str
    movement_name: str
    best_1rm_kg: float
    achieved_at: date
    workout_id: str


class E1RMPoint(BaseModel):
    day: date
    estimated_1rm_kg: float
    workout_id: str


class WeeklyVolume(BaseModel):
    week_start: date
    session_type: str | None
    total_load: float
    workout_count: int


class VolumeTrendResponse(BaseModel):
    weeks: list[WeeklyVolume]


class ReadinessResponse(BaseModel):
    score: float
    label: str
    acwr: float | None
    tsb: float
    mood_avg: float | None
    energy_avg: float | None
    sleep_avg: float | None
    factors_available: int
