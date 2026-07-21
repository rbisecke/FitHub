"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { createApiClient } from "@/lib/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  SummaryTab,
  type SummaryVariant,
} from "@/components/records/detail/SummaryTab";
import { HistoryTab } from "@/components/records/detail/HistoryTab";
import { NonLoadedFallback } from "@/components/records/detail/NonLoadedFallback";
import type {
  E1RMPoint,
  LastResult,
  MovementHistoryEntry,
  PersonalRecord,
} from "@/lib/api";
import type { DisplayUnits } from "@/lib/units";
import type { WeightUnit } from "@/lib/records/prFormat";

/**
 * Movement Detail (design-spec 04 Screen 2, `/progress/records/[movementId]`)
 * — the domain's flagship, tabbed Summary/History screen. Light theme
 * (forced by the route's `ForcedTheme` wrapper), a deliberate dark->light
 * transition from Records Home smoothed with a brief opacity cross-fade
 * that respects `prefers-reduced-motion` (the CSS `motion-reduce:` variant
 * below skips the transition entirely rather than just shortening it).
 */
export function MovementDetailScreen({
  token,
  movementId,
  movementName,
  units,
  implement,
  side,
  initialVariant,
  initialRecord,
  initialLoadFailed,
}: {
  token: string;
  movementId: string;
  movementName: string;
  units: DisplayUnits;
  implement: string | null;
  side: string | null;
  initialVariant: SummaryVariant;
  initialRecord: PersonalRecord | null;
  initialLoadFailed: boolean;
}) {
  const client = useMemo(() => createApiClient(token), [token]);
  const weightUnit = units.weight as WeightUnit;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const [activeTab, setActiveTab] = useState<"summary" | "history">("summary");

  const isNonLoaded = !initialLoadFailed && initialRecord === null;

  // Trend + history — only relevant once we know this movement has a PR at
  // all. Two independent fetch effects, each with its own AbortController
  // and cancelled flag (apps/web/CLAUDE.md — concurrent fetches can't share one).
  const [trendPoints, setTrendPoints] = useState<E1RMPoint[]>([]);
  const [trendState, setTrendState] = useState<"loading" | "error" | "idle">(
    isNonLoaded || initialLoadFailed ? "idle" : "loading",
  );
  const [historyEntries, setHistoryEntries] = useState<MovementHistoryEntry[]>(
    [],
  );
  const [historyState, setHistoryState] = useState<
    "loading" | "error" | "idle"
  >(isNonLoaded || initialLoadFailed ? "idle" : "loading");

  useEffect(() => {
    if (isNonLoaded || initialLoadFailed) return;
    const controller = new AbortController();
    let cancelled = false;
    client.analytics
      .movementTrend(
        movementId,
        {
          implement: implement ?? undefined,
          side: side ?? undefined,
        },
        { signal: controller.signal },
      )
      .then((result) => {
        if (cancelled) return;
        setTrendPoints(result);
        setTrendState("idle");
      })
      .catch((err) => {
        if (cancelled || controller.signal.aborted) return;
        setTrendState("error");
        void err;
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [client, movementId, implement, side, isNonLoaded, initialLoadFailed]);

  useEffect(() => {
    if (isNonLoaded || initialLoadFailed) return;
    const controller = new AbortController();
    let cancelled = false;
    client.analytics
      .movementHistory(
        movementId,
        {
          implement: implement ?? undefined,
          side: side ?? undefined,
        },
        { signal: controller.signal },
      )
      .then((result) => {
        if (cancelled) return;
        setHistoryEntries(result);
        setHistoryState("idle");
      })
      .catch((err) => {
        if (cancelled || controller.signal.aborted) return;
        setHistoryState("error");
        void err;
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [client, movementId, implement, side, isNonLoaded, initialLoadFailed]);

  // Non-loaded fallback (2F) — a single last-result fetch, no trend/history.
  const [lastResult, setLastResult] = useState<LastResult | null>(null);
  const [lastResultState, setLastResultState] = useState<
    "loading" | "error" | "idle"
  >(isNonLoaded ? "loading" : "idle");

  useEffect(() => {
    if (!isNonLoaded) return;
    const controller = new AbortController();
    let cancelled = false;
    client.movements
      .lastResult(
        movementId,
        {
          implement: implement ?? undefined,
          side: side ?? undefined,
        },
        { signal: controller.signal },
      )
      .then((result) => {
        if (cancelled) return;
        setLastResult(result);
        setLastResultState("idle");
      })
      .catch((err) => {
        if (cancelled || controller.signal.aborted) return;
        setLastResultState("error");
        void err;
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [client, movementId, implement, side, isNonLoaded]);

  return (
    <div
      className="min-h-svh bg-[var(--background)] text-[var(--foreground)] px-4 py-6 md:px-8 md:py-8 opacity-0 transition-opacity duration-300 ease-out motion-reduce:transition-none motion-reduce:opacity-100"
      style={mounted ? { opacity: 1 } : undefined}
    >
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="font-sans text-[20px] font-bold text-[var(--foreground)]">
          {movementName}
        </h1>

        {initialLoadFailed ? (
          <div className="flex flex-col items-start gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--card)] px-4 py-4">
            <p className="font-sans text-[13px] text-[var(--destructive)]">
              Couldn&apos;t load this movement&apos;s records. Please try again.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="flex h-11 items-center gap-1.5 rounded-[8px] border border-[var(--border)] px-3 font-sans text-[13px] font-medium text-[var(--foreground)]"
            >
              <RefreshCw size={14} aria-hidden="true" />
              Retry
            </button>
          </div>
        ) : isNonLoaded ? (
          <NonLoadedFallback
            movementName={movementName}
            lastResult={lastResult}
            units={units}
            state={lastResultState}
          />
        ) : (
          <>
            {initialRecord?.is_stale && (
              <div
                className="rounded-[8px] border px-3 py-2"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--card)",
                }}
              >
                <p
                  className="font-sans text-[12px]"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Last logged {daysAgo(initialRecord.achieved_at)} days ago
                </p>
              </div>
            )}

            <Tabs
              value={activeTab}
              onValueChange={(value) =>
                setActiveTab(value as "summary" | "history")
              }
            >
              <TabsList>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>
              <TabsContent value="summary">
                {trendState === "loading" ? (
                  <Skeleton className="h-40 w-full rounded-[10px]" />
                ) : trendState === "error" ? (
                  <p className="font-sans text-[13px] text-[var(--destructive)]">
                    Couldn&apos;t load the strength trend. Please try again.
                  </p>
                ) : initialRecord ? (
                  <SummaryTab
                    record={initialRecord}
                    points={trendPoints}
                    unit={weightUnit}
                    initialVariant={initialVariant}
                    staleProjection={initialRecord.is_stale}
                  />
                ) : null}
              </TabsContent>
              <TabsContent value="history">
                {historyState === "loading" ? (
                  <Skeleton className="h-40 w-full rounded-[10px]" />
                ) : historyState === "error" ? (
                  <p className="font-sans text-[13px] text-[var(--destructive)]">
                    Couldn&apos;t load logged sets. Please try again.
                  </p>
                ) : (
                  <HistoryTab entries={historyEntries} unit={weightUnit} />
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}

function daysAgo(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const then = new Date(y, m - 1, d);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((now.getTime() - then.getTime()) / 86_400_000));
}
