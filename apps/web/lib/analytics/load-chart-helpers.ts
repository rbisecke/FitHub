import { parseLocalDate } from "@/lib/units";
import type { ContributionPoint, DailyLoadPoint } from "@/lib/api";

/**
 * Pure helpers for the Load Model dashboard (design-spec 04 Screen 4).
 * Kept separate from `lib/analytics/load-trend.ts` (pre-redesign, still used
 * by the old `/analytics` dashboard cards) because that file's TSB/ATL
 * helpers assign `--red`/`--amber` to ordinary trend direction, which the
 * redesigned domain's cross-cutting rule forbids: only an *improving* trend
 * glyph is colored, down/flat is always neutral (`--muted`), `--red` is
 * reserved for genuine danger states (ACWR overreaching), never a normal dip.
 */

export type TrendDirection = "up" | "down" | "flat";

const TREND_LOOKBACK_DAYS = 7;

/**
 * Direction of a headline metric vs. ~7 days ago. Only the "up" case should
 * ever be rendered in an accent/green color by callers — down and flat both
 * read as neutral/muted.
 */
export function computeTrendDirection(
  currentValue: number,
  series: DailyLoadPoint[],
  key: "ctl" | "atl" | "tsb",
): TrendDirection {
  if (series.length <= TREND_LOOKBACK_DAYS) return "flat";
  const priorPoint = series[series.length - 1 - TREND_LOOKBACK_DAYS];
  const priorValue = priorPoint ? priorPoint[key] : currentValue;
  const diff = currentValue - priorValue;
  const epsilon = key === "tsb" ? 1 : 0.5;
  if (diff > epsilon) return "up";
  if (diff < -epsilon) return "down";
  return "flat";
}

export function trendGlyph(direction: TrendDirection): string {
  if (direction === "up") return "↑";
  if (direction === "down") return "↓";
  return "→";
}

/** Only "up" carries the accent color; down/flat are always neutral (cross-cutting rule). */
export function trendColorClass(direction: TrendDirection): string {
  return direction === "up" ? "text-[var(--green)]" : "text-[var(--muted)]";
}

export type AcwrZone =
  | "insufficient_data"
  | "undertraining"
  | "sweet_spot"
  | "caution"
  | "overreaching";

export interface AcwrZoneBand {
  key: Exclude<AcwrZone, "insufficient_data">;
  label: string;
  /** Inclusive lower bound on the 0–2+ gauge scale. */
  min: number;
  /** Exclusive upper bound; null = open-ended (overreaching). */
  max: number | null;
  color: string;
}

/** Zone bands for the ACWR gauge, in display order left-to-right. */
export const ACWR_ZONE_BANDS: AcwrZoneBand[] = [
  {
    key: "undertraining",
    label: "Undertraining",
    min: 0,
    max: 0.8,
    color: "var(--muted)",
  },
  {
    key: "sweet_spot",
    label: "Sweet spot",
    min: 0.8,
    max: 1.3,
    color: "var(--green)",
  },
  {
    key: "caution",
    label: "Caution",
    min: 1.3,
    max: 1.5,
    color: "var(--amber)",
  },
  {
    key: "overreaching",
    label: "Overreaching",
    min: 1.5,
    max: null,
    color: "var(--red)",
  },
];

/** Gauge scale ceiling — an ACWR above this is pinned to the right edge, not clipped off-track. */
export const ACWR_GAUGE_MAX = 2.0;

export function formatDayShort(iso: string): string {
  const d = parseLocalDate(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatDayIso(iso: string): string {
  return iso.slice(0, 10);
}

/** Threshold above which the daily load footer rolls up into weekly bars (functional §2.3 / spec Screen 4). */
export const WEEKLY_ROLLUP_THRESHOLD_DAYS = 120;

export interface WeeklyLoadBar {
  weekStart: string;
  loadAu: number;
}

/** Roll a daily load_au series up into weekly-summed bars, oldest week first. */
export function aggregateWeekly(series: DailyLoadPoint[]): WeeklyLoadBar[] {
  const weeks: WeeklyLoadBar[] = [];
  for (let i = 0; i < series.length; i += 7) {
    const chunk = series.slice(i, i + 7);
    if (chunk.length === 0) continue;
    const weekStart = chunk[0]!.day;
    const loadAu = chunk.reduce((sum, pt) => sum + pt.load_au, 0);
    weeks.push({ weekStart, loadAu });
  }
  return weeks;
}

/** CTL's 42-day EWMA window — also the warm-up-ramp cutoff (design-spec Screen 4). */
const WARMUP_WINDOW_DAYS = 42;

/**
 * Determine the "building baseline" hatch cutoff: the ISO date 42 days after
 * the user's true first-ever logged workout. Returns null when the user has
 * no training history within the lookback, or when their history already
 * extends past the warm-up window (no hatching needed).
 *
 * The `/analytics/load` response has no `first_workout_date` field and its
 * `series` is zero-filled (a rest day and "before you ever trained" are
 * indistinguishable there — edge-case-summary #6), so this derives the true
 * first-workout day from `/analytics/contributions`, which does NOT
 * zero-fill (only days with an actual logged workout appear). Callers should
 * fetch contributions with the maximum `days=730` window; if the user's
 * first workout predates that window, this returns null (their history is
 * already far past 42 days everywhere the load-model window can reach, so no
 * hatch is needed regardless of the exact date).
 */
export function computeWarmupCutoff(
  contributionDays: ContributionPoint[],
): string | null {
  if (contributionDays.length === 0) return null;
  const firstDay = contributionDays.reduce((min, pt) =>
    pt.day < min.day ? pt : min,
  ).day;
  const cutoff = parseLocalDate(firstDay);
  cutoff.setDate(cutoff.getDate() + WARMUP_WINDOW_DAYS);
  const y = cutoff.getFullYear();
  const m = String(cutoff.getMonth() + 1).padStart(2, "0");
  const d = String(cutoff.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
