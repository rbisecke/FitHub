"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createApiClient } from "@/lib/api/client";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { VolumeTrendChart } from "@/components/analytics/volume/VolumeTrendChart";
import {
  aggregateWeeklyBars,
  aggregateStackedBars,
  buildWeekWindow,
  distinctViews,
  SESSION_TYPE_LABEL,
  type VolumeMetric,
  type VolumeView,
} from "@/lib/analytics/volume-trend";
import type { WeeklyVolume } from "@/lib/api";

interface Props {
  accessToken: string;
}

// Window control: 1-52 weeks accepted by the API, default 12 (04 §Screen 7,
// product call 2026-07-18). The select below offers a curated preset list
// within that range rather than a free-form 1-52 spinner.
const DEFAULT_WEEKS = 12;

/** Refresh interval for the "now" anchor used to build the week window (apps/web/CLAUDE.md: time-sensitive "today" state must update at runtime, not freeze at mount). */
const NOW_REFRESH_MS = 60_000;

interface ChartBodyProps {
  rows: WeeklyVolume[] | null | undefined;
  error: boolean;
  onRetry: () => void;
  children: ReactNode;
}

/** Shared loading/error/empty/content states for both the per-view Tabs panels and the stacked view — one place, not duplicated per branch. */
function ChartBody({ rows, error, onRetry, children }: ChartBodyProps) {
  if (rows === undefined) {
    return <Skeleton className="h-[220px] w-full" />;
  }
  if (error || rows === null) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <p className="text-sm text-[var(--muted)]">
          Couldn&apos;t load volume trend.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded border px-3 py-1 text-sm"
          style={{ borderColor: "var(--border)" }}
        >
          Retry
        </button>
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div
        className="rounded-lg border p-8 text-center text-sm text-[var(--muted)]"
        style={{ borderColor: "var(--border)" }}
      >
        No workouts logged yet in this window.
      </div>
    );
  }
  return <>{children}</>;
}

/**
 * Screen 7 — Volume Trend (04 §Screen 7). Light theme, number-first header,
 * single-series-at-rest bar chart. `session_type` is a view switcher (Tabs),
 * never an overlay; an opt-in "stacked by type" view is available but never
 * the resting state (Bible 1.5). Window control 1–52 weeks, default 12
 * (product call, 2026-07-18).
 */
export function VolumeTrendScreen({ accessToken }: Props) {
  const [weeksCount, setWeeksCount] = useState(DEFAULT_WEEKS);
  const [rows, setRows] = useState<WeeklyVolume[] | null | undefined>(
    undefined,
  );
  const [error, setError] = useState(false);
  const [view, setView] = useState<VolumeView>("all");
  const [metric, setMetric] = useState<VolumeMetric>("total_load");
  const [stacked, setStacked] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [now, setNow] = useState(() => new Date());

  const client = useMemo(() => createApiClient(accessToken), [accessToken]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), NOW_REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    client.analytics
      .volumeTrend(weeksCount, { signal: controller.signal })
      .then((res) => {
        if (!cancelled) setRows(res.weeks);
      })
      .catch(() => {
        if (cancelled || controller.signal.aborted) return;
        setError(true);
        setRows(null);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [client, weeksCount, retryKey]);

  const window = useMemo(
    () => buildWeekWindow(weeksCount, now),
    [weeksCount, now],
  );

  const views = useMemo<VolumeView[]>(
    () => ["all", ...distinctViews(rows ?? [])],
    [rows],
  );

  const bars = useMemo(
    () => aggregateWeeklyBars(rows ?? [], window, view, metric),
    [rows, window, view, metric],
  );
  const stackedBars = useMemo(
    () => aggregateStackedBars(rows ?? [], window, metric),
    [rows, window, metric],
  );

  const latest = bars[bars.length - 1]?.value ?? null;
  const prev = bars[bars.length - 2]?.value ?? null;
  const delta = latest != null && prev != null ? latest - prev : null;

  const handleRetry = () => {
    setRows(undefined);
    setError(false);
    setRetryKey((k) => k + 1);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-5 py-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--text)]">Volume trend</h1>
          <p className="text-sm text-[var(--muted)]">
            This week vs last,{" "}
            {metric === "total_load" ? "total load" : "workout count"}
          </p>
        </div>
        {rows !== undefined && rows !== null && (
          <div className="text-right">
            <p className="font-mono text-2xl font-bold tabular-nums text-[var(--text)]">
              {latest != null ? Math.round(latest) : "—"}
            </p>
            {delta != null && (
              <p
                className="font-mono text-xs tabular-nums"
                style={{
                  color: delta >= 0 ? "var(--green)" : "var(--muted)",
                }}
              >
                {delta >= 0 ? "+" : ""}
                {Math.round(delta)} vs last week
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor="volume-window-select"
          className="flex items-center gap-2 text-xs text-[var(--muted)]"
        >
          Window
          <select
            id="volume-window-select"
            value={weeksCount}
            onChange={(e) => setWeeksCount(Number(e.target.value))}
            className="rounded border px-2 py-1 text-xs"
            style={{ borderColor: "var(--border)" }}
          >
            {[4, 8, 12, 26, 52].map((w) => (
              <option key={w} value={w}>
                Last {w} weeks
              </option>
            ))}
          </select>
        </label>

        {/* `relative` + `after:` gives each pill a ≥44px touch target
            (apps/web/CLAUDE.md) via an invisible expanded hit area, without
            growing the compact visual pill itself. */}
        <button
          type="button"
          aria-pressed={metric === "workout_count"}
          aria-label="Toggle between total load and workout count"
          onClick={() =>
            setMetric((m) =>
              m === "total_load" ? "workout_count" : "total_load",
            )
          }
          className="relative rounded border px-2 py-1 text-xs text-[var(--text)] after:absolute after:-inset-y-[9px] after:inset-x-0 after:content-['']"
          style={{ borderColor: "var(--border)" }}
        >
          {metric === "total_load" ? "Total load" : "Workout count"}
        </button>

        <div className="flex items-center gap-2 text-xs text-[var(--text)]">
          <Label
            htmlFor="volume-stacked-toggle"
            className="text-xs font-normal"
          >
            Stacked by type
          </Label>
          {/* `data-unchecked:bg-[var(--muted-foreground)]` — the shared
              Switch's default unchecked track (`bg-input`, #d0d7de in light
              mode) sits at ~1.5:1 contrast against this page's white/near-
              white background, well under WCAG 1.4.11's 3:1 non-text
              minimum. This page is the Switch's first light-theme usage;
              overridden locally rather than in the shared component since
              its other (dark-theme) call sites aren't affected. */}
          <Switch
            id="volume-stacked-toggle"
            size="sm"
            checked={stacked}
            onCheckedChange={setStacked}
            className="data-unchecked:bg-[var(--muted-foreground)]"
            aria-label="Toggle stacked-by-type view"
          />
        </div>
      </div>

      {!stacked && (
        <Tabs value={view} onValueChange={(v) => v && setView(v as VolumeView)}>
          <TabsList aria-label="Session type">
            {views.map((v) => (
              <TabsTrigger
                key={v}
                value={v}
                // `before:` (not `after:`) — TabsTrigger's own `after:`
                // pseudo-element already renders the active-tab underline;
                // reusing it here for hit-area expansion would clobber it.
                className="before:absolute before:-inset-y-[9px] before:inset-x-0 before:content-['']"
              >
                {SESSION_TYPE_LABEL[v]}
              </TabsTrigger>
            ))}
          </TabsList>
          {views.map((v) => (
            <TabsContent key={v} value={v}>
              <ChartBody rows={rows} error={error} onRetry={handleRetry}>
                {v === view && (
                  <VolumeTrendChart
                    stacked={false}
                    bars={bars}
                    metric={metric}
                    view={view}
                  />
                )}
              </ChartBody>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {stacked && (
        <ChartBody rows={rows} error={error} onRetry={handleRetry}>
          <VolumeTrendChart
            stacked
            stackedBars={stackedBars}
            metric={metric}
            views={views.filter((v) => v !== "all")}
          />
        </ChartBody>
      )}
    </div>
  );
}
