import type { ApiClient } from "@/lib/api/client";
import type { PlanDetail, PlanSummary } from "@/lib/api/plans";

export type PlannedRestKind = "rest" | "deload";

/**
 * Classifies a scheduled plan day as a chosen rest/deload day so the
 * contribution graph (07 §G) can render it as "protected," not "missed"
 * (Apple's non-punitive "Pause Your Rings" precedent). A day is:
 *  - `"rest"` if its session's `session_type` is `rest` or `active_recovery`.
 *  - `"deload"` if the session's mesocycle has `phase === "deload"` — the
 *    API doesn't expose a per-session `is_deload` boolean directly, but a
 *    deload week is modeled as a named mesocycle with `phase: "deload"`
 *    spanning that week, so joining `PlannedSessionOut.mesocycle_id` against
 *    `PlanDetail.mesocycles[].phase` is the equivalent join, not a
 *    workaround.
 *  - `undefined` otherwise (an ordinary training day — the graph falls back
 *    to the logged/not-logged binary treatment for it).
 *
 * Keyed by `scheduled_date` ("YYYY-MM-DD"), across every plan that overlaps
 * the given date range (a user may have several plans over a year).
 */
export function buildPlannedRestMap(
  plans: PlanDetail[],
): Map<string, PlannedRestKind> {
  const map = new Map<string, PlannedRestKind>();

  for (const plan of plans) {
    const deloadMesocycleIds = new Set(
      plan.mesocycles.filter((m) => m.phase === "deload").map((m) => m.id),
    );

    for (const session of plan.sessions) {
      const isDeload = deloadMesocycleIds.has(session.mesocycle_id);
      const isRest =
        session.session_type === "rest" ||
        session.session_type === "active_recovery";

      if (isDeload) {
        map.set(session.scheduled_date, "deload");
      } else if (isRest && !map.has(session.scheduled_date)) {
        map.set(session.scheduled_date, "rest");
      }
    }
  }

  return map;
}

/**
 * Fetches every plan overlapping `[fromDate, toDate]` (inclusive, both
 * "YYYY-MM-DD") and returns the merged planned-rest classification map.
 * Bounded to the plans a `plans.list()` call actually returns (the API caps
 * this at 50, `ORDER BY created_at DESC`) — realistically a user has a
 * handful of plans spanning a year, so this stays cheap. Non-critical: a
 * failure here degrades the graph to plain logged/not-logged, it never
 * blocks the page.
 */
export async function fetchPlannedRestMap(
  client: ApiClient,
  fromDate: string,
  toDate: string,
  signal?: AbortSignal,
): Promise<Map<string, PlannedRestKind>> {
  const summaries: PlanSummary[] = await client.plans.list({ signal });
  const overlapping = summaries.filter(
    (p) => p.start_date <= toDate && p.end_date >= fromDate,
  );

  const details = await Promise.all(
    overlapping.map((p) => client.plans.get(p.id, { signal })),
  );

  return buildPlannedRestMap(details);
}
