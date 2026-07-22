"""Team sessions router — 9 endpoints (role-suggestions declared before {id})."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Query, Request, Response, status
from psycopg.errors import UniqueViolation

import app.repositories.team_sessions as repo
from app.dependencies.common import Auth, DBConn
from app.middleware.rate_limit import limiter, user_or_ip_key
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


# IMPORTANT: /role-suggestions must be declared before /{team_session_id}
# so FastAPI matches the literal path segment first.
@router.get("/role-suggestions", response_model=RoleSuggestionsResponse)
async def role_suggestions(user: Auth, conn: DBConn) -> RoleSuggestionsResponse:
    sug = await repo.get_role_suggestions(conn, user_id=user.user_id)
    return RoleSuggestionsResponse(suggestions=sug)


@router.post("", response_model=TeamSession, status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute", key_func=user_or_ip_key)
async def create_team_session(
    request: Request,
    user: Auth,
    conn: DBConn,
    req: CreateTeamSessionRequest,
) -> TeamSession:
    try:
        return await repo.create_team_session(conn, user_id=user.user_id, req=req)
    except repo.WorkoutOwnershipError as err:
        raise HTTPException(status_code=403, detail=str(err)) from err
    except UniqueViolation as err:
        raise HTTPException(
            status_code=409, detail="A participant appears more than once in this session"
        ) from err


@router.get("", response_model=TeamSessionListResponse)
async def list_team_sessions(
    user: Auth,
    conn: DBConn,
    before_id: uuid.UUID | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
) -> TeamSessionListResponse:
    items = await repo.list_team_sessions(
        conn, user_id=user.user_id, before_id=before_id, limit=limit
    )
    next_cursor = str(items[-1].id) if len(items) == limit else None
    return TeamSessionListResponse(items=items, next_cursor=next_cursor)


@router.get("/{team_session_id}", response_model=TeamSession)
async def get_team_session(user: Auth, conn: DBConn, team_session_id: uuid.UUID) -> TeamSession:
    ts = await repo.get_team_session(conn, user_id=user.user_id, team_session_id=team_session_id)
    if ts is None:
        raise HTTPException(status_code=404)
    return ts


@router.patch("/{team_session_id}", response_model=TeamSession)
@limiter.limit("30/minute", key_func=user_or_ip_key)
async def patch_team_session(
    request: Request,
    user: Auth,
    conn: DBConn,
    team_session_id: uuid.UUID,
    req: PatchTeamSessionRequest,
) -> TeamSession:
    ts = await repo.patch_team_session(
        conn, user_id=user.user_id, team_session_id=team_session_id, req=req
    )
    if ts is None:
        raise HTTPException(status_code=404)
    return ts


@router.delete("/{team_session_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("30/minute", key_func=user_or_ip_key)
async def delete_team_session(
    request: Request,
    user: Auth,
    conn: DBConn,
    team_session_id: uuid.UUID,
) -> Response:
    deleted = await repo.delete_team_session(
        conn, user_id=user.user_id, team_session_id=team_session_id
    )
    if not deleted:
        raise HTTPException(status_code=404)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{team_session_id}/participants", response_model=TeamSession)
@limiter.limit("30/minute", key_func=user_or_ip_key)
async def add_participant(
    request: Request,
    user: Auth,
    conn: DBConn,
    team_session_id: uuid.UUID,
    req: AddParticipantRequest,
) -> TeamSession:
    try:
        ts = await repo.add_participant(
            conn, user_id=user.user_id, team_session_id=team_session_id, req=req
        )
    except UniqueViolation as err:
        raise HTTPException(status_code=409, detail="User is already a participant") from err
    except repo.WorkoutOwnershipError as err:
        raise HTTPException(status_code=403, detail=str(err)) from err
    if ts is None:
        raise HTTPException(status_code=404)
    return ts


@router.patch("/{team_session_id}/participants/{participant_id}", response_model=TeamSession)
@limiter.limit("30/minute", key_func=user_or_ip_key)
async def patch_participant(
    request: Request,
    user: Auth,
    conn: DBConn,
    team_session_id: uuid.UUID,
    participant_id: uuid.UUID,
    req: PatchParticipantRequest,
) -> TeamSession:
    # App-layer auth: caller must be session creator or the target participant.
    ts = await repo.get_team_session(conn, user_id=user.user_id, team_session_id=team_session_id)
    if ts is None:
        raise HTTPException(status_code=404)
    # Never reveal existence of a participant row to someone without access —
    # a missing/foreign participant_id is 404, not 403 (IDOR prevention).
    participant = await repo.get_participant(
        conn, team_session_id=team_session_id, participant_id=participant_id
    )
    if participant is None:
        raise HTTPException(status_code=404)
    if ts.created_by != user.user_id and participant["user_id"] != user.user_id:
        raise HTTPException(status_code=403)
    try:
        result = await repo.patch_participant(
            conn,
            team_session_id=team_session_id,
            participant_id=participant_id,
            actor_user_id=user.user_id,
            target_user_id=participant["user_id"],
            req=req,
        )
    except repo.WorkoutOwnershipError as err:
        raise HTTPException(status_code=403, detail=str(err)) from err
    if result is None:
        raise HTTPException(status_code=404)
    return result


@router.delete(
    "/{team_session_id}/participants/{participant_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
@limiter.limit("30/minute", key_func=user_or_ip_key)
async def remove_participant(
    request: Request,
    user: Auth,
    conn: DBConn,
    team_session_id: uuid.UUID,
    participant_id: uuid.UUID,
) -> Response:
    # Creator can remove anyone; a user can remove themselves (opt-out).
    ts = await repo.get_team_session(conn, user_id=user.user_id, team_session_id=team_session_id)
    if ts is None:
        raise HTTPException(status_code=404)
    # Never reveal existence of a participant row to someone without access —
    # a missing/foreign participant_id is 404, not 403 (IDOR prevention).
    participant = await repo.get_participant(
        conn, team_session_id=team_session_id, participant_id=participant_id
    )
    if participant is None:
        raise HTTPException(status_code=404)
    if ts.created_by != user.user_id and participant["user_id"] != user.user_id:
        raise HTTPException(status_code=403)
    removed = await repo.remove_participant(
        conn,
        team_session_id=team_session_id,
        participant_id=participant_id,
        actor_user_id=user.user_id,
    )
    if not removed:
        raise HTTPException(status_code=404)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
