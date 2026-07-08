"""Pydantic models for the wellness router."""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field


class CheckInRequest(BaseModel):
    sleep: int = Field(..., ge=1, le=7)
    stress: int = Field(..., ge=1, le=7)
    fatigue: int = Field(..., ge=1, le=7)
    soreness: int = Field(..., ge=1, le=7)


class CheckInResponse(BaseModel):
    date: date
    sleep: int
    stress: int
    fatigue: int
    soreness: int
    hooper_index: int


class TodayCheckInResponse(BaseModel):
    submitted: bool
    checkin: CheckInResponse | None
