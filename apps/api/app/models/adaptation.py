"""Pydantic models for the adaptations router."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class AdaptationOut(BaseModel):
    id: str
    plan_id: str
    user_id: str
    trigger_type: Literal["high_acwr", "low_readiness", "missed_session", "rpe_creep"]
    trigger_data: dict[str, object]
    status: Literal["proposed", "merged", "rejected"]
    rationale: str | None = None
    rejection_reason: str | None = None
    diff_json: object = None
    stub: bool = False
    proposed_at: datetime | None = None
    merged_at: datetime | None = None
    rejected_at: datetime | None = None


class TriggerOut(BaseModel):
    type: str
    data: dict[str, object]


class DetectTriggersResponse(BaseModel):
    plan_id: str
    triggers: list[TriggerOut]
    proposed_adaptations: list[AdaptationOut]


class RejectAdaptationRequest(BaseModel):
    rejection_reason: str | None = Field(default=None, max_length=1000)


class AdjustAdaptationRequest(BaseModel):
    feedback: str = Field(..., min_length=5, max_length=1000)
