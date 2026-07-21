"use client";

import { useEffect, useState } from "react";
import { createApiClient } from "@/lib/api/client";
import {
  gapFillContributions,
  type ContributionDay,
} from "@/lib/analytics/contributions";

/**
 * Convenience hook for Screen 9's data binding (see contributions.ts for the
 * full integration-point doc). Fetches `GET /analytics/contributions` and
 * returns an already gap-filled, dense day array — the shape a grid
 * component can render directly without re-deriving the gap-fill trap
 * itself. Follows the project's mandatory AbortController + cancelled-flag
 * fetch pattern (apps/web/CLAUDE.md).
 */
export function useContributions(
  accessToken: string,
  days = 365,
): {
  data: ContributionDay[] | null | undefined;
  totalWorkouts: number | null;
  error: boolean;
} {
  const [data, setData] = useState<ContributionDay[] | null | undefined>(
    undefined,
  );
  const [totalWorkouts, setTotalWorkouts] = useState<number | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const client = createApiClient(accessToken);

    client.analytics
      .contributions(days, { signal: controller.signal })
      .then((res) => {
        if (cancelled) return;
        setData(gapFillContributions(res, days));
        setTotalWorkouts(res.total_workouts);
      })
      .catch(() => {
        if (cancelled || controller.signal.aborted) return;
        setError(true);
        setData(null);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [accessToken, days]);

  return { data, totalWorkouts, error };
}
