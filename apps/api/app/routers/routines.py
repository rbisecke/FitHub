from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Request, Response, status
from psycopg import errors as pg_errors

from app.dependencies.common import Auth, DBConn
from app.middleware.rate_limit import limiter, user_or_ip_key
from app.models.routine import (
    CreateSavedRoutineRequest,
    PatchSavedRoutineRequest,
    ReorderRoutinesRequest,
    SavedRoutine,
)
from app.repositories.routines import (
    create_routine,
    delete_routine,
    get_routine,
    list_routines,
    rename_routine,
    reorder_routines,
)

router = APIRouter(prefix="/api/v1/routines", tags=["routines"])


@router.get("", response_model=list[SavedRoutine])
async def list_routines_route(user: Auth, conn: DBConn) -> list[SavedRoutine]:
    return await list_routines(conn, user_id=user.user_id)


@router.post("", response_model=SavedRoutine, status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute", key_func=user_or_ip_key)
async def create_routine_route(
    request: Request,
    user: Auth,
    conn: DBConn,
    req: CreateSavedRoutineRequest,
) -> SavedRoutine:
    try:
        return await create_routine(conn, user_id=user.user_id, req=req)
    except pg_errors.ForeignKeyViolation:
        # A movement_id that doesn't exist in the catalog — a client input error,
        # surfaced as 400 rather than a scrubbed 500.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more movement_id values do not exist.",
        ) from None


@router.put("/reorder", response_model=list[SavedRoutine])
@limiter.limit("30/minute", key_func=user_or_ip_key)
async def reorder_routines_route(
    request: Request,
    user: Auth,
    conn: DBConn,
    req: ReorderRoutinesRequest,
) -> list[SavedRoutine]:
    return await reorder_routines(conn, user_id=user.user_id, routine_ids=req.routine_ids)


@router.get("/{routine_id}", response_model=SavedRoutine)
async def get_routine_route(
    user: Auth,
    conn: DBConn,
    routine_id: uuid.UUID,
) -> SavedRoutine:
    routine = await get_routine(conn, user_id=user.user_id, routine_id=routine_id)
    if routine is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return routine


@router.patch("/{routine_id}", response_model=SavedRoutine)
@limiter.limit("30/minute", key_func=user_or_ip_key)
async def patch_routine_route(
    request: Request,
    user: Auth,
    conn: DBConn,
    routine_id: uuid.UUID,
    req: PatchSavedRoutineRequest,
) -> SavedRoutine:
    routine = await rename_routine(conn, user_id=user.user_id, routine_id=routine_id, name=req.name)
    if routine is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return routine


@router.delete("/{routine_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("30/minute", key_func=user_or_ip_key)
async def delete_routine_route(
    request: Request,
    user: Auth,
    conn: DBConn,
    routine_id: uuid.UUID,
) -> Response:
    deleted = await delete_routine(conn, user_id=user.user_id, routine_id=routine_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
