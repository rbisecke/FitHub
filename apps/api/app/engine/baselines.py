"""28-day baseline engine: computes rolling mean/SD and today's recovery score."""

from __future__ import annotations

from datetime import date, timedelta

import psycopg
import psycopg.rows


async def get_baseline(
    user_id: str,
    metric_type: str,
    db: psycopg.AsyncConnection[object],
    window_days: int = 28,
) -> tuple[float | None, float | None, int]:
    """Return (mean, sd, n_days) over the trailing window excluding today."""
    cutoff = date.today() - timedelta(days=window_days)
    today = date.today()

    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            """
            SELECT
                AVG(value)::float          AS mean,
                STDDEV_SAMP(value)::float  AS sd,
                COUNT(DISTINCT started_at::date)::int AS n_days
            FROM metric_samples
            WHERE user_id = %s
              AND type = %s
              AND started_at::date >= %s
              AND started_at::date < %s
            """,
            [user_id, metric_type, cutoff, today],
        )
        row = await cur.fetchone()

    if row is None or row["n_days"] == 0:
        return None, None, 0

    return row["mean"], row["sd"], row["n_days"]


_SIGNAL_TYPES = [
    "hrv_sdnn",
    "hrv_rmssd",
    "rhr",
    "sleep_score",
    "subjective_wellness",
    "soreness",
]


async def _fetch_today_signals(
    user_id: str,
    db: psycopg.AsyncConnection[object],
    today: date,
) -> dict[str, float]:
    """Fetch today's metric_samples values for all recovery signal types."""
    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            """
            SELECT DISTINCT ON (type) type, value::float AS value
            FROM metric_samples
            WHERE user_id = %s AND type = ANY(%s) AND started_at::date = %s
            ORDER BY type, source_priority ASC, started_at DESC
            """,
            [user_id, _SIGNAL_TYPES, today],
        )
        rows = await cur.fetchall()
    return {r["type"]: r["value"] for r in rows}


async def _fetch_hrv_rhr_baselines(
    user_id: str,
    db: psycopg.AsyncConnection[object],
    hrv_type: str,
    cutoff: date,
    today: date,
) -> dict[str, dict[str, object]]:
    """Return 28-day mean/sd/n_days for the active HRV metric and RHR."""
    async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
        await cur.execute(
            """
            SELECT type,
                   AVG(value)::float            AS mean,
                   STDDEV_SAMP(value)::float    AS sd,
                   COUNT(DISTINCT started_at::date)::int AS n_days
            FROM metric_samples
            WHERE user_id = %s AND type = ANY(%s)
              AND started_at::date >= %s AND started_at::date < %s
            GROUP BY type
            """,
            [user_id, [hrv_type, "rhr"], cutoff, today],
        )
        rows = await cur.fetchall()
    return {r["type"]: r for r in rows}


async def compute_today_recovery(
    user_id: str,
    db: psycopg.AsyncConnection[object],
) -> dict[str, object]:
    """Compute today's recovery score and upsert into derived_metrics."""
    from app.engine.metrics import SignalInput, compute_recovery

    today = date.today()
    cutoff = today - timedelta(days=28)
    signals = await _fetch_today_signals(user_id, db, today)

    hrv_sdnn = signals.get("hrv_sdnn")
    hrv = hrv_sdnn if hrv_sdnn is not None else signals.get("hrv_rmssd")
    hrv_type = "hrv_sdnn" if hrv_sdnn is not None else "hrv_rmssd"

    baselines = await _fetch_hrv_rhr_baselines(user_id, db, hrv_type, cutoff, today)

    def _fv(d: dict[str, object], key: str) -> float | None:
        v = d.get(key)
        return float(v) if v is not None else None  # type: ignore[arg-type]

    hrv_b = baselines.get(hrv_type) or {}
    rhr_b = baselines.get("rhr") or {}
    n_days_raw = hrv_b.get("n_days")
    hrv_days = int(n_days_raw) if isinstance(n_days_raw, int) else 0

    sig = SignalInput(
        hrv_rmssd_ms=hrv,
        hrv_baseline_ms=_fv(hrv_b, "mean"),
        hrv_sd_ms=_fv(hrv_b, "sd"),
        rhr_bpm=signals.get("rhr"),
        rhr_baseline_bpm=_fv(rhr_b, "mean"),
        rhr_sd_bpm=_fv(rhr_b, "sd"),
        sleep_score=signals.get("sleep_score"),
        subjective_wellness=signals.get("subjective_wellness"),
        soreness=signals.get("soreness"),
    )
    dm = compute_recovery(sig, baseline_days=hrv_days)

    await db.execute(
        """
        INSERT INTO derived_metrics
            (user_id, date, recovery_score, coverage, confidence_tier, baseline_days)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (user_id, date) DO UPDATE
            SET recovery_score   = EXCLUDED.recovery_score,
                coverage         = EXCLUDED.coverage,
                confidence_tier  = EXCLUDED.confidence_tier,
                baseline_days    = EXCLUDED.baseline_days,
                computed_at      = now()
        """,
        [user_id, today, dm.recovery_score, dm.coverage, dm.confidence_tier, hrv_days],
    )
    return {
        "recovery_score": dm.recovery_score,
        "coverage": dm.coverage,
        "confidence_tier": dm.confidence_tier,
        "hrv_type": hrv_type,
    }
