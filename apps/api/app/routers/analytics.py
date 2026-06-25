from __future__ import annotations

import uuid
from collections import defaultdict
from typing import Any

import psycopg
from fastapi import APIRouter, Depends, Query

from app.auth import UserContext, get_current_user
from app.db import get_db
from app.models.analytics import (
    BenchmarkAttempt,
    BenchmarkEntry,
    BenchmarkResponse,
    DailyLoadPoint,
    E1RMPoint,
    LoadModelResponse,
    PersonalRecord,
    ReadinessResponse,
    TrainingBalanceCategory,
    TrainingBalanceResponse,
    VolumeTrendResponse,
    WeeklyVolume,
)
from app.repositories.analytics import (
    get_benchmark_attempts,
    get_load_series,
    get_movement_trend,
    get_personal_records,
    get_readiness,
    get_training_balance,
    get_volume_trend,
)

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])

Auth = type[UserContext]  # just for the type annotation shorthand
DBConn = psycopg.AsyncConnection[Any]


def _acwr_zone(acwr: float | None) -> str:
    if acwr is None:
        return "insufficient_data"
    if acwr < 0.8:
        return "undertraining"
    if acwr <= 1.3:
        return "sweet_spot"
    if acwr <= 1.5:
        return "caution"
    return "overreaching"


def _fmt_time(seconds: int) -> str:
    return f"{seconds // 60}:{seconds % 60:02d}"


def _fmt_improvement(seconds: int) -> str:
    return f"{seconds}s" if seconds < 60 else _fmt_time(seconds)


@router.get("/load", response_model=LoadModelResponse)
async def load_model(
    days: int = Query(90, ge=7, le=365),
    user: UserContext = Depends(get_current_user),
    conn: psycopg.AsyncConnection[Any] = Depends(get_db),
) -> LoadModelResponse:
    series = await get_load_series(conn, user.user_id, days)
    last: dict[str, Any] = (
        series[-1] if series else {"atl": 0.0, "ctl": 0.0, "tsb": 0.0, "acwr": None}
    )
    return LoadModelResponse(
        series=[DailyLoadPoint(**p) for p in series],
        acwr_now=last["acwr"],
        ctl_now=last["ctl"],
        atl_now=last["atl"],
        tsb_now=last["tsb"],
        acwr_zone=_acwr_zone(last["acwr"]),
    )


@router.get("/personal-records", response_model=list[PersonalRecord])
async def personal_records(
    user: UserContext = Depends(get_current_user),
    conn: psycopg.AsyncConnection[Any] = Depends(get_db),
) -> list[PersonalRecord]:
    rows = await get_personal_records(conn, user.user_id)
    return [PersonalRecord(**r) for r in rows]


@router.get("/movement-trend/{movement_id}", response_model=list[E1RMPoint])
async def movement_trend(
    movement_id: uuid.UUID,
    user: UserContext = Depends(get_current_user),
    conn: psycopg.AsyncConnection[Any] = Depends(get_db),
) -> list[E1RMPoint]:
    rows = await get_movement_trend(conn, user.user_id, movement_id)
    return [E1RMPoint(**r) for r in rows]


@router.get("/volume-trend", response_model=VolumeTrendResponse)
async def volume_trend(
    weeks: int = Query(12, ge=1, le=52),
    user: UserContext = Depends(get_current_user),
    conn: psycopg.AsyncConnection[Any] = Depends(get_db),
) -> VolumeTrendResponse:
    rows = await get_volume_trend(conn, user.user_id, weeks)
    return VolumeTrendResponse(weeks=[WeeklyVolume(**r) for r in rows])


@router.get("/readiness", response_model=ReadinessResponse)
async def readiness(
    user: UserContext = Depends(get_current_user),
    conn: psycopg.AsyncConnection[Any] = Depends(get_db),
) -> ReadinessResponse:
    from datetime import date

    data = await get_readiness(conn, user.user_id)

    # Merge today's wearable-derived metrics if available
    async with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            """
            SELECT recovery_score::float, coverage::float,
                   confidence_tier, baseline_days
            FROM derived_metrics
            WHERE user_id = %s AND date = %s
            """,
            [user.user_id, date.today()],
        )
        dm = await cur.fetchone()

    if dm:
        # Infer hrv_type from which metric_samples type has data today
        async with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            await cur.execute(
                """
                SELECT type FROM metric_samples
                WHERE user_id = %s AND type IN ('hrv_sdnn', 'hrv_rmssd')
                  AND started_at::date = %s
                ORDER BY source_priority ASC LIMIT 1
                """,
                [user.user_id, date.today()],
            )
            hrv_row = await cur.fetchone()

        data["recovery_score"] = dm["recovery_score"]
        data["coverage"] = dm["coverage"]
        data["confidence_tier"] = dm["confidence_tier"]
        data["hrv_type"] = hrv_row["type"] if hrv_row else None

    return ReadinessResponse(**data)


@router.get("/benchmarks", response_model=BenchmarkResponse)
async def benchmarks(
    user: UserContext = Depends(get_current_user),
    conn: psycopg.AsyncConnection[Any] = Depends(get_db),
) -> BenchmarkResponse:
    rows = await get_benchmark_attempts(conn, user.user_id)

    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        if row["time_s"] is not None:
            grouped[row["name"]].append(row)

    entries: list[BenchmarkEntry] = []
    for name, attempts in grouped.items():
        pr_seconds = min(a["time_s"] for a in attempts)
        first_seconds = attempts[0]["time_s"]
        improvement_s = first_seconds - pr_seconds
        n = len(attempts)
        improvement_display = (
            f"{_fmt_improvement(improvement_s)} improvement over {n} attempts"
            if improvement_s > 0 and n > 1
            else ""
        )
        entries.append(
            BenchmarkEntry(
                name=name,
                attempts=[
                    BenchmarkAttempt(
                        date=a["day"],
                        result_display=_fmt_time(a["time_s"]),
                        result_seconds=a["time_s"],
                    )
                    for a in attempts
                ],
                pr_display=_fmt_time(pr_seconds),
                improvement_display=improvement_display,
            )
        )

    return BenchmarkResponse(benchmarks=entries)


@router.get("/training-balance", response_model=TrainingBalanceResponse)
async def training_balance(
    days: int = Query(28, ge=7, le=365),
    user: UserContext = Depends(get_current_user),
    conn: psycopg.AsyncConnection[Any] = Depends(get_db),
) -> TrainingBalanceResponse:
    rows = await get_training_balance(conn, user.user_id, days)
    return TrainingBalanceResponse(
        breakdown=[
            TrainingBalanceCategory(
                category=r["category"],
                volume_pct=float(r["volume_pct"]),
                load_au=float(r["load_au"]),
            )
            for r in rows
        ],
        period_days=days,
    )
