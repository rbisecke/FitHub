"""Pydantic models for the injuries router."""

from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, Field, computed_field


class BodyRegion(StrEnum):
    # joint regions
    SHOULDER = "shoulder"
    KNEE = "knee"
    HIP = "hip"
    LOWER_BACK = "lower_back"
    WRIST = "wrist"
    ELBOW = "elbow"
    ANKLE = "ankle"
    NECK = "neck"
    # muscle belly regions
    HAMSTRING = "hamstring"
    QUAD = "quad"
    CALF = "calf"
    GLUTE = "glute"
    UPPER_BACK = "upper_back"
    CHEST = "chest"
    BICEP = "bicep"
    TRICEP = "tricep"
    LAT = "lat"
    # soft-tissue / connective structures
    HIP_FLEXOR = "hip_flexor"
    IT_BAND = "it_band"
    FOREARM = "forearm"
    # tendon / soft tissue additions
    ROTATOR_CUFF = "rotator_cuff"
    PATELLAR_TENDON = "patellar_tendon"
    LATERAL_ELBOW = "lateral_elbow"
    MEDIAL_ELBOW = "medial_elbow"
    # foot / plantar
    ARCH = "arch"
    ACHILLES = "achilles"
    SHIN = "shin"
    # joint additions
    GROIN = "groin"
    SI_JOINT = "si_joint"
    # fallback
    OTHER = "other"


class ReportInjuryRequest(BaseModel):
    body_region: BodyRegion
    pain_level: int = Field(..., ge=0, le=10)
    mechanism: Literal["overuse", "acute", "unknown"] | None = None
    notes: str | None = Field(None, max_length=2000)


class UpdateInjuryStatusRequest(BaseModel):
    status: Literal["cleared_with_restrictions", "resolved", "permanent"]
    restriction_notes: str | None = Field(None, max_length=1000)


class InjuryOut(BaseModel):
    id: str
    user_id: str
    body_region: BodyRegion
    pain_level: int
    mechanism: str | None = None
    notes: str | None = None
    active: bool
    status: Literal["active", "cleared_with_restrictions", "permanent", "resolved"] = "active"
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
        ref = self.resolved_at or self.reported_at
        if ref is None:
            return 0
        ref_date = ref.astimezone(UTC).date() if ref.tzinfo else ref.date()
        return (datetime.now(UTC).date() - ref_date).days
