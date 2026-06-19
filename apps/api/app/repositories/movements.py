from __future__ import annotations

import uuid
from typing import Any

import psycopg
from psycopg.rows import dict_row

from app.models.movement import CreateMovementRequest, Modality, Movement


async def search_movements(
    conn: psycopg.AsyncConnection[Any],
    *,
    query: str | None = None,
    modality: Modality | None = None,
    limit: int = 50,
) -> list[Movement]:
    like = f"%{query}%" if query else None
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            SELECT *
            FROM   public.movements
            WHERE  (%s IS NULL OR name ILIKE %s OR slug ILIKE %s)
              AND  (%s IS NULL OR modality = %s)
            ORDER  BY is_official DESC, name
            LIMIT  %s
            """,
            [like, like, like, modality, modality, limit],
        )
        rows = await cur.fetchall()
    return [Movement(**r) for r in rows]


async def create_movement(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
    req: CreateMovementRequest,
) -> Movement:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            INSERT INTO public.movements
                (name, slug, base_movement, modality, start_position,
                 catch_position, implement, default_result_types, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            [
                req.name,
                req.slug,
                req.base_movement,
                req.modality,
                req.start_position,
                req.catch_position,
                req.implement,
                req.default_result_types,
                user_id,
            ],
        )
        row = await cur.fetchone()
    assert row is not None
    return Movement(**row)
