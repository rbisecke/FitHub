"""Adaptations router: detect triggers, list, merge, reject, adjust."""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime
from typing import Literal, cast

import psycopg
import psycopg.rows
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import ValidationError

from app.dependencies.common import Auth, DBConn
from app.middleware.rate_limit import limiter, user_or_ip_key
from app.models.adaptation import (
    AdaptationOut,
    AdaptationSessionDiff,
    AdjustAdaptationRequest,
    DetectTriggersResponse,
    RejectAdaptationRequest,
    TriggerOut,
)
from app.models.plan import PlannedItemPatch, SessionPatch
from app.routers.plans import _apply_session_patch, _load_prescribed_sessions

log = logging.getLogger(__name__)

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
        trigger_type=cast(
            Literal["high_acwr", "low_readiness", "missed_session", "rpe_creep"], r["trigger_type"]
        ),
        trigger_data=dict(r["trigger_data"]) if r["trigger_data"] else {},  # type: ignore[call-overload]
        status=cast(Literal["proposed", "merged", "rejected"], r["status"]),
        rationale=str(r["rationale"]) if r["rationale"] else None,
        rejection_reason=str(r["rejection_reason"]) if r.get("rejection_reason") else None,
        diff_json=cast(list[object], r["diff_json"]) if r["diff_json"] else [],
        stub=bool(r["stub"]),
        proposed_at=cast(datetime | None, r["proposed_at"]),
        merged_at=cast(datetime | None, r["merged_at"]),
        rejected_at=cast(datetime | None, r["rejected_at"]),
    )


def _diff_to_session_patch(diff: AdaptationSessionDiff) -> SessionPatch:
    """Reconstruct a SessionPatch from a validated diff_json entry for merge to apply.

    Each item_change's `new_*` fields ARE the item's new state (see
    app.ai.adaptation._build_item_changes) — a `removed` entry is dropped
    entirely rather than turned into a PlannedItemPatch, which is exactly what
    _apply_session_patch's full-replace semantics need: the surviving
    modified_items list becomes the session's complete new item set. Typed
    attribute access (not dict.get on raw JSONB) means a future
    AdaptationItemChange field rename is a mypy error here, not a silently
    dropped value at merge time.
    """
    modified_items = [
        PlannedItemPatch(
            item_id=ic.item_id,
            movement_name=ic.movement_name,
            sets=ic.new_sets,
            reps=ic.new_reps,
            load_pct_1rm=ic.new_load_pct_1rm,
            load_kg=ic.new_load_kg,
            notes=ic.new_notes,
            item_order=ic.item_order,
        )
        for ic in diff.item_changes
        if not ic.removed
    ]
    return SessionPatch(
        session_id=diff.session_id,
        modified_items=modified_items,
        # 'skip' has no dedicated item-level representation (per ADAPTATION_SYSTEM,
        # the LLM leaves modified_items empty for it) — the session is marked
        # skipped instead of having its prescribed items destroyed.
        new_status="skipped" if diff.change == "skip" else None,
    )


# ── Routes ────────────────────────────────────────────────────────────────────


@router.post(
    "/plans/{plan_id}/adaptations/detect",
    response_model=DetectTriggersResponse,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit("5/hour", key_func=user_or_ip_key)
async def detect_plan_adaptations(
    plan_id: uuid.UUID,
    request: Request,
    user: Auth,
    db: DBConn,
) -> DetectTriggersResponse:
    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            "SELECT id FROM plans WHERE id = %s::uuid AND user_id = %s",
            [str(plan_id), user.user_id],
        )
        if await cur.fetchone() is None:
            raise HTTPException(status_code=404, detail="Plan not found")

    from app.ai.adaptation import generate_adaptation
    from app.engine.adaptation_triggers import detect_triggers

    raw_triggers = await detect_triggers(str(user.user_id), str(plan_id), db)
    trigger_outs = [
        TriggerOut(type=str(t["type"]), data=cast(dict[str, object], t["data"]))
        for t in raw_triggers
    ]

    # Load real prescribed sessions once — every trigger's adaptation proposal
    # is generated against the same current plan state (BG-02: previously an
    # empty list was passed here, so diff_json had no session_id/item detail).
    affected_sessions = (
        await _load_prescribed_sessions(str(plan_id), str(user.user_id), db) if raw_triggers else []
    )

    # Generate all adaptation results before opening the transaction so LLM
    # calls don't hold a DB transaction open.
    adaptation_results: list[tuple[dict[str, object], dict[str, object]]] = []
    for trigger in raw_triggers:
        result = await generate_adaptation(
            {"trigger_type": trigger["type"], "trigger_data": trigger["data"]},
            affected_sessions,
        )
        adaptation_results.append((trigger, result))

    proposed: list[AdaptationOut] = []
    async with db.transaction():
        for trigger, result in adaptation_results:
            async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
                await cur.execute(
                    f"""
                    INSERT INTO adaptations
                        (plan_id, user_id, trigger_type, trigger_data, rationale, diff_json, stub)
                    VALUES (%s::uuid, %s, %s, %s::jsonb, %s, %s::jsonb, %s)
                    RETURNING {_SELECT_COLS}
                    """,
                    [
                        str(plan_id),
                        user.user_id,
                        str(trigger["type"]),
                        json.dumps(trigger["data"]),
                        str(result.get("rationale", "")),
                        json.dumps(result.get("diff", []) or []),
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
        plan_id=str(plan_id),
        triggers=trigger_outs,
        proposed_adaptations=proposed,
    )


@router.get("/plans/{plan_id}/adaptations", response_model=list[AdaptationOut])
async def list_adaptations(
    plan_id: uuid.UUID,
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
            LIMIT 200
            """,
            [str(plan_id), user.user_id, user.user_id],
        )
        rows = await cur.fetchall()

    return [_row_to_out(r) for r in rows]


@router.post("/adaptations/{adaptation_id}/merge", response_model=AdaptationOut)
@limiter.limit("30/minute", key_func=user_or_ip_key)
async def merge_adaptation(
    adaptation_id: uuid.UUID,
    request: Request,
    user: Auth,
    db: DBConn,
) -> AdaptationOut:
    # Single atomic UPDATE with status guard — eliminates the SELECT+UPDATE TOCTOU race.
    # If no row is returned, a follow-up SELECT distinguishes 404 from 409.
    # The status flip and every session-patch write happen in the SAME transaction
    # (a savepoint over the request-scoped connection), so a failure applying any
    # patch rolls back the status flip too — merge must never report 'merged' while
    # leaving the plan's sessions unchanged (the bug this whole endpoint existed to fix).
    async with db.transaction():
        async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
            await cur.execute(
                f"""
                UPDATE adaptations
                SET status = 'merged', merged_at = now()
                WHERE id = %s::uuid AND user_id = %s AND status = 'proposed'
                RETURNING {_SELECT_COLS}
                """,
                [str(adaptation_id), user.user_id],
            )
            updated = await cur.fetchone()

            if updated is None:
                await cur.execute(
                    "SELECT id FROM adaptations WHERE id = %s::uuid AND user_id = %s",
                    [str(adaptation_id), user.user_id],
                )
                if await cur.fetchone() is None:
                    raise HTTPException(status_code=404, detail="Adaptation not found")
                raise HTTPException(status_code=409, detail="Adaptation is not in proposed state")

        # Validate the stored diff_json through the same typed model the API
        # returns, so a malformed or unexpectedly-shaped row 500s cleanly here
        # instead of raising an unguarded KeyError mid-transaction.
        try:
            merged_out = _row_to_out(updated)
        except ValidationError:
            log.exception("adaptation %s has malformed diff_json", adaptation_id)
            raise HTTPException(
                status_code=500, detail="Internal error. Please try again."
            ) from None

        plan_id = str(updated["plan_id"])
        for session_diff in merged_out.diff_json:
            patch = _diff_to_session_patch(session_diff)
            await _apply_session_patch(patch, plan_id, str(user.user_id), db)

    return merged_out


@router.post("/adaptations/{adaptation_id}/reject", response_model=AdaptationOut)
@limiter.limit("30/minute", key_func=user_or_ip_key)
async def reject_adaptation(
    adaptation_id: uuid.UUID,
    request: Request,
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
            [rejection_reason, str(adaptation_id), user.user_id],
        )
        updated = await cur.fetchone()
        if updated is None:
            await cur.execute(
                "SELECT id FROM adaptations WHERE id = %s::uuid AND user_id = %s",
                [str(adaptation_id), user.user_id],
            )
            if await cur.fetchone() is None:
                raise HTTPException(status_code=404, detail="Adaptation not found")
            raise HTTPException(status_code=409, detail="Adaptation is not in proposed state")

    return _row_to_out(updated)


@router.post("/adaptations/{adaptation_id}/adjust", response_model=AdaptationOut)
@limiter.limit("10/hour", key_func=user_or_ip_key)
async def adjust_adaptation(
    adaptation_id: uuid.UUID,
    request: Request,
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
            [str(adaptation_id), user.user_id],
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

    # Load real prescribed sessions for the revised proposal — same BG-02 fix
    # as detect_plan_adaptations; previously an empty list was passed here.
    affected_sessions = await _load_prescribed_sessions(plan_id, str(user.user_id), db)

    # Generate revised adaptation (outside the transaction)
    result = await generate_adaptation(
        trigger,
        affected_sessions,
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
            [body.feedback, str(adaptation_id), user.user_id],
        )
        if cur.rowcount == 0:
            raise HTTPException(
                status_code=409,
                detail="Adaptation was already merged or rejected by a concurrent request",
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
                json.dumps(result.get("diff", []) or []),
                bool(result.get("stub", False)),
            ],
        )
        new_row = await cur.fetchone()

    if new_row is None:
        raise HTTPException(status_code=500, detail="Failed to create revised adaptation")

    return _row_to_out(new_row)
