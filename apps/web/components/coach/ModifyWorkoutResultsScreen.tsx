"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createApiClient } from "@/lib/api/client";
import type { ModifyWorkoutResponse } from "@/lib/api/plans";
import { RetryBanner } from "@/components/plans/overview/RetryBanner";
import {
  ReferralBanner,
  ResultGroupHeading,
  SafeRow,
  SubstituteRow,
} from "@/components/coach/InjuryReviewRows";

/**
 * Injury-adapt-this-session results (03 §11). A deterministic, curated,
 * non-LLM single-session substitution review — explicitly not a plan
 * adaptation (FR §6; Domain 02's distinct "Adaptation review" is a separate
 * feature). Light review surface (§0.1); the referral banner is the only
 * `--red` use here, ordinary substitutions stay `--amber` (§1.4).
 */
export function ModifyWorkoutResultsScreen({
  planId,
  sessionId,
  accessToken,
}: {
  planId: string;
  sessionId: string;
  accessToken: string;
}) {
  const [result, setResult] = useState<
    ModifyWorkoutResponse | null | undefined
  >(undefined);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const client = createApiClient(accessToken);
    const controller = new AbortController();
    let cancelled = false;

    void Promise.resolve().then(() => {
      if (cancelled) return;
      setResult(undefined);
      setError(false);
    });

    client.coach
      .modifyWorkout(sessionId, { signal: controller.signal })
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch(() => {
        if (!cancelled && !controller.signal.aborted) {
          setError(true);
          setResult(null);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [sessionId, accessToken, retryKey]);

  return (
    // Extra mobile-only bottom padding beyond the shell's own `pb-nav-safe`:
    // the quick-log FAB perches above the tab bar's top edge (`00` Part 4 /
    // components/shell/quick-log-fab.tsx) and can still clip the last row of
    // a long "must substitute" list at the very bottom of a scroll.
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-5 pb-24 pt-8 md:pb-8">
      <div>
        <Link
          href={`/plan/${planId}/sessions/${sessionId}`}
          className="font-mono text-xs text-[var(--muted)] hover:text-[var(--text)]"
        >
          ← session detail
        </Link>
        <h1 className="mt-2 font-sans text-xl font-bold text-[var(--text)]">
          Injury-adapt this session
        </h1>
        <p
          className="mt-1 font-sans text-[13px]"
          style={{ color: "var(--muted)" }}
        >
          A deterministic, curated substitution check against your active
          injuries for this one session — not a plan change.
        </p>
      </div>

      {result === undefined && !error && (
        <div
          className="h-40 animate-pulse rounded-lg bg-[var(--border)]"
          aria-busy="true"
        />
      )}

      {error && (
        <RetryBanner
          message="Couldn't check this session — retry"
          onRetry={() => setRetryKey((k) => k + 1)}
        />
      )}

      {result && (
        <div className="flex flex-col gap-6">
          {result.any_referral_required && (
            <ReferralBanner regions={result.referral_regions} />
          )}

          {result.modifications.length === 0 &&
            !result.any_referral_required && (
              <div
                className="rounded-[10px] px-4 py-3 text-center font-sans text-[13px]"
                style={{
                  background: "color-mix(in srgb, var(--green) 10%, var(--bg))",
                  border:
                    "1px solid color-mix(in srgb, var(--green) 35%, var(--border))",
                  color: "var(--text)",
                }}
              >
                All clear — no substitutions needed for this session.
              </div>
            )}

          {result.modifications.length > 0 && (
            <section className="flex flex-col gap-2">
              <ResultGroupHeading
                label="Must substitute"
                count={result.modifications.length}
              />
              <div className="flex flex-col gap-2">
                {/*
                 * `mod.confidence` ("curated" | "llm_generated") is
                 * intentionally not rendered: it's always "curated" today
                 * (FR §2/§7), and the spec is explicit that no
                 * "AI-generated" badge should ship unless/until
                 * `llm_generated` actually occurs — showing one now would
                 * imply model involvement this endpoint doesn't have.
                 */}
                {result.modifications.map((mod, i) => (
                  <SubstituteRow
                    key={`${mod.original_movement}-${i}`}
                    movementName={mod.original_movement}
                    drivenBy={mod.driven_by}
                    substitutions={mod.substitutions}
                  />
                ))}
              </div>
            </section>
          )}

          {result.safe_movements.length > 0 && (
            <section className="flex flex-col gap-2">
              <ResultGroupHeading
                label="Safe as-is"
                count={result.safe_movements.length}
              />
              <div className="flex flex-col gap-2">
                {result.safe_movements.map((m, i) => (
                  <SafeRow key={`${m}-${i}`} movementName={m} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
