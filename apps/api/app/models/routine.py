from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated

from pydantic import AfterValidator, BaseModel, Field

# Mirrors the active-logging 10-movement hard cap (01 §2.1).
MAX_ROUTINE_MOVEMENTS = 10


def _non_blank(value: str) -> str:
    """Strip and reject a name that is empty once whitespace is removed, so
    validation and the DB CHECK (char_length >= 1) agree — a whitespace-only
    name must 422 here, not 500 on the constraint."""
    stripped = value.strip()
    if not stripped:
        raise ValueError("name must not be blank")
    return stripped


RoutineName = Annotated[str, Field(min_length=1, max_length=100), AfterValidator(_non_blank)]


class RoutineMovementInput(BaseModel):
    """One movement reference in a routine, as submitted by the client.

    Position is derived from list order on the server, not sent by the client,
    so the ordered movement list is authoritative and gap-free.
    """

    movement_id: uuid.UUID
    implement: str | None = Field(default=None, max_length=100)
    side: str | None = Field(default=None, max_length=20)


class RoutineMovement(BaseModel):
    """One movement reference in a saved routine, as returned to the client."""

    movement_id: uuid.UUID
    movement_name: str | None = None
    implement: str | None = None
    side: str | None = None
    position: int


class SavedRoutine(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    display_order: int
    movements: list[RoutineMovement] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class CreateSavedRoutineRequest(BaseModel):
    name: RoutineName
    movements: list[RoutineMovementInput] = Field(
        default_factory=list, max_length=MAX_ROUTINE_MOVEMENTS
    )


class PatchSavedRoutineRequest(BaseModel):
    # Only rename is supported — editing a routine's movement list is out of
    # scope for this pass (01 §2.9): delete and re-save to change movements.
    name: RoutineName


class ReorderRoutinesRequest(BaseModel):
    routine_ids: list[uuid.UUID] = Field(..., min_length=1, max_length=100)
