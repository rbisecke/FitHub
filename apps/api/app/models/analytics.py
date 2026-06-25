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
    load_kg: float | None = None
    reps: int | None = None
    time_s: int | None = None
    prev_best_1rm_kg: float | None = None
    delta_kg: float | None = None


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


class BenchmarkAttempt(BaseModel):
    date: date
    result_display: str
    result_seconds: int


class BenchmarkEntry(BaseModel):
    name: str
    attempts: list[BenchmarkAttempt]
    pr_display: str
    improvement_display: str


class BenchmarkResponse(BaseModel):
    benchmarks: list[BenchmarkEntry]


class TrainingBalanceCategory(BaseModel):
    category: str
    volume_pct: float
    load_au: float


class TrainingBalanceResponse(BaseModel):
    breakdown: list[TrainingBalanceCategory]
    period_days: int


class ReadinessResponse(BaseModel):
    score: float
    label: str
    acwr: float | None
    tsb: float
    mood_avg: float | None
    energy_avg: float | None
    sleep_avg: float | None
    factors_available: int
    # Wearable-derived fields (populated from derived_metrics when available)
    recovery_score: float | None = None
    coverage: float | None = None
    confidence_tier: str | None = None
    hrv_type: str | None = None
