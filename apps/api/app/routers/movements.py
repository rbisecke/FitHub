from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, Query, Request, status
from psycopg import errors as pg_errors

from app.dependencies.common import Auth, DBConn
from app.middleware.rate_limit import limiter, user_or_ip_key
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
    get_personal_records_batch,
    search_movements,
)

router = APIRouter(prefix="/api/v1/movements", tags=["movements"])


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
@limiter.limit("30/minute", key_func=user_or_ip_key)
async def create_movement_route(
    request: Request,
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


@router.get("/personal-records", response_model=list[PersonalRecordResult])
async def get_personal_records_batch_route(
    user: Auth,
    conn: DBConn,
    ids: str = Query(..., description="Comma-separated movement UUIDs, max 20"),
) -> list[PersonalRecordResult]:
    raw_ids = [s.strip() for s in ids.split(",") if s.strip()]
    if not raw_ids or len(raw_ids) > 20:
        raise HTTPException(status_code=400, detail="ids must contain 1-20 UUIDs")
    try:
        parsed = [uuid.UUID(i) for i in raw_ids]
    except ValueError:
        raise HTTPException(status_code=400, detail="ids contains an invalid UUID") from None
    return await get_personal_records_batch(conn, user_id=user.user_id, movement_ids=parsed)


@router.get("/{movement_id}/last-result", response_model=LastResult)
async def get_last_result(
    movement_id: uuid.UUID,
    user: Auth,
    conn: DBConn,
    implement: str | None = Query(default=None),
    side: str | None = Query(default=None),
) -> LastResult:
    result = await get_last_result_for_movement(
        conn,
        user_id=user.user_id,
        movement_id=movement_id,
        implement=implement,
        side=side,
    )
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
    variant_annotation: str | None = Query(default=None),
    implement: str | None = Query(default=None),
    side: str | None = Query(default=None),
) -> PersonalRecordResult | None:
    return await get_personal_record(
        conn,
        user_id=user.user_id,
        movement_id=movement_id,
        variant_annotation=variant_annotation,
        implement=implement,
        side=side,
    )
