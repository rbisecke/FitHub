import type { TrainingBalanceBreakdown } from "@/lib/api";

/**
 * Pure helpers for Screen 8 (Training Balance), 04-records-and-analytics.md
 * §Screen 8. No React — testable in isolation.
 */

/** Defensive re-sort by volume_pct descending — the backend already orders by load_au desc, which is monotonic with volume_pct within one tagged set, but this makes the contract explicit rather than assumed. */
export function sortByVolumePctDesc(
  breakdown: TrainingBalanceBreakdown[],
): TrainingBalanceBreakdown[] {
  return [...breakdown].sort((a, b) => b.volume_pct - a.volume_pct);
}

/**
 * `volume_pct = 0` (not null) for every row when total tagged load is 0 (04
 * §Screen 8 States) must render an explicit empty state, not a row of 0%
 * bars. Distinct from the `breakdown.length === 0` case (no tagged
 * movements at all) — this is "tagged movements exist, but summed to zero
 * load" (e.g. bodyweight-only sets under a tagged movement).
 */
export function isZeroLoadBreakdown(
  breakdown: TrainingBalanceBreakdown[],
): boolean {
  return breakdown.length > 0 && breakdown.every((b) => b.load_au === 0);
}

export function categoryLabel(category: string): string {
  return (
    category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, " ")
  );
}

/**
 * The closed, DB-CHECK-constrained set of `primary_muscle_group` values
 * (`ck_movements_primary_muscle_group`, migration 0037) — a fixed taxonomy
 * that can't silently grow without its own migration, so it's safe to
 * mirror here rather than plumb a new "list all categories" endpoint just
 * to render context rows for untagged-this-period categories.
 */
export const ALL_TRAINING_BALANCE_CATEGORIES = [
  "push",
  "pull",
  "legs",
  "core",
  "conditioning",
] as const;

/**
 * Fills in any canonical category missing from `breakdown` (i.e. tracked by
 * the app but with zero tagged volume in the current window) as an explicit
 * 0%/0 load_au row, so the screen shows the full taxonomy for context
 * instead of only whichever categories happened to have logged volume.
 * Only meaningful once the caller has already ruled out the true empty
 * states (`breakdown.length === 0`, `isZeroLoadBreakdown`) — this always
 * returns a full-taxonomy list, so it must not be used to decide those.
 */
export function fillMissingCategories(
  breakdown: TrainingBalanceBreakdown[],
): TrainingBalanceBreakdown[] {
  const present = new Set(breakdown.map((b) => b.category));
  const filled = ALL_TRAINING_BALANCE_CATEGORIES.filter(
    (c) => !present.has(c),
  ).map((category) => ({ category, volume_pct: 0, load_au: 0 }));
  return [...breakdown, ...filled];
}
