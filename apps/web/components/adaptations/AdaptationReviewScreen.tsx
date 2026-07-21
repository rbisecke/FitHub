"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { ApiError, createApiClient } from "@/lib/api/client";
import {
  isAdaptationDiffStale,
  sessionsChangedBetweenDiffs,
} from "@/lib/adaptationDiff";
import type { AdaptationOut } from "@/lib/api/plans";
import { Skeleton } from "@/components/ui/skeleton";
import { AdaptationHeader } from "./AdaptationHeader";
import { SessionDiffCard } from "./SessionDiffCard";
import { VerdictBar, type Verdict } from "./VerdictBar";

interface Props {
  token: string;
  planId: string;
  initialAdaptations: AdaptationOut[] | null;
  initialLoadFailed: boolean;
}

function SessionCardSkeleton() {
  return (
    <div
      className="flex flex-col gap-2 rounded-lg border p-3"
      style={{ borderColor: "var(--border)" }}
    >
      <Skeleton className="h-4 w-1/2 rounded-sm" />
      <Skeleton className="h-2 w-1/3 rounded-full" />
    </div>
  );
}

/**
 * Dedicated adaptation review page (§8.3-§8.7) — the "PR review" for one
 * plan's proposed AI adaptation. Owns the Viewed checklist, verdict
 * submission, and every documented edge case: empty/no-proposal, loading,
 * the adjust round-trip with selective un-viewing (§8.4), 409 races, an
 * empty-diff no-op proposal, 429 rate limits, and stale-diff re-validation
 * before Merge (§8.7).
 */
export function AdaptationReviewScreen({
  token,
  planId,
  initialAdaptations,
  initialLoadFailed,
}: Props) {
  const client = useMemo(() => createApiClient(token), [token]);
  const [adaptations, setAdaptations] = useState<AdaptationOut[] | null>(
    initialAdaptations,
  );
  const [loading, setLoading] = useState(
    initialAdaptations === null && !initialLoadFailed,
  );
  const [loadFailed, setLoadFailed] = useState(initialLoadFailed);
  const [retryKey, setRetryKey] = useState(0);

  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set());
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [raceResolved, setRaceResolved] = useState(false);
  const [staleWarning, setStaleWarning] = useState(false);
  const [adjustRegenerating, setAdjustRegenerating] = useState(false);

  // Tracks which adaptation id's Viewed-state has already been deliberately
  // computed (by the adjust handler's selective invalidation) so the
  // "new adaptation appeared" reset effect below doesn't clobber it.
  const handledTransitionRef = useRef<string | null>(null);
  // Synchronous re-entrancy guard for handleSubmitVerdict — see there.
  const submittingRef = useRef(false);

  useEffect(() => {
    // Skip the client fetch on mount whenever SSR already gave us a first
    // paint — either real data (`initialAdaptations !== null`) or a known
    // failure (`initialLoadFailed`); the latter shows the retry state
    // immediately rather than silently re-hitting the API on hydration.
    if ((initialAdaptations !== null || initialLoadFailed) && retryKey === 0)
      return;
    const controller = new AbortController();
    let cancelled = false;
    client.adaptations
      .list(planId, { signal: controller.signal })
      .then((data) => {
        if (cancelled) return;
        setAdaptations(data);
        setLoadFailed(false);
      })
      .catch(() => {
        if (cancelled || controller.signal.aborted) return;
        setLoadFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryKey, client, planId]);

  // setLoading is set here (a user-event handler), never synchronously
  // inside the fetch effect above — the effect only ever flips it back off.
  function refetch() {
    setLoading(true);
    setRetryKey((k) => k + 1);
  }

  const current = useMemo(() => {
    if (!adaptations) return null;
    // proposed_at DESC ordering from the API — most recent proposal first.
    return adaptations.find((a) => a.status === "proposed") ?? null;
  }, [adaptations]);

  useEffect(() => {
    if (!current) return;
    if (handledTransitionRef.current === current.id) return;
    setViewedIds(new Set());
    setVerdict(null);
    setFeedback("");
    setSubmitError(null);
    handledTransitionRef.current = current.id;
  }, [current]);

  function toggleViewed(sessionId: string) {
    setViewedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  }

  function applyResolved(updated: AdaptationOut) {
    setAdaptations((prev) =>
      prev ? prev.map((a) => (a.id === updated.id ? updated : a)) : [updated],
    );
  }

  async function handleSubmitVerdict() {
    // Re-entrancy guard: `submitting` state doesn't visually/functionally
    // disable the button until the next commit, so a very fast double-tap
    // can invoke this before that repaint. The ref updates synchronously.
    if (submittingRef.current || !current || verdict === null) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (verdict === "merge") {
        const livePlan = await client.plans.get(planId);
        if (isAdaptationDiffStale(current.diff_json ?? [], livePlan.sessions)) {
          setStaleWarning(true);
          return;
        }
        const merged = await client.adaptations.merge(current.id);
        applyResolved(merged);
      } else if (verdict === "reject") {
        const rejected = await client.adaptations.reject(
          current.id,
          feedback.trim() || undefined,
        );
        applyResolved(rejected);
      } else if (verdict === "adjust") {
        setAdjustRegenerating(true);
        const revised = await client.adaptations.adjust(current.id, {
          feedback: feedback.trim(),
        });
        const revisedDiffs = revised.diff_json ?? [];
        const changedSessions = sessionsChangedBetweenDiffs(
          current.diff_json ?? [],
          revisedDiffs,
        );
        setViewedIds((prev) => {
          const next = new Set<string>();
          for (const id of prev) {
            if (
              !changedSessions.has(id) &&
              revisedDiffs.some((d) => d.session_id === id)
            ) {
              next.add(id);
            }
          }
          return next;
        });
        handledTransitionRef.current = revised.id;
        setAdaptations((prev) =>
          prev
            ? [
                revised,
                ...prev.map((a) =>
                  a.id === current.id
                    ? { ...a, status: "rejected" as const }
                    : a,
                ),
              ]
            : [revised],
        );
        setVerdict(null);
        setFeedback("");
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setRaceResolved(true);
      } else if (err instanceof ApiError && err.status === 429) {
        setSubmitError(
          verdict === "adjust"
            ? "You've requested several adjustments recently — try again shortly."
            : "You're moving fast — try again shortly.",
        );
      } else {
        setSubmitError("Something went wrong — please try again.");
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
      setAdjustRegenerating(false);
    }
  }

  if (loading) {
    return (
      <div
        className="flex flex-col gap-4 p-4"
        data-testid="adaptation-review-loading"
      >
        <Skeleton className="h-24 w-full rounded-lg" />
        <SessionCardSkeleton />
        <SessionCardSkeleton />
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div
        className="m-4 flex flex-col items-start gap-2 rounded-lg border p-4"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        data-testid="adaptation-review-error"
      >
        <p className="font-mono text-[13px]" style={{ color: "var(--red)" }}>
          Couldn&apos;t load this plan&apos;s adaptation history.
        </p>
        <button
          type="button"
          onClick={refetch}
          className="flex min-h-11 items-center gap-1.5 rounded-md border px-3 font-mono text-[12px]"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        >
          <RefreshCw size={13} aria-hidden="true" />
          retry
        </button>
      </div>
    );
  }

  if (raceResolved) {
    return (
      <div
        className="m-4 rounded-lg border p-4"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        data-testid="adaptation-race-resolved"
      >
        <p className="font-mono text-[13px]" style={{ color: "var(--muted)" }}>
          This change was already resolved.
        </p>
        <button
          type="button"
          onClick={() => {
            setRaceResolved(false);
            refetch();
          }}
          className="mt-2 min-h-11 rounded-md border px-3 font-mono text-[12px]"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        >
          refresh
        </button>
      </div>
    );
  }

  if (staleWarning) {
    return (
      <div
        className="m-4 rounded-lg border p-4"
        style={{
          borderColor: "var(--amber)",
          background: "color-mix(in srgb, var(--amber) 10%, var(--bg))",
        }}
        data-testid="adaptation-stale-warning"
      >
        <p className="font-mono text-[13px]" style={{ color: "var(--amber)" }}>
          This plan changed since this suggestion was generated — re-check for
          changes.
        </p>
        <button
          type="button"
          onClick={() => {
            setStaleWarning(false);
            refetch();
          }}
          className="mt-2 min-h-11 rounded-md border px-3 font-mono text-[12px]"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        >
          refresh
        </button>
      </div>
    );
  }

  if (!current) {
    return (
      <div
        className="m-4 rounded-lg border p-6 text-center"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        data-testid="adaptation-empty-state"
      >
        <p className="font-mono text-[13px]" style={{ color: "var(--muted)" }}>
          No proposed changes — your plan is on track.
        </p>
      </div>
    );
  }

  const currentDiffs = current.diff_json ?? [];
  const isNoOp = currentDiffs.length === 0;
  const totalCount = isNoOp ? 0 : currentDiffs.length;
  const reviewedCount = isNoOp
    ? 0
    : currentDiffs.filter((d) => viewedIds.has(d.session_id)).length;

  return (
    <div
      className="flex flex-col gap-4 p-4 pb-24 md:pb-4"
      data-testid="adaptation-review-screen"
    >
      <AdaptationHeader adaptation={current} />

      {adjustRegenerating && (
        <p
          className="font-mono text-[12px]"
          style={{ color: "var(--accent)" }}
          data-testid="adjust-regenerating"
          aria-live="polite"
        >
          regenerating proposal…
        </p>
      )}

      {isNoOp ? (
        <div
          className="rounded-lg border p-4"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          data-testid="adaptation-no-op"
        >
          <p
            className="font-mono text-[13px]"
            style={{ color: "var(--muted)" }}
          >
            No changes recommended right now.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3" data-testid="session-diff-list">
          {currentDiffs.map((diff) => (
            <SessionDiffCard
              key={diff.session_id}
              diff={diff}
              viewed={viewedIds.has(diff.session_id)}
              onToggleViewed={toggleViewed}
            />
          ))}
        </div>
      )}

      <VerdictBar
        reviewedCount={reviewedCount}
        totalCount={totalCount}
        verdict={verdict}
        setVerdict={setVerdict}
        feedback={feedback}
        setFeedback={setFeedback}
        onSubmit={handleSubmitVerdict}
        submitting={submitting}
        errorMessage={submitError}
      />
    </div>
  );
}
