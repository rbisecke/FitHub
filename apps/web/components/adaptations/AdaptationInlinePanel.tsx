"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ApiError, createApiClient } from "@/lib/api/client";
import { summarizeAdaptationMagnitude } from "@/lib/adaptationDiff";
import type { AdaptationOut } from "@/lib/api/plans";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  token: string;
  planId: string;
  /** Route to the dedicated review page, e.g. `/plan/{id}/adaptations`. */
  reviewHref: string;
  /** Server-fetched (or dev-preview mock) initial state — skips the client fetch when provided. */
  initialAdaptations?: AdaptationOut[] | null;
}

/**
 * The compact inline adaptation panel for the plan-overview page (§8.8).
 * Apply = Merge, Dismiss = Reject; "Review in full" deep-links to the
 * dedicated page for the Adjust path and per-session review — this panel
 * never offers Adjust or per-session staging itself. An 8.6-Full surface: it
 * presumes the same whole-adaptation verdict wiring as the dedicated page
 * (merge now really rewrites sessions), so "Apply" is a real merge, not a
 * bookkeeping-only acknowledgement.
 */
export function AdaptationInlinePanel({
  token,
  planId,
  reviewHref,
  initialAdaptations,
}: Props) {
  const client = useMemo(() => createApiClient(token), [token]);
  const [adaptations, setAdaptations] = useState<AdaptationOut[] | null>(
    initialAdaptations ?? null,
  );
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState<"apply" | "dismiss" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    // Only a real array means "here's the data, don't fetch" — both an
    // omitted prop (`undefined`) and an explicit `null` mean "not loaded
    // yet, please fetch" (matches AdaptationReviewScreen's convention, so a
    // future caller passing `initialAdaptations={null}` doesn't get stuck).
    if (initialAdaptations != null) return;
    const controller = new AbortController();
    let cancelled = false;
    client.adaptations
      .list(planId, { signal: controller.signal })
      .then((data) => {
        if (!cancelled) setAdaptations(data);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
    // `initialAdaptations` is intentionally excluded — it's a one-shot
    // initial-paint prop (server-fetched or dev-preview mock), not a value
    // this component reacts to changing after mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, planId]);

  const current = adaptations?.find((a) => a.status === "proposed") ?? null;

  async function handleApply() {
    if (!current) return;
    setBusy("apply");
    setActionError(null);
    try {
      const merged = await client.adaptations.merge(current.id);
      setAdaptations((prev) =>
        prev ? prev.map((a) => (a.id === merged.id ? merged : a)) : prev,
      );
    } catch (err) {
      setActionError(
        err instanceof ApiError && err.status === 409
          ? "This change was already resolved."
          : "Couldn't apply the change — please try again.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleDismiss() {
    if (!current) return;
    setBusy("dismiss");
    setActionError(null);
    try {
      const rejected = await client.adaptations.reject(current.id);
      setAdaptations((prev) =>
        prev ? prev.map((a) => (a.id === rejected.id ? rejected : a)) : prev,
      );
    } catch (err) {
      setActionError(
        err instanceof ApiError && err.status === 409
          ? "This change was already resolved."
          : "Couldn't dismiss the change — please try again.",
      );
    } finally {
      setBusy(null);
    }
  }

  if (adaptations === null) {
    if (loadFailed) return null; // glanceable surface: fail quiet, not with an error card
    return <Skeleton className="h-24 w-full rounded-lg" />;
  }

  if (!current) return null; // loaded, nothing proposed — nothing to show inline

  const diffs = current.diff_json ?? [];
  const magnitude = summarizeAdaptationMagnitude(diffs);
  const isNoOp = diffs.length === 0;

  return (
    <div
      data-testid="adaptation-inline-panel"
      className="flex flex-col gap-3 rounded-lg border p-4"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="font-mono text-[11px]"
          style={{ color: "var(--accent)" }}
        >
          $ git diff --plan
        </span>
        {current.stub && (
          <span
            className="font-mono text-[10px]"
            style={{ color: "var(--amber)" }}
          >
            STUB
          </span>
        )}
      </div>

      {current.rationale && (
        <p className="font-sans text-[13px]" style={{ color: "var(--text)" }}>
          {current.rationale}
        </p>
      )}

      <p
        className="font-mono text-[11px] tabular-nums"
        style={{ color: "var(--muted)" }}
      >
        {isNoOp ? "No changes recommended right now" : magnitude.label}
      </p>

      {actionError && (
        <p
          className="font-mono text-[12px]"
          style={{ color: "var(--red)" }}
          role="alert"
        >
          {actionError}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleApply}
          disabled={busy !== null}
          data-testid="inline-apply-btn"
          className="min-h-11 rounded-md px-4 font-mono text-[12px] font-semibold disabled:opacity-50"
          style={{ background: "var(--green)", color: "var(--bg)" }}
        >
          {busy === "apply" ? "applying…" : "Apply"}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          disabled={busy !== null}
          data-testid="inline-dismiss-btn"
          className="min-h-11 rounded-md border px-3 font-mono text-[12px] disabled:opacity-50"
          style={{ borderColor: "var(--border)", color: "var(--muted)" }}
        >
          {busy === "dismiss" ? "dismissing…" : "Dismiss"}
        </button>
        <Link
          href={reviewHref}
          className="font-mono text-[12px] underline"
          style={{ color: "var(--accent)" }}
        >
          Review in full →
        </Link>
      </div>
    </div>
  );
}
