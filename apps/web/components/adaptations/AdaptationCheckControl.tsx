"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ApiError, createApiClient } from "@/lib/api/client";
import { triggerReasonCopy } from "@/lib/adaptationDiff";
import type { AdaptationOut } from "@/lib/api/plans";

interface Props {
  token: string;
  planId: string;
  /** Route to the dedicated review page, e.g. `/plan/{id}/adaptations`. */
  reviewHref: string;
  /** Server-fetched (or dev-preview mock) initial state — skips the client fetch when provided. */
  initialAdaptations?: AdaptationOut[] | null;
}

/**
 * The plan-detail "Check for changes" control + its resulting announcement
 * banner (design spec §8.2). Detection is explicit-only — never auto-run on
 * page load, since it's side-effectful (mints a new proposal every call, no
 * dedup) and rate-limited 5/hr. When a `proposed` adaptation already exists,
 * the control is disabled (duplicate guard) and the banner takes over.
 */
export function AdaptationCheckControl({
  token,
  planId,
  reviewHref,
  initialAdaptations,
}: Props) {
  const client = useMemo(() => createApiClient(token), [token]);
  const [adaptations, setAdaptations] = useState<AdaptationOut[] | null>(
    initialAdaptations ?? null,
  );
  const [checking, setChecking] = useState(false);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);

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
        if (!cancelled) setAdaptations([]);
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

  const pending = adaptations?.find((a) => a.status === "proposed") ?? null;

  async function handleCheck() {
    setChecking(true);
    setCheckMessage(null);
    setCheckError(null);
    try {
      const res = await client.adaptations.detect(planId);
      if (res.proposed_adaptations.length === 0) {
        setCheckMessage(
          "No changes recommended right now — your plan is on track.",
        );
      } else {
        setAdaptations((prev) => [
          ...res.proposed_adaptations,
          ...(prev ?? []),
        ]);
      }
    } catch (err) {
      setCheckError(
        err instanceof ApiError && err.status === 429
          ? "You've checked for changes several times recently — try again shortly."
          : "Couldn't check for changes — please try again.",
      );
    } finally {
      setChecking(false);
    }
  }

  if (pending) {
    const reason = triggerReasonCopy(
      pending.trigger_type,
      pending.trigger_data,
    );
    return (
      <div
        data-testid="adaptation-announcement-banner"
        className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
        style={{
          borderColor: "color-mix(in srgb, var(--accent) 40%, var(--border))",
          background: "color-mix(in srgb, var(--accent) 8%, var(--surface))",
        }}
      >
        <div className="flex flex-col gap-1">
          <p
            className="font-sans text-[13px] font-semibold"
            style={{ color: "var(--text)" }}
          >
            FitHub proposed a change to your plan
          </p>
          <p
            className="font-sans text-[12px]"
            style={{ color: "var(--muted)" }}
          >
            {reason}
          </p>
        </div>
        <Link
          href={reviewHref}
          className="shrink-0 rounded-md px-4 py-2 text-center font-mono text-[12px] font-semibold"
          style={{ background: "var(--accent)", color: "var(--bg)" }}
        >
          Review change →
        </Link>
      </div>
    );
  }

  return (
    <div
      data-testid="adaptation-check-control"
      className="flex flex-col gap-2 rounded-lg border p-4"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p
            className="font-mono text-[12px]"
            style={{ color: "var(--muted)" }}
          >
            $ git diff --plan
          </p>
          <p
            className="mt-0.5 font-mono text-[11px]"
            style={{ color: "var(--muted)" }}
          >
            # check if training load or trends warrant a plan update
          </p>
        </div>
        <button
          type="button"
          onClick={handleCheck}
          disabled={checking || adaptations === null}
          data-testid="detect-adaptations-btn"
          className="min-h-11 shrink-0 rounded-md border px-3 font-mono text-[12px] disabled:cursor-not-allowed disabled:opacity-50"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        >
          {checking ? "checking…" : "Check for changes"}
        </button>
      </div>
      {checkMessage && (
        <p className="font-mono text-[12px]" style={{ color: "var(--muted)" }}>
          {checkMessage}
        </p>
      )}
      {checkError && (
        <p
          className="font-mono text-[12px]"
          style={{ color: "var(--red)" }}
          role="alert"
        >
          {checkError}
        </p>
      )}
    </div>
  );
}
