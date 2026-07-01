"""Pydantic models for the injuries router."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Literal

from pydantic import BaseModel, Field, computed_field


class ReportInjuryRequest(BaseModel):
    body_region: Literal[
        # joint regions
        "shoulder",
        "knee",
        "hip",
        "lower_back",
        "wrist",
        "elbow",
        "ankle",
        "neck",
        # muscle belly regions
        "hamstring",
        "quad",
        "calf",
        "glute",
        "upper_back",
        "chest",
        "bicep",
        "tricep",
        "lat",
        # soft-tissue / connective structures
        "hip_flexor",
        "it_band",
        "forearm",
        # fallback
        "other",
    ]
    pain_level: int = Field(..., ge=0, le=10)
    mechanism: Literal["overuse", "acute", "unknown"] | None = None
    notes: str | None = Field(None, max_length=2000)


class UpdateInjuryStatusRequest(BaseModel):
    status: Literal["cleared_with_restrictions", "resolved"]
    restriction_notes: str | None = Field(None, max_length=1000)


class InjuryOut(BaseModel):
    id: str
    user_id: str
    body_region: str
    pain_level: int
    mechanism: str | None = None
    notes: str | None = None
    active: bool
    status: str = "active"
    requires_referral: bool
    substitutions: list[str] = []
    contraindicated: list[str] = []
    reported_at: datetime | None = None
    resolved_at: datetime | None = None
    cleared_at: datetime | None = None
    restriction_notes: str | None = None

    @computed_field  # type: ignore[prop-decorator]
    @property
    def staleness_days(self) -> int:
        from datetime import date

        ref = self.resolved_at or self.reported_at
        if ref is None:
            return 0
        ref_date = ref.astimezone(UTC).date() if ref.tzinfo else ref.date()
        return (date.today() - ref_date).days
