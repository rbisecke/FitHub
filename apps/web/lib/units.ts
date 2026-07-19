import type { Result } from "@/lib/api";
import { formatWeight } from "@/lib/display";
import { fmtDistance, type DistanceUnit } from "@/lib/distance";
import { formatTime } from "@/lib/time";

/**
 * Units & formatting layer for the logging / workout-review domain (01 §12).
 *
 * Canonical storage is always metric — `load_kg`, `distance_m`, `height_cm`,
 * whole-second times. Display units are a pure client-side preference applied at
 * render/input only; the value sent to the server is always the precise
 * converted-back metric figure (never a rounded display value round-tripped into
 * storage). This module is the single place the history feed, workout detail, and
 * movement detail read their formatting from so the whole domain renders values
 * one consistent way.
 *
 * Existing app-wide helpers (`formatWeight`, `fmtDistance`, `formatTime`) are
 * reused rather than duplicated; this module adds the input-direction
 * conversions (lb→kg, mi/km→m) and the per-result value formatter the redesign's
 * read surfaces need.
 */

export type WeightUnit = "kg" | "lb";
export { type DistanceUnit } from "@/lib/distance";

const KG_PER_LB = 0.45359237;
const M_PER_MILE = 1609.344;

// ---------------------------------------------------------------------------
// Input-direction conversions (display unit → canonical metric, precise).
// The result of these is what gets POSTed, so they do NOT round.
// ---------------------------------------------------------------------------

/** Convert a display weight in the user's unit to canonical kg (unrounded). */
export function toKg(value: number, unit: WeightUnit): number {
  return unit === "lb" ? value * KG_PER_LB : value;
}

/** Convert a display distance in the user's unit to canonical metres (unrounded). */
export function toMeters(value: number, unit: DistanceUnit): number {
  return unit === "mi" ? value * M_PER_MILE : value * 1000;
}

// ---------------------------------------------------------------------------
// Flexible time input (01 §12): "712" → 432s, "45" → 45s, "7:12" → 432s.
// Normalized to m:ss on blur via `formatTime`. Applies to duration_s /
// time_cap_s / time_s / rest_s.
// ---------------------------------------------------------------------------

/**
 * Parse a flexible typed time to whole seconds, or null when unparseable.
 *
 * This is the read/display-side canonical parser for the domain. It mirrors the
 * write-side `parseFlexibleTime` in `components/logging/logBuild.ts` (kept there
 * to avoid a lib→component import) and complements `lib/time.ts`'s
 * `parseTimeInput` (which normalizes to a display string rather than seconds).
 */
export function parseFlexibleTime(input: string): number | null {
  const t = input.trim();
  if (!t) return null;
  if (t.includes(":")) {
    const [m, s] = t.split(":");
    const mm = Number(m);
    const ss = Number(s);
    if (Number.isNaN(mm) || Number.isNaN(ss)) return null;
    return mm * 60 + ss;
  }
  const digits = Number(t);
  if (Number.isNaN(digits)) return null;
  // 3+ digits: last two are seconds (712 → 7:12); otherwise raw seconds.
  if (t.length >= 3) {
    const mm = Math.floor(digits / 100);
    const ss = digits % 100;
    return mm * 60 + ss;
  }
  return digits;
}

/** Normalize a flexible time entry to canonical "m:ss", or "" when empty/invalid. */
export function normalizeTimeInput(input: string): string {
  const s = parseFlexibleTime(input);
  return s == null ? "" : formatTime(s);
}

// ---------------------------------------------------------------------------
// Pace (01 §12): always relative to pace_distance_m, default 500m (erg-split
// convention). Shown with the "/500m" suffix so the number is unambiguous.
// ---------------------------------------------------------------------------

export const DEFAULT_PACE_DISTANCE_M = 500;

/** Format an erg-style pace: seconds per `distanceM`, rendered "m:ss /500m". */
export function formatErgPace(
  paceS: number,
  distanceM: number = DEFAULT_PACE_DISTANCE_M,
): string {
  return `${formatTime(Math.round(paceS))} /${distanceM}m`;
}

// ---------------------------------------------------------------------------
// Local-date-parts handling (01 §12; project frontend rule). `performed_at` is
// sent as local midnight with no tz suffix — parse it from local parts, never
// `new Date(iso)` (which reads a date-only string as UTC and shifts the day).
// ---------------------------------------------------------------------------

/** Parse a date or date-time string to a local `Date` at local midnight of its calendar day. */
export function parseLocalDate(value: string): Date {
  const datePart = value.slice(0, 10);
  const [y, m, d] = datePart.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

/** Build a "YYYY-MM-DD" key from a date/date-time string using its local calendar day. */
export function localDateKey(value: string): string {
  const dt = parseLocalDate(value);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ---------------------------------------------------------------------------
// Per-result value formatting for read surfaces (history rows, workout detail,
// movement detail). One function so every screen renders a Result the same way.
// ---------------------------------------------------------------------------

export interface DisplayUnits {
  weight: WeightUnit;
  distance: DistanceUnit;
}

/**
 * Format a single `Result`'s primary value string for its `result_type`,
 * respecting the user's display units. e.g. "100 kg × 5", "7:12", "2.00 km",
 * "18 cal", "3 + 4 rounds", "1:52 /500m".
 */
export function formatResultValue(
  result: Pick<
    Result,
    | "result_type"
    | "load_kg"
    | "reps"
    | "time_s"
    | "distance_m"
    | "calories"
    | "height_cm"
    | "rounds"
    | "partial_reps"
    | "watts"
    | "pace_s"
    | "pace_distance_m"
  >,
  units: DisplayUnits,
): string {
  const num = (v: string | number | null | undefined): number | null =>
    v == null || v === "" ? null : Number(v);

  switch (result.result_type) {
    case "weight": {
      const kg = num(result.load_kg);
      const reps = result.reps;
      const w = kg == null ? "" : formatWeight(kg, units.weight);
      if (kg != null && reps != null) return `${w} × ${reps}`;
      if (kg != null) return w;
      return reps != null ? `${reps} reps` : "—";
    }
    case "reps":
      return result.reps != null ? `${result.reps} reps` : "—";
    case "time":
      return result.time_s != null ? formatTime(result.time_s) : "—";
    case "distance": {
      const m = num(result.distance_m);
      return m != null ? fmtDistance(m, units.distance) : "—";
    }
    case "calories":
      return result.calories != null ? `${result.calories} cal` : "—";
    case "height": {
      const cm = num(result.height_cm);
      return cm != null ? `${cm} cm` : "—";
    }
    case "rounds_reps": {
      const r = result.rounds;
      const p = result.partial_reps;
      if (r != null && p != null && p > 0) return `${r} + ${p} rounds`;
      if (r != null) return `${r} rounds`;
      return "—";
    }
    case "watts":
      return result.watts != null ? `${result.watts} W` : "—";
    case "pace": {
      const paceS = result.pace_s;
      if (paceS == null) return "—";
      return formatErgPace(
        paceS,
        result.pace_distance_m ?? DEFAULT_PACE_DISTANCE_M,
      );
    }
    default:
      return "—";
  }
}

/**
 * The `| Scaled` qualifier for a result row (01 §5.5). btwb's inline Rx'd/Scaled
 * pattern, resolved to low-noise: renders only when `scaled` is set (an unscaled
 * result is the norm and carries no tag), so this returns null for Rx'd results.
 */
export function scaledQualifier(scaled: boolean): "Scaled" | null {
  return scaled ? "Scaled" : null;
}
