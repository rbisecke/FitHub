"use client";

import { useEffect, useMemo, useState } from "react";
import { createApiClient } from "@/lib/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import { TrainingBalanceBars } from "@/components/analytics/balance/TrainingBalanceBars";
import type { TrainingBalanceResponse } from "@/lib/api";

interface Props {
  accessToken: string;
}

const DEFAULT_DAYS = 28;
const WINDOW_OPTIONS = [7, 14, 28, 90, 180, 365];

/**
 * Screen 8 — Training Balance (04 §Screen 8). Light theme. Window control
 * 7–365 days, default 28.
 */
export function TrainingBalanceScreen({ accessToken }: Props) {
  const [days, setDays] = useState(DEFAULT_DAYS);
  const [data, setData] = useState<TrainingBalanceResponse | null | undefined>(
    undefined,
  );
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const client = useMemo(() => createApiClient(accessToken), [accessToken]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    client.analytics
      .trainingBalance(days, { signal: controller.signal })
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
  }, [client, days, retryKey]);

  const handleRetry = () => {
    setData(undefined);
    setError(false);
    setRetryKey((k) => k + 1);
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-5 py-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--text)]">
            Training balance
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Am I balanced, or all push and no pull
          </p>
        </div>

        <label
          htmlFor="balance-window-select"
          className="flex items-center gap-2 text-xs text-[var(--muted)]"
        >
          Window
          <select
            id="balance-window-select"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded border px-2 py-1 text-xs"
            style={{ borderColor: "var(--border)" }}
          >
            {WINDOW_OPTIONS.map((d) => (
              <option key={d} value={d}>
                Last {d} days
              </option>
            ))}
          </select>
        </label>
      </div>

      {data === undefined && !error && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <p className="text-sm text-[var(--muted)]">
            Couldn&apos;t load training balance.
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="rounded border px-3 py-1 text-sm"
            style={{ borderColor: "var(--border)" }}
          >
            Retry
          </button>
        </div>
      )}

      {data && <TrainingBalanceBars data={data} />}
    </div>
  );
}
