from __future__ import annotations

import re
import uuid
from datetime import date

from fastapi import APIRouter, HTTPException, Query, Request, Response, status

from app.dependencies.common import Auth, DBConn
from app.middleware.rate_limit import limiter, user_or_ip_key
from app.models.team_session import TeamSession
from app.models.workout import (
    CreateWorkoutRequest,
    ParseNLRequest,
    ParseNLResponse,
    PatchWorkoutRequest,
    SessionType,
    Workout,
    WorkoutListResponse,
)
from app.repositories.team_sessions import get_workout_team_session
from app.repositories.workouts import (
    create_workout,
    delete_workout,
    get_workout,
    get_workout_by_hash,
    list_workouts,
    patch_workout,
)

router = APIRouter(prefix="/api/v1/workouts", tags=["workouts"])


@router.get("", response_model=WorkoutListResponse)
async def list_workouts_route(
    user: Auth,
    conn: DBConn,
    before_id: uuid.UUID | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=365),
    session_type: SessionType | None = Query(default=None),
    partner_only: bool | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
) -> WorkoutListResponse:
    items = await list_workouts(
        conn,
        user_id=user.user_id,
        before_id=before_id,
        limit=limit,
        session_type=session_type,
        partner_only=partner_only,
        date_from=date_from.isoformat() if date_from is not None else None,
        date_to=date_to.isoformat() if date_to is not None else None,
    )
    next_cursor = str(items[-1].id) if len(items) == limit else None
    return WorkoutListResponse(items=items, next_cursor=next_cursor)


@router.post("", response_model=Workout, status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute", key_func=user_or_ip_key)
async def create_workout_route(
    request: Request,
    user: Auth,
    conn: DBConn,
    req: CreateWorkoutRequest,
) -> Workout:
    return await create_workout(conn, user_id=user.user_id, req=req)


@router.post("/parse-nl", response_model=ParseNLResponse)
async def parse_workout_nl(body: ParseNLRequest, user: Auth) -> ParseNLResponse:
    """Minimal NL workout parser — extracts title from free-form text."""

    text = body.text.strip()
    parts = re.split(r"[.!?\n]", text)
    title = (parts[0].strip() if parts else text)[:80] or "Workout"
    notes = text if len(text) > len(title) else ""
    return ParseNLResponse(title=title, notes=notes)


@router.get("/by-hash/{short_hash}", response_model=Workout)
async def get_workout_by_hash_route(
    user: Auth,
    conn: DBConn,
    short_hash: str,
) -> Workout:
    """Resolve a workout by its cosmetic 8-hex short_hash (01 §6 routing)."""
    if not re.fullmatch(r"[0-9a-f]{8}", short_hash):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    workout = await get_workout_by_hash(conn, user_id=user.user_id, short_hash=short_hash)
    if workout is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return workout


@router.get("/{workout_id}", response_model=Workout)
async def get_workout_route(
    user: Auth,
    conn: DBConn,
    workout_id: uuid.UUID,
) -> Workout:
    workout = await get_workout(conn, user_id=user.user_id, workout_id=workout_id)
    if workout is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return workout


@router.patch("/{workout_id}", response_model=Workout)
@limiter.limit("30/minute", key_func=user_or_ip_key)
async def patch_workout_route(
    request: Request,
    user: Auth,
    conn: DBConn,
    workout_id: uuid.UUID,
    req: PatchWorkoutRequest,
) -> Workout:
    workout = await patch_workout(conn, user_id=user.user_id, workout_id=workout_id, req=req)
    if workout is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return workout


@router.delete("/{workout_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("30/minute", key_func=user_or_ip_key)
async def delete_workout_route(
    request: Request,
    user: Auth,
    conn: DBConn,
    workout_id: uuid.UUID,
) -> Response:
    deleted = await delete_workout(conn, user_id=user.user_id, workout_id=workout_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{workout_id}/team-session", response_model=TeamSession)
async def get_workout_team_session_route(
    user: Auth,
    conn: DBConn,
    workout_id: uuid.UUID,
) -> TeamSession:
    ts = await get_workout_team_session(conn, user_id=user.user_id, workout_id=workout_id)
    if ts is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return ts
