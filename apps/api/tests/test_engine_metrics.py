"""Unit tests for the deterministic derived-metrics engine."""

from __future__ import annotations

import pytest

from app.engine.metrics import SignalInput, compute_recovery, norm, z_score


def make_sig(**kwargs: object) -> SignalInput:
    defaults: dict[str, object] = dict(
        hrv_rmssd_ms=None,
        hrv_baseline_ms=None,
        hrv_sd_ms=None,
        rhr_bpm=None,
        rhr_baseline_bpm=None,
        rhr_sd_bpm=None,
        sleep_score=None,
        subjective_wellness=None,
        soreness=None,
    )
    defaults.update(kwargs)
    return SignalInput(**defaults)  # type: ignore[arg-type]


class TestZScoreNorm:
    def test_positive_z_maps_above_half(self) -> None:
        assert norm(1.0) > 0.5

    def test_negative_z_maps_below_half(self) -> None:
        assert norm(-1.0) < 0.5

    def test_zero_z_maps_to_half(self) -> None:
        assert abs(norm(0.0) - 0.5) < 1e-9

    def test_clamp_at_three_sigma(self) -> None:
        assert norm(99.0) == norm(3.0)
        assert norm(-99.0) == norm(-3.0)

    def test_zero_sd_returns_none(self) -> None:
        assert z_score(60.0, 60.0, 0.0) is None


class TestComputeRecovery:
    def test_no_signals_returns_none_recovery(self) -> None:
        dm = compute_recovery(make_sig(), baseline_days=30)
        assert dm.recovery_score is None
        assert dm.coverage == 0.0
        assert dm.confidence_tier == "standard"

    def test_excellent_hrv_scores_high(self) -> None:
        sig = make_sig(hrv_rmssd_ms=80, hrv_baseline_ms=60, hrv_sd_ms=8)
        dm = compute_recovery(sig, baseline_days=30)
        assert dm.recovery_score is not None
        assert dm.recovery_score > 0.7

    def test_poor_hrv_scores_low(self) -> None:
        sig = make_sig(hrv_rmssd_ms=40, hrv_baseline_ms=60, hrv_sd_ms=8)
        dm = compute_recovery(sig, baseline_days=30)
        assert dm.recovery_score is not None
        assert dm.recovery_score < 0.35

    def test_high_rhr_lowers_score(self) -> None:
        normal = make_sig(rhr_bpm=49, rhr_baseline_bpm=49, rhr_sd_bpm=3)
        elevated = make_sig(rhr_bpm=60, rhr_baseline_bpm=49, rhr_sd_bpm=3)
        dm_n = compute_recovery(normal, baseline_days=30)
        dm_e = compute_recovery(elevated, baseline_days=30)
        assert dm_e.recovery_score < dm_n.recovery_score  # type: ignore[operator]

    def test_coverage_counts_present_signals(self) -> None:
        sig = make_sig(hrv_rmssd_ms=60, hrv_baseline_ms=60, hrv_sd_ms=5, sleep_score=80)
        dm = compute_recovery(sig, baseline_days=30)
        assert dm.coverage == pytest.approx(2 / 5)

    def test_calibrating_tier_under_14_days(self) -> None:
        sig = make_sig(hrv_rmssd_ms=60, hrv_baseline_ms=60, hrv_sd_ms=5)
        dm = compute_recovery(sig, baseline_days=7)
        assert dm.confidence_tier == "calibrating_14d"

    def test_low_tier_between_14_and_28_days(self) -> None:
        sig = make_sig(hrv_rmssd_ms=60, hrv_baseline_ms=60, hrv_sd_ms=5)
        dm = compute_recovery(sig, baseline_days=20)
        assert dm.confidence_tier == "low_14_28"

    def test_standard_tier_at_28_days(self) -> None:
        sig = make_sig(hrv_rmssd_ms=60, hrv_baseline_ms=60, hrv_sd_ms=5)
        dm = compute_recovery(sig, baseline_days=28)
        assert dm.confidence_tier == "standard"

    def test_recovery_bounded_0_1(self) -> None:
        sig = make_sig(
            hrv_rmssd_ms=100,
            hrv_baseline_ms=60,
            hrv_sd_ms=5,
            sleep_score=100,
            subjective_wellness=10,
            soreness=0,
        )
        dm = compute_recovery(sig, baseline_days=30)
        assert dm.recovery_score is not None
        assert 0.0 <= dm.recovery_score <= 1.0

    def test_high_soreness_lowers_score(self) -> None:
        low = make_sig(soreness=1)
        high = make_sig(soreness=9)
        dm_l = compute_recovery(low, baseline_days=30)
        dm_h = compute_recovery(high, baseline_days=30)
        assert dm_h.recovery_score < dm_l.recovery_score  # type: ignore[operator]
