"""Apple Health HAE payload parser and metric ingestor."""

from __future__ import annotations

import re
from datetime import UTC, datetime
from typing import Any

import psycopg

METRIC_MAP: dict[str, tuple[str, str]] = {
    "heart_rate_variability_sdnn": ("hrv_sdnn", "ms"),
    "resting_heart_rate": ("rhr", "bpm"),
    "respiratory_rate": ("respiratory_rate", "breaths_per_min"),
    "oxygen_saturation": ("spo2", "pct"),
    "vo2_max": ("vo2max", "ml_kg_min"),
    "active_energy": ("active_energy_kcal", "kcal"),
    "basal_energy_burned": ("resting_energy_kcal", "kcal"),
    "step_count": ("steps", "count"),
}

SOURCE = "apple_health"
SOURCE_PRIORITY = 3


def _parse_hae_timestamp(raw: str) -> datetime:
    """Handle HAE's three timestamp formats, all normalised to UTC."""
    s = raw.strip().replace(" ", "T")
    s = re.sub(r"([+-])(\d{2})(\d{2})$", r"\1\2:\3", s)
    if not s.endswith("Z") and "+" not in s[10:] and s.count("-") < 3:
        s += "Z"
    return datetime.fromisoformat(s).astimezone(UTC)


def compute_sleep_score(stages: list[dict[str, Any]]) -> float | None:
    """Derive 0–100 sleep score from Apple Watch sleep stage durations."""
    stage_map = {
        "ASLEEPREM": "rem",
        "ASLEEPDEEP": "deep",
        "ASLEEPCORE": "light",
        "AWAKE": "awake",
    }
    buckets: dict[str, float] = {"rem": 0.0, "deep": 0.0, "light": 0.0, "awake": 0.0}
    for s in stages:
        mapped = stage_map.get(s.get("stage", ""))
        if mapped:
            buckets[mapped] += float(s.get("duration_s", 0))

    total_asleep = buckets["rem"] + buckets["deep"] + buckets["light"]
    if total_asleep < 3600:
        return None

    target_hours = 8.0
    restorative_pct = (buckets["rem"] + buckets["deep"]) / total_asleep
    duration_score = min(total_asleep / (target_hours * 3600), 1.0)
    quality_score = min(restorative_pct / 0.40, 1.0)
    return round((duration_score * 0.5 + quality_score * 0.5) * 100, 1)


async def ingest_apple_health(
    payload: dict[str, Any],
    user_id: str,
    db: psycopg.AsyncConnection[object],
) -> int:
    """Parse an HAE payload and upsert metric_samples. Returns row count."""
    metrics: list[dict[str, Any]] = payload.get("data", {}).get("metrics", [])
    rows_inserted = 0

    for metric in metrics:
        name: str = metric.get("name", "")
        data_points: list[dict[str, Any]] = metric.get("data", [])

        if name == "sleep_analysis":
            for dp in data_points:
                stages = dp.get("data", [])
                score = compute_sleep_score(stages)
                if score is None:
                    continue
                ts = _parse_hae_timestamp(dp["date"])
                await db.execute(
                    """
                    INSERT INTO metric_samples
                        (user_id, type, value, unit, source, source_priority, started_at)
                    VALUES (%s, 'sleep_score', %s, 'score_0_100', %s, %s, %s)
                    ON CONFLICT (user_id, type, started_at, source)
                    DO UPDATE SET value = EXCLUDED.value
                    """,
                    [user_id, score, SOURCE, SOURCE_PRIORITY, ts],
                )
                rows_inserted += 1
            continue

        mapping = METRIC_MAP.get(name)
        if mapping is None:
            continue

        fithub_type, unit = mapping
        for dp in data_points:
            raw_val = dp.get("qty") or dp.get("avg")
            if raw_val is None:
                continue
            ts = _parse_hae_timestamp(dp["date"])
            await db.execute(
                """
                INSERT INTO metric_samples
                    (user_id, type, value, unit, source, source_priority, started_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (user_id, type, started_at, source)
                DO UPDATE SET value = EXCLUDED.value
                """,
                [user_id, fithub_type, float(raw_val), unit, SOURCE, SOURCE_PRIORITY, ts],
            )
            rows_inserted += 1

    return rows_inserted
