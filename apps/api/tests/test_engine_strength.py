"""Unit tests for the strength intelligence engine (project_e1rm)."""

from __future__ import annotations

from datetime import date, timedelta

import pytest

from app.engine.strength import project_e1rm


def _dates(n: int, start: str = "2024-01-01", step_days: int = 30) -> list[date]:
    d = date.fromisoformat(start)
    return [d + timedelta(days=i * step_days) for i in range(n)]


def test_fewer_than_3_points_returns_nulls() -> None:
    today = date(2024, 6, 1)
    points = [
        (date(2024, 1, 1), 100.0),
        (date(2024, 2, 1), 105.0),
    ]
    proj = project_e1rm(points, today)
    assert proj.current_e1rm_kg is None
    assert proj.next_pr_kg is None
    assert proj.next_pr_weeks is None
    assert proj.is_stale is False


def test_exactly_3_points_upward_trend() -> None:
    today = date(2024, 4, 1)
    points = [
        (date(2024, 1, 1), 100.0),
        (date(2024, 2, 1), 105.0),
        (date(2024, 3, 1), 110.0),
    ]
    proj = project_e1rm(points, today)
    assert proj.current_e1rm_kg is not None
    assert proj.current_e1rm_kg > 110.0  # regression extrapolated past last point
    assert proj.next_pr_kg is not None
    assert proj.next_pr_kg > 110.0
    assert proj.next_pr_weeks is not None
    assert proj.next_pr_weeks >= 1


def test_flat_or_negative_trend_no_projection() -> None:
    today = date(2024, 4, 1)
    points = [
        (date(2024, 1, 1), 110.0),
        (date(2024, 2, 1), 105.0),
        (date(2024, 3, 1), 100.0),
    ]
    proj = project_e1rm(points, today)
    assert proj.current_e1rm_kg is not None  # regression still computed
    assert proj.next_pr_kg is None
    assert proj.next_pr_weeks is None


def test_is_stale_when_last_set_over_8_weeks_ago() -> None:
    today = date(2024, 6, 1)
    last = today - timedelta(days=57)  # just over 8 weeks
    points = [
        (last - timedelta(days=60), 90.0),
        (last - timedelta(days=30), 95.0),
        (last, 100.0),
    ]
    proj = project_e1rm(points, today)
    assert proj.is_stale is True


def test_not_stale_when_last_set_within_8_weeks() -> None:
    today = date(2024, 6, 1)
    last = today - timedelta(days=30)
    points = [
        (last - timedelta(days=60), 90.0),
        (last - timedelta(days=30), 95.0),
        (last, 100.0),
    ]
    proj = project_e1rm(points, today)
    assert proj.is_stale is False


def test_next_pr_target_is_next_2_5_kg_multiple() -> None:
    today = date(2024, 4, 1)
    # best = 101.0 kg; next multiple of 2.5 above that is 102.5
    points = [
        (date(2024, 1, 1), 97.5),
        (date(2024, 2, 1), 99.0),
        (date(2024, 3, 1), 101.0),
    ]
    proj = project_e1rm(points, today)
    assert proj.next_pr_kg == pytest.approx(102.5)


def test_current_e1rm_clamped_at_zero() -> None:
    """Very old data on a declining trend must not yield a negative current e1RM."""
    today = date(2025, 1, 1)
    points = [
        (date(2024, 1, 1), 100.0),
        (date(2024, 2, 1), 50.0),
        (date(2024, 3, 1), 10.0),
    ]
    proj = project_e1rm(points, today)
    if proj.current_e1rm_kg is not None:
        assert proj.current_e1rm_kg >= 0.0


def test_all_same_date_returns_nulls() -> None:
    """All points on the same date means ss_xx=0; must not raise."""
    today = date(2024, 4, 1)
    same_day = date(2024, 3, 1)
    points = [(same_day, 100.0), (same_day, 105.0), (same_day, 110.0)]
    proj = project_e1rm(points, today)
    assert proj.current_e1rm_kg is None


def test_projection_not_beyond_1_year() -> None:
    """A very small positive slope must not produce a projection > 52 weeks out."""
    today = date(2024, 4, 1)
    points = [
        (date(2024, 1, 1), 100.0),
        (date(2024, 2, 1), 100.001),
        (date(2024, 3, 1), 100.002),
    ]
    proj = project_e1rm(points, today)
    # If next_pr_weeks is set it must be within a year
    if proj.next_pr_weeks is not None:
        assert proj.next_pr_weeks <= 52
