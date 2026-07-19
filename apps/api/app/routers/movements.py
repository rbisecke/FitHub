from __future__ import annotations

import uuid

import psycopg.rows
from fastapi import APIRouter, HTTPException, Query, Request, status
from psycopg import errors as pg_errors

from app.dependencies.common import Auth, DBConn
from app.middleware.rate_limit import limiter, user_or_ip_key
from app.models.movement import (
    CreateMovementRequest,
    LastResult,
    Modality,
    Movement,
    MovementPattern,
    MovementSubstituteOut,
    PersonalRecordResult,
)
from app.repositories.movements import (
    create_movement,
    get_last_result_for_movement,
    get_movement_by_slug,
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


@router.get("/by-slug/{slug}", response_model=Movement)
async def get_movement_by_slug_route(
    user: Auth,
    conn: DBConn,
    slug: str,
) -> Movement:
    """Resolve a movement by its unique slug (01 §9 movement-detail routing)."""
    movement = await get_movement_by_slug(conn, slug=slug)
    if movement is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return movement


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


@router.get("/{movement_id}/substitutes", response_model=list[MovementSubstituteOut])
async def get_movement_substitutes(
    movement_id: uuid.UUID,
    user: Auth,
    conn: DBConn,
    equipment: list[str] = Query(default=[]),
) -> list[MovementSubstituteOut]:
    """Return up to 20 movements with the same movement_pattern that fit the equipment list."""
    if equipment and len(equipment) > 20:
        raise HTTPException(status_code=422, detail="Too many equipment filters")

    async with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            """
            SELECT movement_pattern
            FROM public.movements
            WHERE id = %(movement_id)s
            LIMIT 1
            """,
            {"movement_id": movement_id},
        )
        src = await cur.fetchone()

    if src is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movement not found")

    # Explicit None guard: a source movement with no movement_pattern has no
    # meaningful "same pattern" substitutes. Coercing None to the literal
    # string "None" before the WHERE clause happened to return an empty list
    # too, but only by accident — this makes the intent explicit instead of
    # relying on no real movement ever having the pattern "None".
    if src["movement_pattern"] is None:
        return []

    pattern = str(src["movement_pattern"])

    async with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            """
            SELECT id, name, movement_pattern, equipment_required
            FROM public.movements
            WHERE movement_pattern = %(pattern)s
              AND id != %(movement_id)s
              AND (
                    %(equipment)s::TEXT[] = ARRAY[]::TEXT[]
                    OR equipment_required <@ %(equipment)s::TEXT[]
                  )
            ORDER BY name
            LIMIT 20
            """,
            {"pattern": pattern, "movement_id": movement_id, "equipment": equipment},
        )
        rows = await cur.fetchall()

    return [
        MovementSubstituteOut(
            id=r["id"],
            name=str(r["name"]),
            movement_pattern=MovementPattern(r["movement_pattern"]),
            equipment_required=list(r["equipment_required"] or []),
        )
        for r in rows
    ]
