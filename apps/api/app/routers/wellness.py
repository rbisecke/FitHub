"""Wellness router: Hooper Index daily check-in."""

from __future__ import annotations

from datetime import UTC, date, datetime

import psycopg.rows
from fastapi import APIRouter

from app.dependencies.common import Auth, DBConn
from app.models.wellness import CheckInRequest, CheckInResponse, TodayCheckInResponse

router = APIRouter(prefix="/api/v1/wellness", tags=["wellness"])


# ── Helpers ───────────────────────────────────────────────────────────────────


def _hooper_index(sleep: int, stress: int, fatigue: int, soreness: int) -> int:
    """Sum of four 1–7 scores (range 4–28). Lower = better readiness."""
    return sleep + stress + fatigue + soreness


# ── Routes ────────────────────────────────────────────────────────────────────


@router.post("/checkin", response_model=CheckInResponse, status_code=201)
async def submit_checkin(
    body: CheckInRequest,
    user: Auth,
    db: DBConn,
) -> CheckInResponse:
    """Submit today's Hooper Index check-in (upserts — one per calendar day)."""
    today = date.today()
    hooper = _hooper_index(body.sleep, body.stress, body.fatigue, body.soreness)

    # Upsert into daily_checkins
    await db.execute(
        """
        INSERT INTO daily_checkins
            (user_id, date, sleep_quality, stress, fatigue, soreness)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (user_id, date)
        DO UPDATE SET
            sleep_quality = EXCLUDED.sleep_quality,
            stress        = EXCLUDED.stress,
            fatigue       = EXCLUDED.fatigue,
            soreness      = EXCLUDED.soreness
        """,
        [
            user.user_id,
            today,
            body.sleep,
            body.stress,
            body.fatigue,
            body.soreness,
        ],
    )

    # Also write to metric_samples so the recovery engine can use these values.
    # soreness → 'soreness' type; average of sleep/fatigue/stress → 'subjective_wellness'
    # Invert 1–7 scale to 10-point: (8 - value) / 7 * 10
    now_ts = datetime.now(UTC)

    async def _upsert_sample(mtype: str, value: float) -> None:
        await db.execute(
            """
            INSERT INTO metric_samples
                (user_id, type, value, unit, source, source_priority, started_at)
            VALUES (%s, %s, %s, 'score', 'hooper_checkin', 5, %s)
            ON CONFLICT (user_id, type, started_at, source)
            DO UPDATE SET value = EXCLUDED.value
            """,
            [user.user_id, mtype, value, now_ts],
        )

    # subjective_wellness (0–10): average of normalized sleep, inverted fatigue, inverted stress
    # All three fields use a 1–7 scale (6 steps), so divisor is 6.
    wellness_raw = (
        (body.sleep - 1) / 6.0 + (1.0 - (body.fatigue - 1) / 6.0) + (1.0 - (body.stress - 1) / 6.0)
    ) / 3.0
    wellness_scaled = wellness_raw * 10.0
    await _upsert_sample("subjective_wellness", round(wellness_scaled, 2))

    # soreness (0–10): invert soreness score (lower is better)
    soreness_scaled = ((body.soreness - 1) / 6.0) * 10.0
    await _upsert_sample("soreness", round(soreness_scaled, 2))

    return CheckInResponse(
        date=today,
        sleep=body.sleep,
        stress=body.stress,
        fatigue=body.fatigue,
        soreness=body.soreness,
        hooper_index=hooper,
    )


@router.get("/checkin/today", response_model=TodayCheckInResponse)
async def today_checkin(
    user: Auth,
    db: DBConn,
) -> TodayCheckInResponse:
    """Return today's check-in, or submitted=false if not yet logged."""
    today = date.today()
    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            """
            SELECT sleep_quality, stress, fatigue, soreness
            FROM daily_checkins
            WHERE user_id = %s AND date = %s
            """,
            [user.user_id, today],
        )
        row = await cur.fetchone()

    if row is None:
        return TodayCheckInResponse(submitted=False, checkin=None)

    hooper = _hooper_index(row["sleep_quality"], row["stress"], row["fatigue"], row["soreness"])
    return TodayCheckInResponse(
        submitted=True,
        checkin=CheckInResponse(
            date=today,
            sleep=row["sleep_quality"],
            stress=row["stress"],
            fatigue=row["fatigue"],
            soreness=row["soreness"],
            hooper_index=hooper,
        ),
    )
