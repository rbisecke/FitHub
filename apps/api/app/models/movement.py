from __future__ import annotations

import uuid
from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class Modality(StrEnum):
    strength = "strength"
    weightlifting = "weightlifting"
    gymnastics = "gymnastics"
    mono_structural = "mono_structural"
    wod = "wod"


_TEMPO_RE = r"^[0-9X]{1,2}[0-9X]{1,2}[0-9X]{1,2}[0-9X]{1,2}$"


class Movement(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    base_movement: str
    modality: Modality
    start_position: str | None
    catch_position: str | None
    pause_position: str | None
    tempo: str | None
    implement: str | None
    default_result_types: list[str]
    is_official: bool
    created_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime


class CreateMovementRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    slug: str = Field(..., min_length=1, max_length=200, pattern=r"^[a-z0-9-]+$")
    base_movement: str = Field(..., min_length=1, max_length=200)
    modality: Modality
    start_position: str | None = None
    catch_position: str | None = None
    pause_position: str | None = None
    tempo: str | None = Field(default=None, pattern=_TEMPO_RE)
    implement: str | None = None
    default_result_types: list[str] = Field(default_factory=list)
