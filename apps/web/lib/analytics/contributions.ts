import { formatLocalDate } from "@/lib/units";
import type { ContributionsResponse } from "@/lib/api";

/**
 * Screen 9 — Contribution / Consistency Graph, ANALYTICS-SIDE DATA BINDING
 * ONLY (04-records-and-analytics.md §Screen 9).
 *
 * The grid's VISUAL DESIGN (the GitHub-style cell grid itself, binary vs.
 * volume-graded color, the streak-freeze third state) is owned by Domain 07
 * (Gamification) per the doc's cross-domain note — no placeholder or stub
 * for that grid exists anywhere in this codebase yet (searched at the time
 * this file was written). This module is the documented integration point:
 * whoever builds the Domain 07 grid component should import
 * `gapFillContributions` (or the raw `GET /analytics/contributions` response
 * via `client.analytics.contributions`) from here rather than re-deriving
 * the gap-fill logic.
 *
 * THE TRAP THIS MODULE EXISTS TO AVOID (04 §Screen 9, functional §8.3,
 * cross-screen edge case #6): `ContributionsResponse.days[]` is SPARSE — a
 * day with zero workouts produces NO row at all, exactly like Screen 7's
 * volume-trend weeks. `gapFillContributions` is what turns that sparse
 * response into one entry per calendar day; do NOT hand the raw
 * `days[]` array to a grid component expecting a dense series.
 */

export interface ContributionDay {
  /** "YYYY-MM-DD", local calendar day. */
  day: string;
  /** Workouts logged that day (0 for a gap-filled day). */
  count: number;
  /** Perceived load for that day (0 for a gap-filled day). */
  load_au: number;
  /** True only for a day that had a real row in the API response. */
  logged: boolean;
}

/**
 * Every calendar day in the trailing `days`-day window (oldest first,
 * ending today), with each API row's `count`/`load_au` merged in and every
 * other day filled as `{ count: 0, load_au: 0, logged: false }`. `now` is
 * injectable for tests.
 */
export function gapFillContributions(
  response: ContributionsResponse,
  days: number,
  now = new Date(),
): ContributionDay[] {
  const byDay = new Map(response.days.map((d) => [d.day, d]));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const out: ContributionDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - i,
    );
    const key = formatLocalDate(d);
    const row = byDay.get(key);
    out.push(
      row
        ? { day: key, count: row.count, load_au: row.load_au, logged: true }
        : { day: key, count: 0, load_au: 0, logged: false },
    );
  }
  return out;
}
