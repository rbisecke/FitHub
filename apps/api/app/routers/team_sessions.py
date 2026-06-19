"""Team sessions router — 9 endpoints (role-suggestions declared before {id})."""

from __future__ import annotations

import uuid
from typing import Annotated, Any

import psycopg
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from psycopg.errors import UniqueViolation

import app.repositories.team_sessions as repo
from app.auth import UserContext, get_current_user
from app.db import get_db
from app.models.team_session import (
    AddParticipantRequest,
    CreateTeamSessionRequest,
    PatchParticipantRequest,
    PatchTeamSessionRequest,
    RoleSuggestionsResponse,
    TeamSession,
    TeamSessionListResponse,
)

router = APIRouter(prefix="/api/v1/team-sessions", tags=["team-sessions"])

Auth = Annotated[UserContext, Depends(get_current_user)]
DB = Annotated[psycopg.AsyncConnection[Any], Depends(get_db)]


# IMPORTANT: /role-suggestions must be declared before /{team_session_id}
# so FastAPI matches the literal path segment first.
@router.get("/role-suggestions", response_model=RoleSuggestionsResponse)
async def role_suggestions(user: Auth, conn: DB) -> RoleSuggestionsResponse:
    sug = await repo.get_role_suggestions(conn, user_id=user.user_id)
    return RoleSuggestionsResponse(suggestions=sug)


@router.post("", response_model=TeamSession, status_code=status.HTTP_201_CREATED)
async def create_team_session(user: Auth, conn: DB, req: CreateTeamSessionRequest) -> TeamSession:
    return await repo.create_team_session(conn, user_id=user.user_id, req=req)


@router.get("", response_model=TeamSessionListResponse)
async def list_team_sessions(
    user: Auth,
    conn: DB,
    before_id: uuid.UUID | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
) -> TeamSessionListResponse:
    items = await repo.list_team_sessions(
        conn, user_id=user.user_id, before_id=before_id, limit=limit
    )
    next_cursor = str(items[-1].id) if len(items) == limit else None
    return TeamSessionListResponse(items=items, next_cursor=next_cursor)


@router.get("/{team_session_id}", response_model=TeamSession)
async def get_team_session(user: Auth, conn: DB, team_session_id: uuid.UUID) -> TeamSession:
    ts = await repo.get_team_session(conn, user_id=user.user_id, team_session_id=team_session_id)
    if ts is None:
        raise HTTPException(status_code=404)
    return ts


@router.patch("/{team_session_id}", response_model=TeamSession)
async def patch_team_session(
    user: Auth, conn: DB, team_session_id: uuid.UUID, req: PatchTeamSessionRequest
) -> TeamSession:
    ts = await repo.patch_team_session(
        conn, user_id=user.user_id, team_session_id=team_session_id, req=req
    )
    if ts is None:
        raise HTTPException(status_code=404)
    return ts


@router.delete("/{team_session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team_session(user: Auth, conn: DB, team_session_id: uuid.UUID) -> Response:
    deleted = await repo.delete_team_session(
        conn, user_id=user.user_id, team_session_id=team_session_id
    )
    if not deleted:
        raise HTTPException(status_code=404)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{team_session_id}/participants", response_model=TeamSession)
async def add_participant(
    user: Auth, conn: DB, team_session_id: uuid.UUID, req: AddParticipantRequest
) -> TeamSession:
    try:
        ts = await repo.add_participant(
            conn, user_id=user.user_id, team_session_id=team_session_id, req=req
        )
    except UniqueViolation as err:
        raise HTTPException(status_code=409, detail="User is already a participant") from err
    if ts is None:
        raise HTTPException(status_code=404)
    return ts


@router.patch("/{team_session_id}/participants/{participant_user_id}", response_model=TeamSession)
async def patch_participant(
    user: Auth,
    conn: DB,
    team_session_id: uuid.UUID,
    participant_user_id: uuid.UUID,
    req: PatchParticipantRequest,
) -> TeamSession:
    # App-layer auth: caller must be session creator or the target participant.
    ts = await repo.get_team_session(conn, user_id=user.user_id, team_session_id=team_session_id)
    if ts is None:
        raise HTTPException(status_code=404)
    if ts.created_by != user.user_id and participant_user_id != user.user_id:
        raise HTTPException(status_code=403)
    result = await repo.patch_participant(
        conn,
        team_session_id=team_session_id,
        target_user_id=participant_user_id,
        req=req,
    )
    if result is None:
        raise HTTPException(status_code=404)
    return result


@router.delete(
    "/{team_session_id}/participants/{participant_user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_participant(
    user: Auth,
    conn: DB,
    team_session_id: uuid.UUID,
    participant_user_id: uuid.UUID,
) -> Response:
    # Creator can remove anyone; a user can remove themselves (opt-out).
    ts = await repo.get_team_session(conn, user_id=user.user_id, team_session_id=team_session_id)
    if ts is None:
        raise HTTPException(status_code=404)
    if ts.created_by != user.user_id and participant_user_id != user.user_id:
        raise HTTPException(status_code=403)
    removed = await repo.remove_participant(
        conn,
        team_session_id=team_session_id,
        target_user_id=participant_user_id,
    )
    if not removed:
        raise HTTPException(status_code=404)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
