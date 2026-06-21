"""Pydantic models for the adaptations router."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class AdaptationOut(BaseModel):
    id: str
    plan_id: str
    user_id: str
    trigger_type: str
    trigger_data: dict[str, object]
    status: str
    rationale: str | None = None
    diff_json: object = None
    stub: bool = False
    proposed_at: datetime | None = None
    merged_at: datetime | None = None
    rejected_at: datetime | None = None


class DetectTriggersResponse(BaseModel):
    plan_id: str
    triggers: list[dict[str, object]]
    proposed_adaptations: list[AdaptationOut]
