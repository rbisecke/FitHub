"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { createApiClient } from "@/lib/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadModelHeadline } from "@/components/load-model/LoadModelHeadline";
import { AcwrGauge } from "@/components/load-model/AcwrGauge";
import { LoadChart } from "@/components/load-model/LoadChart";
import { DailyLoadFooter } from "@/components/load-model/DailyLoadFooter";
import { WindowControl } from "@/components/load-model/WindowControl";
import { LoadModelColdStart } from "@/components/load-model/LoadModelColdStart";
import { computeWarmupCutoff } from "@/lib/analytics/load-chart-helpers";
import type { LoadModelResponse } from "@/lib/api";

const DEFAULT_WINDOW_DAYS = 90;
/** Max lookback for deriving the warm-up-ramp cutoff (see load-chart-helpers). */
const CONTRIBUTIONS_LOOKBACK_DAYS = 730;

/**
 * Load Model Dashboard (design-spec 04 Screen 4, `/progress/load`). Light
 * theme — a seated multi-series analysis surface (Bible 1.1). Headline
 * numbers, ACWR gauge, and the CTL-by-default chart with independently
 * toggleable ATL/TSB and a daily load footer, all number-first so the chart
 * itself is optional (style-feedback rec #4).
 */
export function LoadModelScreen({
  token,
  initialData,
  initialLoadFailed,
  initialWarmupCutoff = null,
}: {
  token: string;
  initialData: LoadModelResponse | null;
  initialLoadFailed: boolean;
  /**
   * Pre-seeded warm-up cutoff, bypassing the contributions fetch. Used by
   * the `dev/load-model` mock harness, where a fake token can't reach the
   * real API, to preview the "building baseline" hatch region.
   */
  initialWarmupCutoff?: string | null;
}) {
  const client = useMemo(() => createApiClient(token), [token]);

  const [windowDays, setWindowDays] = useState(DEFAULT_WINDOW_DAYS);
  const [data, setData] = useState<LoadModelResponse | null>(initialData);
  const [loading, setLoading] = useState(
    initialData === null && !initialLoadFailed,
  );
  const [error, setError] = useState(initialLoadFailed);
  const [retryKey, setRetryKey] = useState(0);

  const [showAtl, setShowAtl] = useState(false);
  const [showTsb, setShowTsb] = useState(false);
  const [warmupCutoff, setWarmupCutoff] = useState<string | null>(
    initialWarmupCutoff,
  );

  useEffect(() => {
    if (
      windowDays === DEFAULT_WINDOW_DAYS &&
      initialData !== null &&
      retryKey === 0
    ) {
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    client.analytics
      .load(windowDays, { signal: controller.signal })
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
  }, [windowDays, retryKey, client]);

  // Independent fetch for the warm-up-ramp cutoff — contributions never
  // zero-fills, so the earliest returned day is the user's true first-ever
  // logged workout (see computeWarmupCutoff's doc comment for why the load
  // series itself can't answer this).
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    client.analytics
      .contributions(CONTRIBUTIONS_LOOKBACK_DAYS, { signal: controller.signal })
      .then((result) => {
        if (cancelled) return;
        setWarmupCutoff(computeWarmupCutoff(result.days));
      })
      .catch((err) => {
        if (cancelled || controller.signal.aborted) return;
        // Non-critical: the chart just renders without a hatch region.
        void err;
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [client]);

  function handleRetry() {
    setError(false);
    setLoading(true);
    setRetryKey((k) => k + 1);
  }

  function handleWindowChange(days: number) {
    setLoading(true);
    setWindowDays(days);
  }

  // The real API always zero-fills `series` to the full requested window
  // (never an empty array, even for a brand-new user), so an empty-series
  // check would never fire in production — only the snapshot values are a
  // reliable signal. `ctl_now`/`atl_now` can only be exactly 0.0 when every
  // `load_au` in the EWMA window was 0, which is backend-consistent with
  // "no real training load yet."
  const isColdStart =
    !loading &&
    !error &&
    data !== null &&
    data.acwr_zone === "insufficient_data" &&
    data.ctl_now === 0 &&
    data.atl_now === 0;

  return (
    <div className="min-h-svh bg-[var(--background)] text-[var(--foreground)] px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-sans text-[20px] font-bold text-[var(--foreground)]">
              Load
            </h1>
            <p className="font-sans text-[13px] text-[var(--muted-foreground)] mt-1">
              Fitness, fatigue, form, and injury-risk load spikes
            </p>
          </div>
          {!loading && !error && !isColdStart && data && (
            <WindowControl days={windowDays} onChange={handleWindowChange} />
          )}
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-[10px]" />
            <Skeleton className="h-20 w-full rounded-[10px]" />
            <Skeleton className="h-52 w-full rounded-[10px]" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-start gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--card)] px-4 py-4">
            <p className="font-sans text-[13px] text-[var(--destructive)]">
              Couldn&apos;t load your training load data. Please try again.
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="flex h-11 items-center gap-1.5 rounded-[8px] border border-[var(--border)] px-3 font-sans text-[13px] font-medium text-[var(--foreground)]"
            >
              <RefreshCw size={14} aria-hidden="true" />
              Retry
            </button>
          </div>
        ) : isColdStart ? (
          <LoadModelColdStart />
        ) : data ? (
          <>
            <LoadModelHeadline
              ctlNow={data.ctl_now}
              atlNow={data.atl_now}
              tsbNow={data.tsb_now}
              series={data.series}
            />
            <AcwrGauge acwrNow={data.acwr_now} acwrZone={data.acwr_zone} />
            <LoadChart
              series={data.series}
              showAtl={showAtl}
              onToggleAtl={() => setShowAtl((v) => !v)}
              showTsb={showTsb}
              onToggleTsb={() => setShowTsb((v) => !v)}
              warmupCutoff={warmupCutoff}
              windowDays={windowDays}
            />
            <DailyLoadFooter series={data.series} />
          </>
        ) : null}
      </div>
    </div>
  );
}
