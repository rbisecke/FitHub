"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createApiClient } from "@/lib/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ReadinessExpanded } from "@/components/analytics/readiness/ReadinessExpanded";
import { readinessVerdict } from "@/lib/analytics/readiness-copy";
import type { ReadinessResponse } from "@/lib/api";

interface Props {
  accessToken: string;
}

/**
 * Screen 5B route body — full-screen push destination for the Screen 5A
 * arc's tap-to-expand affordance (04 §Screen 5). Dark theme, same
 * glance-and-celebrate moment as the resting view, just denser.
 */
export function ReadinessDetailScreen({ accessToken }: Props) {
  const [data, setData] = useState<ReadinessResponse | null | undefined>(
    undefined,
  );
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

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
  }, [accessToken, retryKey]);

  const handleRetry = useCallback(() => {
    setData(undefined);
    setError(false);
    setRetryKey((k) => k + 1);
  }, []);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-5 py-6">
      <Link
        href="/today"
        className="font-mono text-sm text-[var(--muted)] hover:text-[var(--text)]"
      >
        ← Back
      </Link>

      {data === undefined && !error && (
        <div
          className="flex flex-col gap-3"
          data-testid="readiness-detail-skeleton"
        >
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {error && (
        <div
          className="flex flex-col items-center gap-3 rounded-lg border p-6 text-center"
          style={{ borderColor: "var(--border)" }}
          data-testid="readiness-detail-error"
        >
          <p className="text-sm text-[var(--muted)]">
            Couldn&apos;t load your readiness details.
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="rounded-md border px-3 py-1.5 text-sm text-[var(--text)]"
            style={{ borderColor: "var(--border)" }}
          >
            Retry
          </button>
        </div>
      )}

      {data && (
        <>
          <div className="flex flex-col gap-1">
            <p className="font-mono text-[11px] tracking-[0.5px] text-[var(--muted)] uppercase">
              Readiness
            </p>
            <p className="font-mono text-4xl font-bold tabular-nums text-[var(--text)]">
              {Math.round(data.score * 100)}
            </p>
            <p className="text-base text-[var(--text)]">
              {readinessVerdict(data.label)}
            </p>
          </div>
          <ReadinessExpanded data={data} />
        </>
      )}
    </div>
  );
}
