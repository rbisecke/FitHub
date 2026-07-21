import type { LastResult } from "@/lib/api";
import { formatWeight } from "@/lib/display";
import { fmtDistance } from "@/lib/distance";
import { formatAchievedDate, formatTime } from "@/lib/records/prFormat";
import type { DisplayUnits } from "@/lib/units";

function formatLastResult(result: LastResult, units: DisplayUnits): string {
  switch (result.result_type) {
    case "weight": {
      const kg = result.load_kg != null ? Number(result.load_kg) : null;
      if (kg != null && result.reps != null) {
        return `${formatWeight(kg, units.weight)} x ${result.reps}`;
      }
      return kg != null ? formatWeight(kg, units.weight) : "—";
    }
    case "reps":
      return result.reps != null ? `${result.reps} reps` : "—";
    case "time":
      return result.time_s != null ? formatTime(result.time_s) : "—";
    case "distance": {
      const m = result.distance_m != null ? Number(result.distance_m) : null;
      return m != null ? fmtDistance(m, units.distance) : "—";
    }
    case "calories":
      return result.calories != null ? `${result.calories} cal` : "—";
    case "rounds_reps": {
      if (result.rounds != null && result.partial_reps) {
        return `${result.rounds} + ${result.partial_reps} rounds`;
      }
      return result.rounds != null ? `${result.rounds} rounds` : "—";
    }
    case "watts":
      return result.watts != null ? `${result.watts} W` : "—";
    default:
      return "—";
  }
}

/**
 * Non-loaded movement fallback (design-spec 04 Screen 2F). A bodyweight
 * max-reps, max-distance, or fastest-unloaded-time movement never populates
 * `estimated_1rm_kg`, so it never appears in `personal-records` and a
 * movement-detail lookup for it resolves here instead of a dead error page.
 *
 * Known limitation: the only existing endpoint that can describe such a
 * movement's logged activity without a backend change is `last-result`
 * (single most recent result of any type), not a full multi-row history —
 * `movement-history` itself filters on `estimated_1rm_kg IS NOT NULL` and
 * would always come back empty for a genuinely non-loaded movement. This
 * renders that one most-recent result rather than promising a full set log
 * this API surface cannot currently provide.
 */
export function NonLoadedFallback({
  movementName,
  lastResult,
  units,
  state,
}: {
  movementName: string;
  lastResult: LastResult | null;
  units: DisplayUnits;
  state: "loading" | "error" | "idle";
}) {
  return (
    <div className="flex flex-col gap-4">
      <div
        className="rounded-[10px] border px-4 py-4"
        style={{ borderColor: "var(--border)", background: "var(--card)" }}
      >
        <p
          className="font-sans text-[13px]"
          style={{ color: "var(--foreground)" }}
        >
          No e1RM record for this movement — it isn&apos;t a loaded, rep-based
          lift. Here&apos;s your logged history instead.
        </p>
      </div>

      <div>
        <p
          className="font-sans text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: "var(--muted-foreground)" }}
        >
          {movementName}
        </p>

        {state === "loading" ? (
          <p
            className="mt-2 font-sans text-[13px]"
            style={{ color: "var(--muted-foreground)" }}
          >
            Loading last logged result…
          </p>
        ) : state === "error" ? (
          <p
            className="mt-2 font-sans text-[13px]"
            style={{ color: "var(--destructive)" }}
          >
            Couldn&apos;t load this movement&apos;s history.
          </p>
        ) : lastResult == null ? (
          <p
            className="mt-2 font-sans text-[13px]"
            style={{ color: "var(--muted-foreground)" }}
          >
            No sets logged yet for this movement.
          </p>
        ) : (
          <div className="mt-2">
            <p
              className="font-mono text-[28px] font-bold tabular-nums"
              style={{ color: "var(--foreground)" }}
            >
              {formatLastResult(lastResult, units)}
            </p>
            <p
              className="mt-1 font-sans text-[12px]"
              style={{ color: "var(--muted-foreground)" }}
            >
              last logged {formatAchievedDate(lastResult.performed_at)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
