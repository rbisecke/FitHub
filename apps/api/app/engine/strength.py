"""Strength intelligence engine: linear regression for e1RM projection.

Computes a "current estimated 1RM" by evaluating the OLS regression line
(fitted on all of a user's e1RM data points for a given movement) at today's
date. This is distinct from the all-time best e1RM stored in the database.

A positive slope → the user is trending upward → we can project a next-PR
milestone. A flat or negative slope → we return null for the projection fields
(the user is plateauing or detraining; speculation would be misleading).

Staleness rule: if the last logged set is more than 56 days (8 weeks) ago, we
still return the regression value but flag it with is_stale=True so the UI can
show a caveat.
"""

from __future__ import annotations

import math
from datetime import date
from typing import NamedTuple


class E1RMProjection(NamedTuple):
    current_e1rm_kg: float | None
    next_pr_kg: float | None
    next_pr_weeks: int | None
    is_stale: bool


def project_e1rm(
    points: list[tuple[date, float]],
    today: date,
) -> E1RMProjection:
    """Fit OLS regression on (date, e1RM) pairs and evaluate at *today*.

    Args:
        points: List of (date, estimated_1rm_kg) pairs, sorted ascending by
                date. Callers must pass at least 3 points; fewer returns a
                null projection.
        today: The reference date for "current" (normally date.today()).

    Returns:
        E1RMProjection with computed fields or nulls where not meaningful.
    """
    null_result = E1RMProjection(
        current_e1rm_kg=None,
        next_pr_kg=None,
        next_pr_weeks=None,
        is_stale=False,
    )

    if len(points) < 3:
        return null_result

    t0 = points[0][0]
    xs = [(d - t0).days for d, _ in points]
    ys = [e for _, e in points]

    n = len(xs)
    x_mean = sum(xs) / n
    y_mean = sum(ys) / n

    ss_xx = sum((x - x_mean) ** 2 for x in xs)
    if ss_xx == 0:
        # All points on the same date — no trend possible
        return null_result

    slope = sum((xs[i] - x_mean) * (ys[i] - y_mean) for i in range(n)) / ss_xx
    intercept = y_mean - slope * x_mean

    today_x = (today - t0).days
    current_e1rm = slope * today_x + intercept
    # Clamp at 0 — the regression line can go negative for very stale data
    current_e1rm = max(0.0, round(current_e1rm, 1))

    last_date = points[-1][0]
    is_stale = (today - last_date).days > 56  # 8 weeks

    # Only project forward when the trend is positive
    if slope <= 0:
        return E1RMProjection(
            current_e1rm_kg=current_e1rm,
            next_pr_kg=None,
            next_pr_weeks=None,
            is_stale=is_stale,
        )

    best = max(ys)
    # Next milestone: smallest multiple of 2.5 above the all-time best
    next_target = math.ceil(best / 2.5) * 2.5
    if next_target <= best:
        next_target = best + 2.5

    # Days from t0 when the regression line reaches next_target
    x_target = (next_target - intercept) / slope
    days_out = x_target - today_x

    if 0 < days_out <= 365:
        weeks_out = max(1, round(days_out / 7))
        return E1RMProjection(
            current_e1rm_kg=current_e1rm,
            next_pr_kg=round(next_target, 1),
            next_pr_weeks=weeks_out,
            is_stale=is_stale,
        )

    return E1RMProjection(
        current_e1rm_kg=current_e1rm,
        next_pr_kg=None,
        next_pr_weeks=None,
        is_stale=is_stale,
    )
