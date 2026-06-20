"""Pydantic models for the injuries router."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ReportInjuryRequest(BaseModel):
    body_region: Literal[
        "shoulder", "knee", "hip", "lower_back", "wrist", "elbow", "ankle", "neck", "other"
    ]
    pain_level: int = Field(..., ge=0, le=10)
    mechanism: Literal["overuse", "acute", "unknown"] | None = None
    notes: str | None = Field(None, max_length=2000)


class InjuryOut(BaseModel):
    id: str
    user_id: str
    body_region: str
    pain_level: int
    mechanism: str | None = None
    notes: str | None = None
    active: bool
    requires_referral: bool
    substitutions: list[str] = []
    contraindicated: list[str] = []
    reported_at: datetime | None = None
    resolved_at: datetime | None = None
