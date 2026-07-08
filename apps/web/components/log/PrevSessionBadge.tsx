"use client";

import type { LastResult } from "@/lib/api";
import { relativeDate, formatWeight } from "@/lib/display";
import { fmtDistance, type DistanceUnit } from "@/lib/distance";

function formatValue(
  r: LastResult,
  distanceUnit: DistanceUnit,
  weightUnit: "kg" | "lb",
): string {
  switch (r.result_type) {
    case "weight": {
      if (r.load_kg == null) return "";
      const display = formatWeight(Number(r.load_kg), weightUnit);
      return r.reps != null ? `${display} × ${r.reps}` : display;
    }
    case "reps":
      return r.reps != null ? `${r.reps} reps` : "";
    case "time": {
      if (r.time_s == null) return "";
      const m = Math.floor(r.time_s / 60);
      const s = r.time_s % 60;
      return `${m}:${String(s).padStart(2, "0")}`;
    }
    case "distance":
      return r.distance_m != null
        ? fmtDistance(Number(r.distance_m), distanceUnit)
        : "";
    case "calories":
      return r.calories != null ? `${r.calories} cal` : "";
    case "rounds_reps":
      if (r.rounds == null) return "";
      return r.partial_reps != null
        ? `${r.rounds} + ${r.partial_reps} reps`
        : `${r.rounds} rounds`;
    case "watts":
      return r.watts != null ? `${r.watts} W` : "";
    case "height":
      return "";
    case "pace":
      return "";
    default:
      return "";
  }
}

interface PrevSessionBadgeProps {
  lastResult: LastResult | null | undefined;
  onFill: (r: LastResult) => void;
  distanceUnit: DistanceUnit;
  weightUnit?: "kg" | "lb";
}

export function PrevSessionBadge({
  lastResult,
  onFill,
  distanceUnit,
  weightUnit = "kg",
}: PrevSessionBadgeProps) {
  return (
    <div className="min-h-[1.25rem] mt-1">
      {lastResult &&
        (() => {
          const value = formatValue(lastResult, distanceUnit, weightUnit);
          if (!value) return null;
          return (
            <button
              type="button"
              onClick={() => onFill(lastResult)}
              className="font-mono text-xs text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              title="Tap to auto-fill"
            >
              prev: {value} · {relativeDate(lastResult.performed_at)}
            </button>
          );
        })()}
    </div>
  );
}
