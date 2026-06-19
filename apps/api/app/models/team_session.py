from __future__ import annotations

import uuid
from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field, model_validator


class ScoringType(StrEnum):
    for_time = "for_time"
    amrap = "amrap"
    total_reps = "total_reps"
    max_load = "max_load"
    relay = "relay"
    slowest_finisher = "slowest_finisher"


class TeamSessionStatus(StrEnum):
    active = "active"
    completed = "completed"


class NotificationType(StrEnum):
    team_session_linked = "team_session_linked"
    team_session_updated = "team_session_updated"
    workout_link_pending = "workout_link_pending"


class TeamSessionParticipant(BaseModel):
    id: uuid.UUID
    team_session_id: uuid.UUID
    user_id: uuid.UUID | None
    workout_id: uuid.UUID | None
    guest_name: str | None
    role: str | None
    joined_at: datetime


class CreateParticipantRequest(BaseModel):
    user_id: uuid.UUID | None = None
    workout_id: uuid.UUID | None = None
    guest_name: str | None = None
    role: str | None = None

    @model_validator(mode="after")
    def require_identity(self) -> CreateParticipantRequest:
        if self.user_id is None and self.guest_name is None:
            raise ValueError("participant must have user_id or guest_name")
        return self


class AddParticipantRequest(CreateParticipantRequest):
    pass


class PatchParticipantRequest(BaseModel):
    workout_id: uuid.UUID | None = None
    role: str | None = None


class TeamSession(BaseModel):
    id: uuid.UUID
    created_by: uuid.UUID
    name: str | None
    team_size: int
    scoring_type: ScoringType | None
    team_score: str | None
    team_score_s: int | None
    team_score_reps: int | None
    status: TeamSessionStatus
    performed_at: datetime
    notes: str | None
    created_at: datetime
    updated_at: datetime
    participants: list[TeamSessionParticipant] = Field(default_factory=list)


class TeamSessionSummary(BaseModel):
    id: uuid.UUID
    created_by: uuid.UUID
    name: str | None
    team_size: int
    scoring_type: ScoringType | None
    team_score: str | None
    team_score_s: int | None
    team_score_reps: int | None
    status: TeamSessionStatus
    performed_at: datetime
    participant_count: int


class CreateTeamSessionRequest(BaseModel):
    performed_at: datetime
    name: str | None = None
    team_size: int = Field(default=2, ge=2, le=20)
    scoring_type: ScoringType | None = None
    team_score: str | None = None
    team_score_s: int | None = Field(default=None, gt=0)
    team_score_reps: int | None = Field(default=None, gt=0)
    notes: str | None = None
    participants: list[CreateParticipantRequest] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_score_consistency(self) -> CreateTeamSessionRequest:
        time_types = {ScoringType.for_time, ScoringType.relay, ScoringType.slowest_finisher}
        if (
            self.scoring_type in time_types
            and self.team_score is not None
            and self.team_score_s is None
        ):
            raise ValueError("team_score_s required for time-based scoring types")
        return self


class PatchTeamSessionRequest(BaseModel):
    name: str | None = None
    scoring_type: ScoringType | None = None
    team_score: str | None = None
    team_score_s: int | None = Field(default=None, gt=0)
    team_score_reps: int | None = Field(default=None, gt=0)
    notes: str | None = None
    status: TeamSessionStatus | None = None


class TrainingPartner(BaseModel):
    user_id: uuid.UUID | None
    guest_name: str | None
    display_name: str
    session_count: int
    most_common_format: str | None


class Notification(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    type: NotificationType
    payload: dict[str, object]
    read_at: datetime | None
    created_at: datetime


class TeamSessionListResponse(BaseModel):
    items: list[TeamSessionSummary]
    next_cursor: str | None


class RoleSuggestionsResponse(BaseModel):
    suggestions: list[str]
