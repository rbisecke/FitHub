from __future__ import annotations

import uuid
from typing import Annotated, Any

import psycopg
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel

from app.auth import UserContext, get_current_user
from app.db import get_db
from app.models.team_session import TeamSession
from app.models.workout import (
    CreateWorkoutRequest,
    PatchWorkoutRequest,
    Workout,
    WorkoutListResponse,
)
from app.repositories.team_sessions import get_workout_team_session
from app.repositories.workouts import (
    create_workout,
    delete_workout,
    get_workout,
    list_workouts,
    patch_workout,
)


class ParseNLRequest(BaseModel):
    text: str


class ParseNLResponse(BaseModel):
    title: str
    notes: str


router = APIRouter(prefix="/api/v1/workouts", tags=["workouts"])

Auth = Annotated[UserContext, Depends(get_current_user)]
DBConn = Annotated[psycopg.AsyncConnection[Any], Depends(get_db)]


@router.get("", response_model=WorkoutListResponse)
async def list_workouts_route(
    user: Auth,
    conn: DBConn,
    before_id: uuid.UUID | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=365),
) -> WorkoutListResponse:
    items = await list_workouts(conn, user_id=user.user_id, before_id=before_id, limit=limit)
    next_cursor = str(items[-1].id) if len(items) == limit else None
    return WorkoutListResponse(items=items, next_cursor=next_cursor)


@router.post("", response_model=Workout, status_code=status.HTTP_201_CREATED)
async def create_workout_route(
    user: Auth,
    conn: DBConn,
    req: CreateWorkoutRequest,
) -> Workout:
    return await create_workout(conn, user_id=user.user_id, req=req)


@router.post("/parse-nl", response_model=ParseNLResponse)
async def parse_workout_nl(body: ParseNLRequest, user: Auth) -> ParseNLResponse:
    """Minimal NL workout parser — extracts title from free-form text."""
    import re

    text = body.text.strip()
    parts = re.split(r"[.!?\n]", text)
    title = (parts[0].strip() if parts else text)[:80] or "Workout"
    notes = text if len(text) > len(title) else ""
    return ParseNLResponse(title=title, notes=notes)


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
async def patch_workout_route(
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
async def delete_workout_route(
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
