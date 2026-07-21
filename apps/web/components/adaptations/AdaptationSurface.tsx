"use client";

import { useEffect, useMemo, useState } from "react";
import { createApiClient } from "@/lib/api/client";
import type { AdaptationOut } from "@/lib/api/plans";
import { Skeleton } from "@/components/ui/skeleton";
import { AdaptationCheckControl } from "./AdaptationCheckControl";
import { AdaptationInlinePanel } from "./AdaptationInlinePanel";

/**
 * Composes the two adaptation-surface pieces (§8.2's check control/banner,
 * §8.8's inline Apply/Dismiss panel) into the single shared band under the
 * plan header (§4/§5 layout item 2). One shared fetch, then a single choice:
 * a `proposed` adaptation gets the richer inline panel (Apply/Dismiss/Review
 * in full); nothing pending gets the plain "Check for changes" control.
 * Rendering both at once would duplicate the same adaptation's surface.
 */
export function AdaptationSurface({
  token,
  planId,
  reviewHref,
}: {
  token: string;
  planId: string;
  reviewHref: string;
}) {
  const client = useMemo(() => createApiClient(token), [token]);
  const [adaptations, setAdaptations] = useState<AdaptationOut[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    client.adaptations
      .list(planId, { signal: controller.signal })
      .then((data) => {
        if (!cancelled) setAdaptations(data);
      })
      .catch(() => {
        if (!cancelled) setAdaptations([]);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [client, planId]);

  // Loading: neither child fetches independently — both accept a real array
  // via initialAdaptations as "don't fetch, here's the data," so hold off
  // rendering either until the one shared fetch resolves.
  if (adaptations === null) {
    return <Skeleton className="h-16 w-full rounded-lg" />;
  }

  const hasPending = adaptations.some((a) => a.status === "proposed");

  return hasPending ? (
    <AdaptationInlinePanel
      token={token}
      planId={planId}
      reviewHref={reviewHref}
      initialAdaptations={adaptations}
    />
  ) : (
    <AdaptationCheckControl
      token={token}
      planId={planId}
      reviewHref={reviewHref}
      initialAdaptations={adaptations}
    />
  );
}
