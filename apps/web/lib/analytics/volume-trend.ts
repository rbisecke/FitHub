import { parseLocalDate, formatLocalDate } from "@/lib/units";
import type { SessionType, WeeklyVolume } from "@/lib/api";

/**
 * Pure data-shaping for Screen 7 (Volume Trend), 04-records-and-analytics.md
 * §Screen 7. No React — testable in isolation.
 *
 * The critical edge case this module exists to get right (04 §Screen 7
 * States, cross-screen edge-case #6): a week with zero workouts produces NO
 * row from `GET /analytics/volume-trend` — unlike the daily load series,
 * this series has real gaps. The chart must render those as visible
 * empty/zero gaps, never interpolate a line across them. Every function here
 * distinguishes "no row for this week" (a gap, value `null`) from "a row
 * exists with total_load/workout_count === 0" (a real recorded zero).
 */

/** The view a session-type switcher can be set to — "all" sums every type; "other" is the null bucket. */
export type VolumeView = SessionType | "all" | "other";

export type VolumeMetric = "total_load" | "workout_count";

function mondayOf(d: Date): Date {
  const day = d.getDay(); // 0=Sun..6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToMonday);
}

/**
 * Every Monday-aligned `week_start` (matching the backend's
 * `DATE_TRUNC('week', ...)`) in the trailing `weeksCount` weeks, oldest
 * first, ending at the current week. `now` is injectable for tests.
 */
export function buildWeekWindow(
  weeksCount: number,
  now = new Date(),
): string[] {
  const thisMonday = mondayOf(now);
  const out: string[] = [];
  for (let i = weeksCount - 1; i >= 0; i--) {
    const d = new Date(
      thisMonday.getFullYear(),
      thisMonday.getMonth(),
      thisMonday.getDate() - i * 7,
    );
    out.push(formatLocalDate(d));
  }
  return out;
}

export interface WeekBar {
  weekStart: string;
  /** null = gap (no workouts logged that week for this view); a number is a real value, incl. a real 0. */
  value: number | null;
}

/** session_type=null buckets into "other" (04 §Screen 7 States) — never dropped. */
function rowView(row: WeeklyVolume): VolumeView {
  return row.session_type ?? "other";
}

/**
 * Aggregate the raw (sparse) API rows into one bar per week in `window`,
 * for the given view + metric. `view === "all"` sums every session_type row
 * that week (incl. the null/"other" bucket); a specific view filters to only
 * that type's rows. A week absent from the filtered rows renders as a gap
 * (`value: null`), never a false zero.
 */
export function aggregateWeeklyBars(
  rows: WeeklyVolume[],
  window: string[],
  view: VolumeView,
  metric: VolumeMetric,
): WeekBar[] {
  const byWeek = new Map<string, WeeklyVolume[]>();
  for (const row of rows) {
    const key = row.week_start;
    const list = byWeek.get(key) ?? [];
    list.push(row);
    byWeek.set(key, list);
  }

  return window.map((weekStart) => {
    const weekRows = (byWeek.get(weekStart) ?? []).filter(
      (r) => view === "all" || rowView(r) === view,
    );
    if (weekRows.length === 0) return { weekStart, value: null };
    const total = weekRows.reduce((sum, r) => sum + r[metric], 0);
    return { weekStart, value: total };
  });
}

/** Distinct session types + "other" actually present anywhere in `rows`, for building switcher tabs. */
export function distinctViews(rows: WeeklyVolume[]): VolumeView[] {
  const seen = new Set<VolumeView>();
  for (const r of rows) seen.add(rowView(r));
  return [...seen];
}

export interface StackedWeekBar {
  weekStart: string;
  /** null when the week has no rows at all (a true gap); otherwise per-view totals (0 omitted keys implied). */
  segments: Partial<Record<VolumeView, number>> | null;
}

/** Same gap semantics as `aggregateWeeklyBars`, but keeps every view's slice for the opt-in stacked chart. */
export function aggregateStackedBars(
  rows: WeeklyVolume[],
  window: string[],
  metric: VolumeMetric,
): StackedWeekBar[] {
  const byWeek = new Map<string, WeeklyVolume[]>();
  for (const row of rows) {
    const key = row.week_start;
    const list = byWeek.get(key) ?? [];
    list.push(row);
    byWeek.set(key, list);
  }

  return window.map((weekStart) => {
    const weekRows = byWeek.get(weekStart) ?? [];
    if (weekRows.length === 0) return { weekStart, segments: null };
    const segments: Partial<Record<VolumeView, number>> = {};
    for (const r of weekRows) {
      const v = rowView(r);
      segments[v] = (segments[v] ?? 0) + r[metric];
    }
    return { weekStart, segments };
  });
}

/** Short week label for chart ticks, e.g. "Jul 6", parsed via local date parts (never `new Date(iso)`). */
export function weekTickLabel(weekStart: string): string {
  const d = parseLocalDate(weekStart);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export const SESSION_TYPE_LABEL: Record<VolumeView, string> = {
  all: "All",
  strength: "Strength",
  metcon: "Metcon",
  skill: "Skill",
  mixed: "Mixed",
  rest: "Rest",
  deload: "Deload",
  active_recovery: "Active recovery",
  other: "Other",
};
