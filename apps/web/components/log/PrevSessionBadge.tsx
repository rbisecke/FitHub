"use client";

import type { LastResult } from "@/lib/api";
import { relativeDate } from "@/lib/display";

function formatValue(r: LastResult): string {
  switch (r.result_type) {
    case "weight": {
      const load = r.load_kg != null ? String(r.load_kg) : null;
      if (!load) return "";
      return r.reps != null ? `${load} kg × ${r.reps}` : `${load} kg`;
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
      return r.distance_m != null ? `${r.distance_m} m` : "";
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
}

export function PrevSessionBadge({
  lastResult,
  onFill,
}: PrevSessionBadgeProps) {
  return (
    <div className="min-h-[1.25rem] mt-1">
      {lastResult &&
        (() => {
          const value = formatValue(lastResult);
          if (!value) return null;
          return (
            <button
              type="button"
              onClick={() => onFill(lastResult)}
              className="font-mono text-xs text-[#8b949e] hover:text-[#e6edf3] transition-colors"
              title="Tap to auto-fill"
            >
              prev: {value} · {relativeDate(lastResult.performed_at)}
            </button>
          );
        })()}
    </div>
  );
}
