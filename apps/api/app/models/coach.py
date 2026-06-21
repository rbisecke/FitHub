"""Pydantic models for the coach router."""

from __future__ import annotations

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


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


class _ChatAnswer(BaseModel):
    """Internal instructor response model for chat — required by Mode.JSON providers (Ollama)."""

    answer: str
