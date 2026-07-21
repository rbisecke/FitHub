import type { PersonalRecord } from "@/lib/api";

/**
 * Variant-scoped grouping (design-spec 04 Screen 1, "PR card list —
 * variant-scoped as of the 2026-07-18 backend fix"). `analytics.personal-records`
 * returns one row per (movement_id, implement, side) variant (BG-23) — this
 * groups those rows back up by `movement_id` for the card list, so a movement
 * with more than one tracked variant renders as ONE card (best variant as the
 * headline, others reachable via the expand affix) instead of one card per
 * variant.
 */
export interface MovementGroup {
  movementId: string;
  movementName: string;
  /** All variants for this movement, best (highest best_1rm_kg) first. */
  variants: PersonalRecord[];
  /** variants[0] — the card's headline. */
  headline: PersonalRecord;
}

export function groupRecordsByMovement(
  records: PersonalRecord[],
): MovementGroup[] {
  const byMovement = new Map<string, PersonalRecord[]>();
  for (const record of records) {
    const existing = byMovement.get(record.movement_id);
    if (existing) {
      existing.push(record);
    } else {
      byMovement.set(record.movement_id, [record]);
    }
  }

  const groups: MovementGroup[] = [];
  for (const [movementId, variants] of byMovement) {
    const sorted = [...variants].sort((a, b) => b.best_1rm_kg - a.best_1rm_kg);
    const headline = sorted[0];
    if (!headline) continue;
    groups.push({
      movementId,
      movementName: headline.movement_name,
      variants: sorted,
      headline,
    });
  }
  return groups;
}

/** Stable key for a single (movement, implement, side) variant — used as a
 * React list key so variant rows never fall back to an array index. */
export function variantKey(record: PersonalRecord): string {
  return `${record.movement_id}::${record.implement ?? ""}::${
    record.side ?? ""
  }`;
}
