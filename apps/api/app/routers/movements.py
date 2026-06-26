from __future__ import annotations

import uuid
from typing import Annotated, Any

import psycopg
from fastapi import APIRouter, Depends, HTTPException, Query, status
from psycopg import errors as pg_errors

from app.auth import UserContext, get_current_user
from app.db import get_db
from app.models.movement import (
    CreateMovementRequest,
    LastResult,
    Modality,
    Movement,
    PersonalRecordResult,
)
from app.repositories.movements import (
    create_movement,
    get_last_result_for_movement,
    get_personal_record,
    search_movements,
)

router = APIRouter(prefix="/api/v1/movements", tags=["movements"])

Auth = Annotated[UserContext, Depends(get_current_user)]
DBConn = Annotated[psycopg.AsyncConnection[Any], Depends(get_db)]


@router.get("", response_model=list[Movement])
async def list_movements(
    user: Auth,
    conn: DBConn,
    query: str | None = Query(default=None, max_length=200),
    modality: Modality | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
) -> list[Movement]:
    return await search_movements(conn, query=query, modality=modality, limit=limit)


@router.post("", response_model=Movement, status_code=status.HTTP_201_CREATED)
async def create_movement_route(
    user: Auth,
    conn: DBConn,
    req: CreateMovementRequest,
) -> Movement:
    try:
        return await create_movement(conn, user_id=user.user_id, req=req)
    except pg_errors.UniqueViolation:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A movement with that name or slug already exists.",
        ) from None


@router.get("/{movement_id}/last-result", response_model=LastResult)
async def get_last_result(
    movement_id: uuid.UUID,
    user: Auth,
    conn: DBConn,
) -> LastResult:
    result = await get_last_result_for_movement(conn, user_id=user.user_id, movement_id=movement_id)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No previous result found",
        )
    return result


@router.get(
    "/{movement_id}/personal-record",
    response_model=PersonalRecordResult | None,
)
async def get_movement_personal_record(
    movement_id: uuid.UUID,
    user: Auth,
    conn: DBConn,
) -> PersonalRecordResult | None:
    return await get_personal_record(
        conn,
        user_id=user.user_id,
        movement_id=movement_id,
    )
