from __future__ import annotations

import uuid
from collections import defaultdict
from typing import Any, Literal

from fastapi import APIRouter, Query

from app.dependencies.common import Auth, DBConn
from app.models.analytics import (
    BenchmarkAttempt,
    BenchmarkEntry,
    BenchmarkResponse,
    ContributionPoint,
    ContributionsResponse,
    DailyLoadPoint,
    E1RMPoint,
    LoadModelResponse,
    MovementHistoryEntry,
    PersonalRecord,
    ReadinessResponse,
    TrainingBalanceCategory,
    TrainingBalanceResponse,
    VolumeTrendResponse,
    WeeklyVolume,
)
from app.repositories.analytics import (
    get_benchmark_attempts,
    get_contributions,
    get_load_series,
    get_movement_history,
    get_movement_trend,
    get_personal_records,
    get_readiness,
    get_training_balance,
    get_volume_trend,
)

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


def _acwr_zone(
    acwr: float | None,
) -> Literal["insufficient_data", "undertraining", "sweet_spot", "caution", "overreaching"]:
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
    if seconds >= 3600:
        h, rem = divmod(seconds, 3600)
        m, s = divmod(rem, 60)
        return f"{h}:{m:02d}:{s:02d}"
    m, s = divmod(seconds, 60)
    return f"{m}:{s:02d}"


def _fmt_improvement(seconds: int) -> str:
    return f"{seconds}s" if seconds < 60 else _fmt_time(seconds)


@router.get("/load", response_model=LoadModelResponse)
async def load_model(
    user: Auth,
    conn: DBConn,
    days: int = Query(90, ge=7, le=365),
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
    user: Auth,
    conn: DBConn,
) -> list[PersonalRecord]:
    rows = await get_personal_records(conn, user.user_id)
    return [PersonalRecord(**r) for r in rows]


@router.get("/movement-trend/{movement_id}", response_model=list[E1RMPoint])
async def movement_trend(
    movement_id: uuid.UUID,
    user: Auth,
    conn: DBConn,
    implement: str | None = Query(default=None),
    side: str | None = Query(default=None),
) -> list[E1RMPoint]:
    """Single-movement e1RM trend, optionally scoped to (implement, side).

    The movement-detail Charts tab shares one ``(implement, side)`` key across
    its History/Charts/Records views (01 §9.1); passing those params re-scopes
    the trend to that combination. Omitting them returns the all-variants trend.
    """
    rows = await get_movement_trend(conn, user.user_id, movement_id, implement, side)
    return [E1RMPoint(**r) for r in rows]


@router.get("/movement-history/{movement_id}", response_model=list[MovementHistoryEntry])
async def movement_history(
    movement_id: uuid.UUID,
    user: Auth,
    conn: DBConn,
    implement: str | None = Query(default=None),
    side: str | None = Query(default=None),
) -> list[MovementHistoryEntry]:
    """Full logged-set history for one movement, newest-first.

    Used by the movement-detail History tab to populate the set log table.
    Optionally scoped to an ``(implement, side)`` combination (01 §9.1).
    Returns an empty list (not 404) when no sets have been logged.
    """
    rows = await get_movement_history(conn, user.user_id, movement_id, implement, side)
    return [MovementHistoryEntry(**r) for r in rows]


@router.get("/volume-trend", response_model=VolumeTrendResponse)
async def volume_trend(
    user: Auth,
    conn: DBConn,
    weeks: int = Query(12, ge=1, le=52),
) -> VolumeTrendResponse:
    rows = await get_volume_trend(conn, user.user_id, weeks)
    return VolumeTrendResponse(weeks=[WeeklyVolume(**r) for r in rows])


@router.get("/readiness", response_model=ReadinessResponse)
async def readiness(
    user: Auth,
    conn: DBConn,
) -> ReadinessResponse:
    return await get_readiness(conn, user.user_id)


@router.get("/benchmarks", response_model=BenchmarkResponse)
async def benchmarks(
    user: Auth,
    conn: DBConn,
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


@router.get("/contributions", response_model=ContributionsResponse)
async def contributions(
    user: Auth,
    conn: DBConn,
    days: int = Query(365, ge=30, le=730),
) -> ContributionsResponse:
    rows = await get_contributions(conn, user.user_id, days)
    points = [
        ContributionPoint(
            day=r["day"],
            count=int(r["count"]),
            load_au=float(r["load_au"]),
        )
        for r in rows
    ]
    return ContributionsResponse(
        days=points,
        total_workouts=sum(p.count for p in points),
    )


@router.get("/training-balance", response_model=TrainingBalanceResponse)
async def training_balance(
    user: Auth,
    conn: DBConn,
    days: int = Query(28, ge=7, le=365),
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
