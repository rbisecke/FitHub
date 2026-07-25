"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import type { InjuryOut } from "@/lib/api/plans";
import { createApiClient } from "@/lib/api/client";
import { Skeleton } from "@/components/ui/skeleton";
import { InjuryCard } from "@/components/injuries/InjuryCard";
import { InjuryDetailSheet } from "@/components/injuries/InjuryDetailSheet";
import { MultiInjurySummaryBanner } from "@/components/injuries/MultiInjurySummaryBanner";
import { ReportInjurySheet } from "@/components/injuries/ReportInjurySheet";
import {
  summarizeActiveInjuries,
  shouldShowInjuryBanner,
} from "@/lib/injuryUnion";

const MAX_ITEMS = 50;

/**
 * Injury list screen (05 §2 — plan step 4.13). Server-fetched first paint
 * (see `app/(shell)/injuries/page.tsx`); this client component owns the
 * client-side retry-on-error path, the detail sheet, and in-place updates
 * after a status transition (no full refetch needed — the PATCH response is
 * the new source of truth for that one card, and a resolve drops it from the
 * list per the backend's `status != 'resolved'` list filter).
 */
export function InjuryListScreen({
  token,
  initialInjuries,
  initialLoadFailed,
  wodCheckHref,
}: {
  token: string;
  initialInjuries: InjuryOut[] | null;
  initialLoadFailed: boolean;
  /** Entry point for the free-text WOD safety checker. */
  wodCheckHref?: string;
}) {
  const client = useMemo(() => createApiClient(token), [token]);
  const [injuries, setInjuries] = useState<InjuryOut[]>(initialInjuries ?? []);
  // Starts "loading" only when there's no SSR-provided first paint and the
  // SSR fetch didn't already fail — never set imperatively inside the effect
  // below, so the effect body never calls setState synchronously on mount
  // (react-hooks/set-state-in-effect). Retries set it from the click handler.
  const [loading, setLoading] = useState(
    initialInjuries === null && !initialLoadFailed,
  );
  const [error, setError] = useState(initialLoadFailed);
  const [retryKey, setRetryKey] = useState(0);
  const [openInjuryId, setOpenInjuryId] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (initialInjuries !== null && retryKey === 0) return;
    const controller = new AbortController();
    let cancelled = false;
    client.injuries
      .list({ signal: controller.signal })
      .then((data) => {
        if (cancelled) return;
        setInjuries(data);
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

  const sorted = useMemo(
    () =>
      injuries
        .filter((i) => i.status !== "resolved")
        .slice()
        .sort((a, b) =>
          (b.reported_at ?? "").localeCompare(a.reported_at ?? ""),
        )
        .slice(0, MAX_ITEMS),
    [injuries],
  );

  const summary = useMemo(() => summarizeActiveInjuries(sorted), [sorted]);
  const openInjury = sorted.find((i) => i.id === openInjuryId) ?? null;

  function handleUpdated(updated: InjuryOut) {
    if (updated.status === "resolved") {
      setInjuries((prev) => prev.filter((i) => i.id !== updated.id));
      setOpenInjuryId(null);
      return;
    }
    setInjuries((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }

  function handleReportClosed() {
    setReportOpen(false);
    // A new report may have been created — refetch so it appears immediately
    // instead of waiting for the next navigation.
    setRetryKey((k) => k + 1);
  }

  return (
    <div className="pb-nav-safe-fab mx-auto flex w-full max-w-[720px] flex-col gap-4 px-4 pt-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1
            className="font-sans text-[20px] font-semibold"
            style={{ color: "var(--text)" }}
          >
            Injuries
          </h1>
          <p
            className="mt-0.5 font-sans text-[13px]"
            style={{ color: "var(--muted)" }}
          >
            Reported injuries and their status. Active and permanent injuries
            filter your workouts automatically.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {wodCheckHref && (
            <Link
              href={wodCheckHref}
              className="flex h-11 items-center rounded-[8px] px-3 font-sans text-[13px] font-medium"
              style={{
                border: "1px solid var(--border)",
                color: "var(--accent)",
              }}
            >
              Check a WOD →
            </Link>
          )}
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="flex h-11 items-center rounded-[8px] px-3 font-sans text-[13px] font-semibold"
            style={{ background: "var(--accent)", color: "var(--bg)" }}
          >
            Report an injury
          </button>
        </div>
      </div>

      {!loading && !error && shouldShowInjuryBanner(summary) && (
        <MultiInjurySummaryBanner summary={summary} />
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[112px] w-full rounded-[10px]" />
          ))}
        </div>
      ) : error ? (
        <div
          className="flex flex-col items-start gap-2 rounded-[10px] px-4 py-4"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          <p className="font-sans text-[13px]" style={{ color: "var(--red)" }}>
            Couldn&apos;t load your injuries. Please try again.
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="flex h-11 items-center gap-1.5 rounded-[8px] px-3 font-sans text-[13px] font-medium"
            style={{ border: "1px solid var(--border)", color: "var(--text)" }}
          >
            <RefreshCw size={14} aria-hidden="true" />
            Retry
          </button>
        </div>
      ) : sorted.length === 0 ? (
        <div
          className="flex flex-col items-start gap-3 rounded-[10px] px-4 py-8"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          <p
            className="font-sans text-[14px] font-medium"
            style={{ color: "var(--text)" }}
          >
            No injuries logged. Train freely.
          </p>
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="flex h-11 items-center rounded-[8px] px-4 font-sans text-[13px] font-semibold"
            style={{ background: "var(--accent)", color: "var(--bg)" }}
          >
            Report an injury
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((injury) => (
            <InjuryCard
              key={injury.id}
              injury={injury}
              onOpen={() => setOpenInjuryId(injury.id)}
            />
          ))}
        </div>
      )}

      {openInjury && (
        <InjuryDetailSheet
          key={openInjury.id}
          injury={openInjury}
          client={client}
          onClose={() => setOpenInjuryId(null)}
          onUpdated={handleUpdated}
        />
      )}

      {reportOpen && (
        <ReportInjurySheet token={token} onClose={handleReportClosed} />
      )}
    </div>
  );
}
