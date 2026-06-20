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


async def compute_today_recovery(
    user_id: str,
    db: psycopg.AsyncConnection[object],
) -> dict[str, object]:
    """Compute today's recovery score and upsert into derived_metrics."""
    from app.engine.metrics import SignalInput, compute_recovery

    today = date.today()

    async def latest(mtype: str) -> float | None:
        async with db.cursor(row_factory=psycopg.rows.dict_row) as cur:
            await cur.execute(
                """
                SELECT value::float AS value
                FROM metric_samples
                WHERE user_id = %s AND type = %s AND started_at::date = %s
                ORDER BY source_priority ASC, started_at DESC LIMIT 1
                """,
                [user_id, mtype, today],
            )
            row = await cur.fetchone()
        return float(row["value"]) if row else None

    hrv_sdnn = await latest("hrv_sdnn")
    hrv_rmssd = await latest("hrv_rmssd")

    hrv = hrv_sdnn if hrv_sdnn is not None else hrv_rmssd
    hrv_type = "hrv_sdnn" if hrv_sdnn is not None else "hrv_rmssd"

    hrv_mean, hrv_sd, hrv_days = await get_baseline(user_id, hrv_type, db)
    rhr_mean, rhr_sd, _ = await get_baseline(user_id, "rhr", db)

    rhr = await latest("rhr")
    sleep = await latest("sleep_score")
    wellness = await latest("subjective_wellness")
    soreness = await latest("soreness")

    sig = SignalInput(
        hrv_rmssd_ms=hrv,
        hrv_baseline_ms=hrv_mean,
        hrv_sd_ms=hrv_sd,
        rhr_bpm=rhr,
        rhr_baseline_bpm=rhr_mean,
        rhr_sd_bpm=rhr_sd,
        sleep_score=sleep,
        subjective_wellness=wellness,
        soreness=soreness,
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
