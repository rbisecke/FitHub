"""Deterministic derived-metrics engine. No LLM dependency."""

from __future__ import annotations

import statistics
from dataclasses import dataclass


@dataclass
class SignalInput:
    """One day's worth of recovery signals for a single user."""

    hrv_rmssd_ms: float | None
    hrv_baseline_ms: float | None
    hrv_sd_ms: float | None
    rhr_bpm: float | None
    rhr_baseline_bpm: float | None
    rhr_sd_bpm: float | None
    sleep_score: float | None
    subjective_wellness: float | None
    soreness: float | None


@dataclass
class DerivedMetrics:
    recovery_score: float | None
    strain_score: float | None
    hooper_index: float | None
    coverage: float
    confidence_tier: str


def z_score(val: float, mean: float, sd: float) -> float | None:
    if sd == 0:
        return None
    return (val - mean) / sd


def norm(z: float, clamp: float = 3.0) -> float:
    """Normalise a z-score to [0, 1]. Negative z = bad outcome."""
    clamped = max(-clamp, min(clamp, z))
    return (clamped + clamp) / (2 * clamp)


def compute_recovery(sig: SignalInput, baseline_days: int) -> DerivedMetrics:
    scores: list[float] = []
    present = 0

    if sig.hrv_rmssd_ms is not None and sig.hrv_baseline_ms and sig.hrv_sd_ms:
        z = z_score(sig.hrv_rmssd_ms, sig.hrv_baseline_ms, sig.hrv_sd_ms)
        if z is not None:
            scores.append(norm(z))
        present += 1

    if sig.rhr_bpm is not None and sig.rhr_baseline_bpm and sig.rhr_sd_bpm:
        z = z_score(sig.rhr_bpm, sig.rhr_baseline_bpm, sig.rhr_sd_bpm)
        if z is not None:
            scores.append(norm(-z))
        present += 1

    if sig.sleep_score is not None:
        scores.append(sig.sleep_score / 100.0)
        present += 1

    if sig.subjective_wellness is not None:
        scores.append(sig.subjective_wellness / 10.0)
        present += 1

    if sig.soreness is not None:
        scores.append(1.0 - (sig.soreness / 10.0))
        present += 1

    recovery = statistics.mean(scores) if scores else None
    coverage = present / 5.0

    if baseline_days < 14:
        tier = "calibrating_14d"
    elif baseline_days < 28:
        tier = "low_14_28"
    else:
        tier = "standard"

    return DerivedMetrics(
        recovery_score=recovery,
        strain_score=None,
        hooper_index=None,
        coverage=coverage,
        confidence_tier=tier,
    )
