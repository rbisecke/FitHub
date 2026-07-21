import type { PersonalRecord } from "@/lib/api";
import { formatWeight } from "@/lib/display";
import { parseLocalDate } from "@/lib/units";

export type WeightUnit = "kg" | "lb";

/** "YYYY-MM-DD" -> "Jun 18, 2025", parsed via local date parts (never
 * `new Date(iso)`, which shifts a date-only string by the local UTC offset). */
export function formatAchievedDate(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Human label for one variant, e.g. "Barbell", "Dumbbell · Left", "Left". */
export function variantLabel(record: PersonalRecord): string | null {
  const parts: string[] = [];
  if (record.implement) parts.push(capitalize(record.implement));
  if (record.side) parts.push(capitalize(record.side));
  return parts.length > 0 ? parts.join(" · ") : null;
}

function capitalize(value: string): string {
  return value.length > 0 ? value[0]!.toUpperCase() + value.slice(1) : value;
}

/**
 * e1RM-confidence qualifier (cross-cutting rule): a set of `reps > 10` reads
 * "estimated from {reps}x{load}{unit}"; `reps <= 10`, and always a true
 * 1-rep-max set, renders with no qualifier since it's a directly-observed
 * max rather than a high-rep extrapolation.
 */
export function e1rmConfidenceQualifier(
  record: PersonalRecord,
  unit: WeightUnit,
): string | null {
  if (record.reps == null || record.load_kg == null) return null;
  if (record.reps <= 10) return null;
  return `estimated from ${record.reps}x${formatWeight(record.load_kg, unit)}`;
}

/**
 * The logged set that produced this PR, as a display string. Prefers the
 * weight x reps expression; falls back to the formatted time for a
 * time-based record (`time_s` present, `load_kg`/`reps` absent) so a
 * time-based PR never renders a blank "source set" line.
 */
export function prSourceExpression(
  record: PersonalRecord,
  unit: WeightUnit,
): string | null {
  if (record.load_kg != null && record.reps != null) {
    return `${formatWeight(record.load_kg, unit)} x ${record.reps}`;
  }
  if (record.time_s != null) return formatTime(record.time_s);
  return null;
}

/** The PR's hero value as a display string — time-based when `time_s` is the
 * only source data, otherwise the e1RM converted to the display unit. */
export function prHeroValue(record: PersonalRecord, unit: WeightUnit): string {
  if (record.load_kg == null && record.reps == null && record.time_s != null) {
    return formatTime(record.time_s);
  }
  return formatWeight(record.best_1rm_kg, unit);
}

export function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export type TrendDirection = "up" | "flat" | "down";

/**
 * Current-vs-best trend direction (cross-cutting rule: only "up" is colored;
 * down and flat are both neutral, never red — an ordinary dip isn't danger).
 */
export function trendDirection(record: PersonalRecord): TrendDirection | null {
  if (record.current_e1rm_kg == null) return null;
  const diff = record.current_e1rm_kg - record.best_1rm_kg;
  const epsilon = 0.5;
  if (diff > epsilon) return "up";
  if (diff < -epsilon) return "down";
  return "flat";
}

export function trendGlyph(direction: TrendDirection): string {
  if (direction === "up") return "↑";
  if (direction === "down") return "↓";
  return "→";
}

/** Only "up" carries the accent/green color; down/flat are always neutral. */
export function trendColorVar(direction: TrendDirection): string {
  return direction === "up" ? "var(--green)" : "var(--muted)";
}

/**
 * Delta chip classification (Screen 1: `delta_kg` of exactly 0.0 is a real,
 * distinct case from null — a tied lift, never a false "+0.0kg" gain chip).
 */
export type DeltaKind = "gain" | "matched" | "none";

export function deltaKind(record: PersonalRecord): DeltaKind {
  if (record.delta_kg == null) return "none";
  if (record.delta_kg > 0.01) return "gain";
  return "matched";
}
