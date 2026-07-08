"""Adaptations router: detect triggers, list, merge, reject, adjust."""

from __future__ import annotations

import json

import psycopg
import psycopg.rows
from fastapi import APIRouter, HTTPException

from app.dependencies.common import Auth, DBConn
from app.models.adaptation import (
    AdaptationOut,
    AdjustAdaptationRequest,
    DetectTriggersResponse,
    RejectAdaptationRequest,
)

router = APIRouter(prefix="/api/v1", tags=["adaptations"])

# ── Shared helpers ─────────────────────────────────────────────────────────────

_SELECT_COLS = """
    id::text, plan_id::text, user_id::text,
    trigger_type, trigger_data, status,
    rationale, rejection_reason, diff_json,
    stub, proposed_at, merged_at, rejected_at
"""

# Same columns but table-qualified for queries that JOIN other tables
_SELECT_COLS_A = """
    a.id::text, a.plan_id::text, a.user_id::text,
    a.trigger_type, a.trigger_data, a.status,
    a.rationale, a.rejection_reason, a.diff_json,
    a.stub, a.proposed_at, a.merged_at, a.rejected_at
"""


def _row_to_out(r: dict[str, object]) -> AdaptationOut:
    return AdaptationOut(
        id=str(r["id"]),
        plan_id=str(r["plan_id"]),
        user_id=str(r["user_id"]),
        trigger_type=str(r["trigger_type"]),
        trigger_data=dict(r["trigger_data"]) if r["trigger_data"] else {},  # type: ignore[call-overload]
        status=str(r["status"]),
        rationale=str(r["rationale"]) if r["rationale"] else None,
        rejection_reason=str(r["rejection_reason"]) if r.get("rejection_reason") else None,
        diff_json=r["diff_json"],
        stub=bool(r["stub"]),
        proposed_at=r["proposed_at"],  # type: ignore[arg-type]
        merged_at=r["merged_at"],  # type: ignore[arg-type]
        rejected_at=r["rejected_at"],  # type: ignore[arg-type]
    )


# ── Routes ────────────────────────────────────────────────────────────────────


@router.post("/plans/{plan_id}/adaptations/detect", response_model=DetectTriggersResponse)
async def detect_plan_adaptations(
    plan_id: str,
    user: Auth,
    db: DBConn,
) -> DetectTriggersResponse:
    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            "SELECT id FROM plans WHERE id = %s::uuid AND user_id = %s",
            [plan_id, user.user_id],
        )
        if await cur.fetchone() is None:
            raise HTTPException(status_code=404, detail="Plan not found")

    from app.ai.adaptation import generate_adaptation
    from app.engine.adaptation_triggers import detect_triggers

    triggers = await detect_triggers(str(user.user_id), plan_id, db)

    proposed: list[AdaptationOut] = []
    for trigger in triggers:
        result = await generate_adaptation(trigger, [])
        async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
            await cur.execute(
                f"""
                INSERT INTO adaptations
                    (plan_id, user_id, trigger_type, trigger_data, rationale, diff_json, stub)
                VALUES (%s::uuid, %s, %s, %s::jsonb, %s, %s::jsonb, %s)
                RETURNING {_SELECT_COLS}
                """,
                [
                    plan_id,
                    user.user_id,
                    str(trigger["type"]),
                    json.dumps(trigger["data"]),
                    str(result.get("rationale", "")),
                    None,
                    bool(result.get("stub", False)),
                ],
            )
            row = await cur.fetchone()
        if row:
            out = _row_to_out(row)
            # override trigger_data with the parsed dict from the trigger itself
            if isinstance(trigger.get("data"), dict):
                out = out.model_copy(update={"trigger_data": trigger["data"]})
            proposed.append(out)

    return DetectTriggersResponse(
        plan_id=plan_id,
        triggers=triggers,
        proposed_adaptations=proposed,
    )


@router.get("/plans/{plan_id}/adaptations", response_model=list[AdaptationOut])
async def list_adaptations(
    plan_id: str,
    user: Auth,
    db: DBConn,
) -> list[AdaptationOut]:
    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            f"""
            SELECT {_SELECT_COLS_A}
            FROM adaptations a
            JOIN plans p ON p.id = a.plan_id
            WHERE a.plan_id = %s::uuid AND a.user_id = %s AND p.user_id = %s
            ORDER BY a.proposed_at DESC
            """,
            [plan_id, user.user_id, user.user_id],
        )
        rows = await cur.fetchall()

    return [_row_to_out(r) for r in rows]


@router.post("/adaptations/{adaptation_id}/merge", response_model=AdaptationOut)
async def merge_adaptation(
    adaptation_id: str,
    user: Auth,
    db: DBConn,
) -> AdaptationOut:
    # Single atomic UPDATE with status guard — eliminates the SELECT+UPDATE TOCTOU race.
    # If no row is returned, a follow-up SELECT distinguishes 404 from 409.
    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            f"""
            UPDATE adaptations
            SET status = 'merged', merged_at = now()
            WHERE id = %s::uuid AND user_id = %s AND status = 'proposed'
            RETURNING {_SELECT_COLS}
            """,
            [adaptation_id, user.user_id],
        )
        updated = await cur.fetchone()

        if updated is None:
            await cur.execute(
                "SELECT id FROM adaptations WHERE id = %s::uuid AND user_id = %s",
                [adaptation_id, user.user_id],
            )
            if await cur.fetchone() is None:
                raise HTTPException(status_code=404, detail="Adaptation not found")
            raise HTTPException(status_code=409, detail="Adaptation is not in proposed state")

    return _row_to_out(updated)


@router.post("/adaptations/{adaptation_id}/reject", response_model=AdaptationOut)
async def reject_adaptation(
    adaptation_id: str,
    user: Auth,
    db: DBConn,
    body: RejectAdaptationRequest | None = None,
) -> AdaptationOut:
    rejection_reason = body.rejection_reason if body else None

    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            f"""
            UPDATE adaptations
               SET status = 'rejected',
                   rejected_at = now(),
                   rejection_reason = %s
             WHERE id = %s::uuid
               AND user_id = %s
               AND status = 'proposed'
            RETURNING {_SELECT_COLS}
            """,
            [rejection_reason, adaptation_id, user.user_id],
        )
        updated = await cur.fetchone()
        if updated is None:
            await cur.execute(
                "SELECT id FROM adaptations WHERE id = %s::uuid AND user_id = %s",
                [adaptation_id, user.user_id],
            )
            if await cur.fetchone() is None:
                raise HTTPException(status_code=404, detail="Adaptation not found")
            raise HTTPException(status_code=409, detail="Adaptation is not in proposed state")

    return _row_to_out(updated)


@router.post("/adaptations/{adaptation_id}/adjust", response_model=AdaptationOut)
async def adjust_adaptation(
    adaptation_id: str,
    body: AdjustAdaptationRequest,
    user: Auth,
    db: DBConn,
) -> AdaptationOut:
    """Reject the existing adaptation and propose a revised one in one atomic step."""
    from app.ai.adaptation import generate_adaptation

    # Fetch and validate the existing adaptation
    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            f"""
            SELECT {_SELECT_COLS}
            FROM adaptations
            WHERE id = %s::uuid AND user_id = %s
            """,
            [adaptation_id, user.user_id],
        )
        existing = await cur.fetchone()

    if existing is None:
        raise HTTPException(status_code=404, detail="Adaptation not found")
    if str(existing["status"]) != "proposed":
        raise HTTPException(status_code=409, detail="Adaptation is not in proposed state")

    prior_rationale = str(existing["rationale"]) if existing.get("rationale") else None
    plan_id = str(existing["plan_id"])
    trigger = {
        "trigger_type": str(existing["trigger_type"]),
        "trigger_data": existing["trigger_data"] or {},
    }

    # Generate revised adaptation (outside the transaction)
    result = await generate_adaptation(
        trigger,
        [],
        rejection_context=body.feedback,
        prior_rationale=prior_rationale,
    )

    # Atomically reject the old and insert the new inside a single transaction.
    # Without this, a failed INSERT would leave the old adaptation permanently
    # rejected with no replacement.
    async with db.transaction(), db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            """
                UPDATE adaptations
                SET status = 'rejected', rejected_at = now(), rejection_reason = %s
                WHERE id = %s::uuid AND user_id = %s AND status = 'proposed'
                """,
            [body.feedback, adaptation_id, user.user_id],
        )
        await cur.execute(
            f"""
                INSERT INTO adaptations
                    (plan_id, user_id, trigger_type, trigger_data, rationale, diff_json, stub)
                VALUES (%s::uuid, %s, %s, %s::jsonb, %s, %s::jsonb, %s)
                RETURNING {_SELECT_COLS}
                """,
            [
                plan_id,
                user.user_id,
                str(existing["trigger_type"]),
                json.dumps(existing["trigger_data"]) if existing["trigger_data"] else "{}",
                str(result.get("rationale", "")),
                None,
                bool(result.get("stub", False)),
            ],
        )
        new_row = await cur.fetchone()

    if new_row is None:
        raise HTTPException(status_code=500, detail="Failed to create revised adaptation")

    return _row_to_out(new_row)
