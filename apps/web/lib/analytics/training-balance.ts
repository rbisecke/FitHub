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
