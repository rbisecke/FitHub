"use client";

import { useEffect, useState } from "react";
import { createApiClient } from "@/lib/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ReadinessArc } from "@/components/analytics/readiness/ReadinessArc";
import type { ReadinessResponse } from "@/lib/api";

interface Props {
  accessToken: string;
}

/**
 * Today-page slot for Screen 5A (04 §Screen 5) — the readiness surface this
 * domain's Navigation table names as the entry point (Readiness isn't a
 * Progress-tab segment). Fetches once on mount; tapping the arc pushes to
 * `/today/readiness` (Screen 5B + 6).
 */
export function ReadinessSection({ accessToken }: Props) {
  const [data, setData] = useState<ReadinessResponse | null | undefined>(
    undefined,
  );
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const client = createApiClient(accessToken);

    client.analytics
      .readiness({ signal: controller.signal })
      .then((res) => {
        if (!cancelled) setData(res);
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
  }, [accessToken]);

  if (error) return null; // silently omit — the rest of Today remains usable

  if (data === undefined) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <Skeleton className="h-[200px] w-[200px] rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div
      className="flex justify-center py-2"
      data-testid="today-readiness-section"
    >
      <ReadinessArc data={data} href="/today/readiness" />
    </div>
  );
}
