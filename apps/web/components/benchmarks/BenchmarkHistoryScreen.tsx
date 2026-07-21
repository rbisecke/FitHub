"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { createApiClient } from "@/lib/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import { BenchmarkCard } from "@/components/benchmarks/BenchmarkCard";
import type { BenchmarkResponse } from "@/lib/api";

/**
 * Benchmark History screen (design-spec 04 Screen 3, `/progress/benchmarks`).
 * Dark theme — a glance-and-celebrate surface, not a seated analysis session
 * (see the design doc's explicit reasoning for why this stays dark while the
 * structurally-similar Movement Detail screen goes light: the split is by
 * user intent — "how's my Fran time trending" is a single-glance check, not
 * a multi-tab analytical review).
 */
export function BenchmarkHistoryScreen({
  token,
  initialData,
  initialLoadFailed,
}: {
  token: string;
  initialData: BenchmarkResponse | null;
  initialLoadFailed: boolean;
}) {
  const client = useMemo(() => createApiClient(token), [token]);
  const [data, setData] = useState<BenchmarkResponse | null>(initialData);
  const [loading, setLoading] = useState(
    initialData === null && !initialLoadFailed,
  );
  const [error, setError] = useState(initialLoadFailed);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (initialData !== null && retryKey === 0) return;
    const controller = new AbortController();
    let cancelled = false;
    client.analytics
      .benchmarks({ signal: controller.signal })
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(false);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled || controller.signal.aborted) return;
        setError(true);
        setLoading(false);
        void err;
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryKey, client]);

  function handleRetry() {
    setError(false);
    setLoading(true);
    setRetryKey((k) => k + 1);
  }

  const benchmarks = data?.benchmarks ?? [];

  return (
    <div className="min-h-svh bg-[var(--bg)] text-[var(--text)] px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-2xl space-y-5">
        <div>
          <h1 className="font-sans text-[20px] font-bold text-[var(--text)]">
            Benchmarks
          </h1>
          <p className="font-sans text-[13px] text-[var(--muted)] mt-1">
            The girls, the heroes, the Open — how your named-WOD times are
            trending
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-[92px] w-full rounded-[10px]" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-start gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
            <p className="font-sans text-[13px] text-[var(--red)]">
              Couldn&apos;t load your benchmarks. Please try again.
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="flex h-11 items-center gap-1.5 rounded-[8px] border border-[var(--border)] px-3 font-sans text-[13px] font-medium text-[var(--text)]"
            >
              <RefreshCw size={14} aria-hidden="true" />
              Retry
            </button>
          </div>
        ) : benchmarks.length === 0 ? (
          <div className="flex flex-col items-start gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 py-8">
            <p className="font-sans text-[14px] font-medium text-[var(--text)]">
              No benchmark WODs logged yet.
            </p>
            <p className="font-sans text-[13px] text-[var(--muted)]">
              Named workouts like Fran, Murph, or the Open show up here once you
              log one — this list tracks a separate best-time PR from your lift
              e1RMs.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {benchmarks.map((entry) => (
              <BenchmarkCard key={entry.name} entry={entry} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
