"""Unit tests for the deterministic derived-metrics engine."""

from __future__ import annotations

import pytest

from app.engine.metrics import (
    SignalInput,
    compute_recovery,
    compute_strain_score,
    norm,
    z_score,
)


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


class TestComputeStrainScore:
    def test_returns_none_when_no_active_energy_today(self) -> None:
        assert compute_strain_score(None, 500.0, 14) is None

    def test_returns_none_when_no_baseline_average(self) -> None:
        assert compute_strain_score(400.0, None, 14) is None

    def test_returns_none_when_fewer_than_7_days(self) -> None:
        assert compute_strain_score(400.0, 500.0, 6) is None

    def test_normalization_at_baseline(self) -> None:
        # 500 today / 500 avg = 100% raw, clamped to 100
        result = compute_strain_score(500.0, 500.0, 14)
        assert result == pytest.approx(100.0)

    def test_below_baseline_gives_low_strain(self) -> None:
        # 200 / 500 = 40%
        result = compute_strain_score(200.0, 500.0, 14)
        assert result == pytest.approx(40.0)

    def test_above_baseline_clamped_at_100(self) -> None:
        # 1200 / 500 = 240% — clamped to 100
        result = compute_strain_score(1200.0, 500.0, 14)
        assert result == pytest.approx(100.0)

    def test_zero_active_energy_returns_zero(self) -> None:
        result = compute_strain_score(0.0, 500.0, 14)
        assert result == pytest.approx(0.0)

    def test_exactly_7_days_is_accepted(self) -> None:
        result = compute_strain_score(350.0, 500.0, 7)
        assert result is not None
        assert result == pytest.approx(70.0)

    def test_color_thresholds_align_with_spec(self) -> None:
        # Green: < 40, amber: 40-70, red: > 70
        low = compute_strain_score(150.0, 500.0, 14)  # 30%
        mid = compute_strain_score(275.0, 500.0, 14)  # 55%
        high = compute_strain_score(400.0, 500.0, 14)  # 80%
        assert low is not None and low < 40
        assert mid is not None and 40 <= mid <= 70
        assert high is not None and high > 70
