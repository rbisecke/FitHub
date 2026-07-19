"use client";

import { useEffect, useState } from "react";
import type { E1RMPoint } from "@/lib/api";
import type { ApiClient } from "@/lib/api/client";
import { PRSparkline } from "@/components/records/PRSparkline";

/**
 * Per-result trend preview (01 §6.5) — a single-metric, single-series e1RM line
 * for a movement that produced a PR-relevant result on this workout. This is a
 * preview; the fuller trend/records experience is Domain 04 (link out, don't
 * duplicate). Fetched lazily with AbortController; reuses the records-domain
 * PRSparkline rather than re-implementing a chart.
 */
export function TrendPreview({
  movementId,
  units,
  client,
}: {
  movementId: string;
  units: { weight: "kg" | "lb" };
  client: ApiClient;
}) {
  const [points, setPoints] = useState<E1RMPoint[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    client.analytics
      .movementTrend(movementId, undefined, { signal: controller.signal })
      .then((rows) => {
        if (!cancelled) setPoints(rows);
      })
      .catch((err) => {
        if (!cancelled && !controller.signal.aborted) setFailed(true);
        void err;
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [client, movementId]);

  if (failed || points === null) return null;
  if (points.length < 2) return null;

  return (
    <div className="mt-1">
      <PRSparkline points={points} weightUnit={units.weight} />
    </div>
  );
}
