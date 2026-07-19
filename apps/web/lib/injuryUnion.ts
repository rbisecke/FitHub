import type { InjuryOut } from "@/lib/api/plans";

/**
 * Client-side multi-injury union model (05 §4). Mirrors the reference
 * implementation `union_contraindications` in `apps/api/app/engine/injury.py`
 * WITHOUT calling a new endpoint — this is a pure aggregation over the
 * `contraindicated` lists already returned by `GET /injuries` for each active
 * injury. There is no "give me every movement in the system" endpoint, and we
 * don't need one: when any active injury requires a referral, the backend's
 * own union rule blocks every movement system-wide, so the UI is spec'd to
 * short-circuit to systemic-pause language instead of trying to compute an
 * exact count client-side (see `InjurySummary.referralDominant` below).
 */

export interface InjurySummary {
  /** Count of injuries with status === "active" (the tinted-red/amber bucket). */
  activeCount: number;
  /** Deduplicated count of movements blocked across all active injuries. */
  blockedMovementCount: number;
  /** True if any active injury requires professional referral. */
  referralDominant: boolean;
}

/**
 * Aggregate the active-injury set into a summary for the multi-injury banner.
 * Only `status === "active"` injuries participate — cleared/permanent/resolved
 * injuries are surfaced elsewhere and don't drive this banner.
 */
export function summarizeActiveInjuries(injuries: InjuryOut[]): InjurySummary {
  const active = injuries.filter((i) => i.status === "active");

  const referralDominant = active.some((i) => i.requires_referral);

  const blocked = new Set<string>();
  for (const injury of active) {
    for (const movement of injury.contraindicated) {
      blocked.add(movement);
    }
  }

  return {
    activeCount: active.length,
    blockedMovementCount: blocked.size,
    referralDominant,
  };
}

/** Should the compact multi-injury banner render at all? (spec: "≥2 active injuries"). */
export function shouldShowInjuryBanner(summary: InjurySummary): boolean {
  return summary.activeCount >= 2;
}
