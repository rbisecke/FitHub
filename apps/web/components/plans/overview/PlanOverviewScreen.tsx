"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createApiClient } from "@/lib/api/client";
import type { PlanDetail } from "@/lib/api/plans";
import { PlanHeader } from "./PlanHeader";
import { PlanOverviewVariantA } from "./VariantA";
import { PlanOverviewVariantB } from "./VariantB";
import { RetryBanner } from "./RetryBanner";

type Variant = "A" | "B";
const VARIANT_STORAGE_KEY = "fithub:plan-overview-variant";

/**
 * Plan / calendar overview (02 §4, §5) — client-owned fetch so the
 * loading-skeleton / fetch-error-retry / empty states are real interactive
 * states, not just an initial server render. Light theme (§1.1 — the page
 * wrapping this in `ForcedTheme` handles that).
 *
 * Bible Open Decision #5 requires BOTH variants built and testable
 * side-by-side, not pre-chosen — the toggle below is the harness for that,
 * persisted per-browser so a returning athlete keeps their pick.
 */
export function PlanOverviewScreen({
  planId,
  accessToken,
}: {
  planId: string;
  accessToken: string;
}) {
  const [plan, setPlan] = useState<PlanDetail | null | undefined>(undefined);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [variant, setVariant] = useState<Variant>("A");

  useEffect(() => {
    // Deferred to a microtask — satisfies react-hooks/set-state-in-effect
    // (a synchronous setState in an effect body triggers a same-tick
    // cascading render) while still applying before the browser paints.
    void Promise.resolve().then(() => {
      const stored = window.localStorage.getItem(VARIANT_STORAGE_KEY);
      if (stored === "A" || stored === "B") setVariant(stored);
    });
  }, []);

  function selectVariant(v: Variant) {
    setVariant(v);
    window.localStorage.setItem(VARIANT_STORAGE_KEY, v);
  }

  useEffect(() => {
    const client = createApiClient(accessToken);
    const controller = new AbortController();
    let cancelled = false;

    void Promise.resolve().then(() => {
      if (cancelled) return;
      setPlan(undefined);
      setError(false);
    });

    client.plans
      .get(planId)
      .then((data) => {
        if (!cancelled) setPlan(data);
      })
      .catch(() => {
        if (!cancelled && !controller.signal.aborted) {
          setError(true);
          setPlan(null);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [planId, accessToken, retryKey]);

  // Loading
  if (plan === undefined) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-8">
        <div
          className="flex flex-col gap-4"
          aria-busy="true"
          aria-label="Loading plan"
        >
          <div className="h-8 w-2/3 animate-pulse rounded bg-[var(--border)]" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-[var(--border)]" />
          <div className="h-24 w-full animate-pulse rounded-lg bg-[var(--border)]" />
          <div className="h-24 w-full animate-pulse rounded-lg bg-[var(--border)]" />
        </div>
      </div>
    );
  }

  // Fetch error (distinct from a genuinely empty/no-plan state)
  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-8">
        <RetryBanner
          message="Couldn't load this plan — retry"
          onRetry={() => setRetryKey((k) => k + 1)}
        />
      </div>
    );
  }

  // Empty (no plan) — shouldn't normally be reached since /plan redirects
  // to /plan/new when there's no plan, but a directly-visited stale link
  // should still land somewhere useful.
  if (!plan) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-8 text-center">
        <p className="font-sans text-sm text-[var(--muted)]">
          This plan doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Link
          href="/plan/new"
          className="mt-3 inline-block font-mono text-sm text-[var(--accent)] underline-offset-2 hover:underline"
        >
          Generate a new plan →
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-8">
      <PlanHeader plan={plan} />

      <div
        role="tablist"
        aria-label="Overview density"
        className="flex w-fit gap-1 rounded-lg p-1"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        {(["A", "B"] as Variant[]).map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={variant === v}
            onClick={() => selectVariant(v)}
            className="rounded-md px-3 py-1.5 font-mono text-xs font-semibold transition-colors"
            style={{
              minHeight: "36px",
              color: variant === v ? "var(--bg)" : "var(--muted)",
              background: variant === v ? "var(--accent)" : "transparent",
            }}
          >
            {v === "A" ? "Simple" : "Full"}
          </button>
        ))}
      </div>

      {variant === "A" ? (
        <PlanOverviewVariantA plan={plan} />
      ) : (
        <PlanOverviewVariantB plan={plan} />
      )}
    </div>
  );
}
