import type { MovementGroup } from "./groupByMovement";

export type RecordsSortOrder =
  | "recently_moved"
  | "a_z"
  | "heaviest"
  | "stalest";

export const SORT_OPTIONS: { value: RecordsSortOrder; label: string }[] = [
  { value: "recently_moved", label: "Recently moved" },
  { value: "a_z", label: "A–Z" },
  { value: "heaviest", label: "Heaviest e1RM" },
  { value: "stalest", label: "Stalest" },
];

/**
 * Records Home sort orders (design-spec 04 Screen 1). "Recently moved" is the
 * default: a movement with a real (positive) delta on its headline variant —
 * i.e. an improving lift — is surfaced ahead of a same-date PR with no
 * improvement, then both fall back to most-recent-`achieved_at` first.
 */
export function sortMovementGroups(
  groups: MovementGroup[],
  order: RecordsSortOrder,
): MovementGroup[] {
  const copy = [...groups];
  switch (order) {
    case "a_z":
      return copy.sort((a, b) => a.movementName.localeCompare(b.movementName));
    case "heaviest":
      return copy.sort(
        (a, b) => b.headline.best_1rm_kg - a.headline.best_1rm_kg,
      );
    case "stalest":
      // Oldest achieved_at first — the longest-since-last-PR movement leads.
      return copy.sort((a, b) =>
        a.headline.achieved_at.localeCompare(b.headline.achieved_at),
      );
    case "recently_moved":
    default:
      return copy.sort((a, b) => {
        const aImproving = (a.headline.delta_kg ?? 0) > 0 ? 1 : 0;
        const bImproving = (b.headline.delta_kg ?? 0) > 0 ? 1 : 0;
        if (aImproving !== bImproving) return bImproving - aImproving;
        return b.headline.achieved_at.localeCompare(a.headline.achieved_at);
      });
  }
}
