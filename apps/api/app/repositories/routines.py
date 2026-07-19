from __future__ import annotations

import uuid
from typing import Any

import psycopg
from psycopg.rows import dict_row

from app.models.routine import (
    MAX_ROUTINE_MOVEMENTS,
    CreateSavedRoutineRequest,
    RoutineMovement,
    SavedRoutine,
)

# Cap the number of routines a user can accumulate; also bounds the list query.
MAX_ROUTINES = 100
# Worst case for a full list fetch (all routines, each maxed out) with headroom,
# so raising either cap doesn't silently truncate a routine's movements.
_MOVEMENTS_FETCH_LIMIT = MAX_ROUTINES * MAX_ROUTINE_MOVEMENTS * 2


class RoutineLimitExceeded(Exception):
    """Raised when a user has already reached MAX_ROUTINES saved routines."""


async def _load_movements(
    cur: psycopg.AsyncCursor[dict[str, Any]],
    *,
    user_id: uuid.UUID,
    routine_ids: list[uuid.UUID],
) -> dict[uuid.UUID, list[RoutineMovement]]:
    """Fetch ordered movements for the given routines, grouped by routine_id."""
    grouped: dict[uuid.UUID, list[RoutineMovement]] = {rid: [] for rid in routine_ids}
    if not routine_ids:
        return grouped
    await cur.execute(
        """
        SELECT srm.routine_id, srm.movement_id, m.name AS movement_name,
               srm.implement, srm.side, srm.position
        FROM   public.saved_routine_movements srm
        LEFT JOIN public.movements m ON m.id = srm.movement_id
        WHERE  srm.user_id = %s AND srm.routine_id = ANY(%s)
        ORDER  BY srm.routine_id, srm.position
        LIMIT  %s
        """,
        [user_id, routine_ids, _MOVEMENTS_FETCH_LIMIT],
    )
    for row in await cur.fetchall():
        grouped[row["routine_id"]].append(
            RoutineMovement(
                movement_id=row["movement_id"],
                movement_name=row["movement_name"],
                implement=row["implement"],
                side=row["side"],
                position=row["position"],
            )
        )
    return grouped


def _routine(row: dict[str, Any], movements: list[RoutineMovement]) -> SavedRoutine:
    return SavedRoutine(
        id=row["id"],
        user_id=row["user_id"],
        name=row["name"],
        display_order=row["display_order"],
        movements=movements,
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


async def list_routines(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
) -> list[SavedRoutine]:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            SELECT id, user_id, name, display_order, created_at, updated_at
            FROM   public.saved_routines
            WHERE  user_id = %s
            ORDER  BY display_order, created_at
            LIMIT  %s
            """,
            [user_id, MAX_ROUTINES],
        )
        rows = await cur.fetchall()
        by_routine = await _load_movements(
            cur, user_id=user_id, routine_ids=[r["id"] for r in rows]
        )
    return [_routine(r, by_routine.get(r["id"], [])) for r in rows]


async def get_routine(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
    routine_id: uuid.UUID,
) -> SavedRoutine | None:
    async with conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            SELECT id, user_id, name, display_order, created_at, updated_at
            FROM   public.saved_routines
            WHERE  id = %s AND user_id = %s
            """,
            [routine_id, user_id],
        )
        row = await cur.fetchone()
        if row is None:
            return None
        by_routine = await _load_movements(cur, user_id=user_id, routine_ids=[routine_id])
    return _routine(row, by_routine.get(routine_id, []))


async def create_routine(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
    req: CreateSavedRoutineRequest,
) -> SavedRoutine:
    routine_id = uuid.uuid4()
    async with conn.transaction(), conn.cursor(row_factory=dict_row) as cur:
        # Enforce MAX_ROUTINES at write time — the list query's LIMIT alone only
        # hides the overflow rows from GET /routines, it doesn't stop them from
        # silently accumulating past the cap.
        await cur.execute(
            "SELECT COUNT(*) AS n FROM public.saved_routines WHERE user_id = %s",
            [user_id],
        )
        count_row = await cur.fetchone()
        if count_row is not None and count_row["n"] >= MAX_ROUTINES:
            raise RoutineLimitExceeded(MAX_ROUTINES)
        # New routines sort to the end: max(display_order) + 1.
        await cur.execute(
            """
            INSERT INTO public.saved_routines (id, user_id, name, display_order)
            VALUES (
                %s, %s, %s,
                COALESCE(
                    (SELECT MAX(display_order) + 1 FROM public.saved_routines
                     WHERE user_id = %s),
                    0
                )
            )
            """,
            [routine_id, user_id, req.name.strip(), user_id],
        )
        if req.movements:
            await cur.executemany(
                """
                INSERT INTO public.saved_routine_movements
                    (routine_id, user_id, movement_id, position, implement, side)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                [
                    (routine_id, user_id, mv.movement_id, pos, mv.implement, mv.side)
                    for pos, mv in enumerate(req.movements)
                ],
            )
    created = await get_routine(conn, user_id=user_id, routine_id=routine_id)
    if created is None:  # pragma: no cover — just inserted in the same connection
        raise RuntimeError("routine INSERT returned no row")
    return created


async def rename_routine(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
    routine_id: uuid.UUID,
    name: str,
) -> SavedRoutine | None:
    async with conn.cursor() as cur:
        await cur.execute(
            """
            UPDATE public.saved_routines
            SET    name = %s, updated_at = now()
            WHERE  id = %s AND user_id = %s
            """,
            [name.strip(), routine_id, user_id],
        )
        if cur.rowcount != 1:
            return None
    return await get_routine(conn, user_id=user_id, routine_id=routine_id)


async def delete_routine(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
    routine_id: uuid.UUID,
) -> bool:
    async with conn.cursor() as cur:
        await cur.execute(
            "DELETE FROM public.saved_routines WHERE id = %s AND user_id = %s RETURNING id",
            [routine_id, user_id],
        )
        return cur.rowcount == 1


async def reorder_routines(
    conn: psycopg.AsyncConnection[Any],
    *,
    user_id: uuid.UUID,
    routine_ids: list[uuid.UUID],
) -> list[SavedRoutine]:
    """Set display_order to match the given id order. A partial routine_ids list
    is allowed: the listed routines come first in the given order, and any of the
    user's routines left unlisted keep their existing relative order, appended
    after — so a partial reorder always produces one clean total order instead of
    letting unlisted rows' old display_order collide or interleave with the new
    values. Ids not owned by the user are ignored."""
    async with conn.transaction(), conn.cursor(row_factory=dict_row) as cur:
        await cur.execute(
            """
            SELECT id FROM public.saved_routines
            WHERE  user_id = %s
            ORDER  BY display_order, created_at
            """,
            [user_id],
        )
        existing_ids = [row["id"] for row in await cur.fetchall()]
        reordered = [rid for rid in routine_ids if rid in existing_ids]
        reordered_set = set(reordered)
        full_order = reordered + [rid for rid in existing_ids if rid not in reordered_set]
        await cur.executemany(
            """
            UPDATE public.saved_routines
            SET    display_order = %s, updated_at = now()
            WHERE  id = %s AND user_id = %s
            """,
            [(order, rid, user_id) for order, rid in enumerate(full_order)],
        )
    return await list_routines(conn, user_id=user_id)
