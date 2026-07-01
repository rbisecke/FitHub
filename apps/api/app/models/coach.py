"""Pydantic models for the coach router."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Internal context models (not serialised — used to build system prompts)
# ---------------------------------------------------------------------------


@dataclass
class ActiveInjurySummary:
    body_region: str
    pain_level: int
    notes: str | None
    requires_referral: bool
    contraindicated: list[str] = field(default_factory=list)


@dataclass
class PlannedItem:
    movement_name: str
    sets: int | None
    reps: str | None
    load_kg: float | None
    load_pct_1rm: float | None


@dataclass
class TodaySessionContext:
    session_type: str
    title: str
    items: list[PlannedItem] = field(default_factory=list)


class MovementResult(BaseModel):
    movement_name: str
    result_type: Literal["reps", "time_s", "distance_m", "weight_kg", "rounds", "calories"]
    reps: int | None = None
    load_kg: float | None = None
    time_s: float | None = None
    scaled: bool = False
    notes: str | None = None


class ParsedLogEntry(BaseModel):
    title: str | None = None
    session_type: Literal["metcon", "strength", "skill", "cardio", "mixed", "rest", "unknown"]
    workout_format: (
        Literal["amrap", "for_time", "emom", "tabata", "rft", "straight_sets", "other"] | None
    ) = None
    duration_s: int | None = None
    session_rpe: float | None = Field(None, ge=0.0, le=10.0)
    results: list[MovementResult] = []
    parsing_notes: str = ""


class ParseLogRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)


class ParseLogResponse(BaseModel):
    parsed: ParsedLogEntry
    confidence: float = Field(..., ge=0.0, le=1.0)
    stub: bool = False


class Citation(BaseModel):
    title: str
    source_type: str
    score: float


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)
    session_id: UUID | None = None


class ChatResponse(BaseModel):
    answer: str
    citations: list[Citation] = []
    stub: bool = False
    safety_tier: str | None = None


class HistoryMessage(BaseModel):
    role: str
    content: str
    created_at: datetime


class ChatStreamRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    session_id: UUID | None = None


class CoachSession(BaseModel):
    id: UUID
    title: str
    created_at: datetime


class SessionMessagesResponse(BaseModel):
    messages: list[HistoryMessage]
    has_more: bool


class _ChatAnswer(BaseModel):
    """Internal instructor response model for chat — required by Mode.JSON providers (Ollama)."""

    answer: str


# ---------------------------------------------------------------------------
# modify-workout endpoint models
# ---------------------------------------------------------------------------


class MovementModification(BaseModel):
    original_movement: str
    driven_by: list[str]
    substitutions: list[str]
    confidence: Literal["curated", "llm_generated"] = "curated"


class ModifyWorkoutRequest(BaseModel):
    session_id: UUID


class ModifyWorkoutResponse(BaseModel):
    session_id: str
    modifications: list[MovementModification]
    safe_movements: list[str]
    any_referral_required: bool
    referral_regions: list[str]
