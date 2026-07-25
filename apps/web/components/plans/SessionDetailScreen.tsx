"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createApiClient } from "@/lib/api/client";
import type { PlanDetail, PlannedSessionOut } from "@/lib/api/plans";
import { SessionTypeChip } from "@/components/plans/overview/chips";
import { RetryBanner } from "@/components/plans/overview/RetryBanner";
import { formatShortDate } from "@/lib/plans/dates";

/**
 * Session detail / preview (02 §6) — the idle-phase preview of any
 * prescribed session, reached from the calendar. Light (§1.1,
 * review-before-execute). A completed session opens read-only.
 */
export function SessionDetailScreen({
  planId,
  sessionId,
  accessToken,
}: {
  planId: string;
  sessionId: string;
  accessToken: string;
}) {
  const [plan, setPlan] = useState<PlanDetail | null | undefined>(undefined);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

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

  if (plan === undefined) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-8">
        <div
          className="h-40 animate-pulse rounded-lg bg-[var(--border)]"
          aria-busy="true"
        />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-8">
        <RetryBanner
          message="Couldn't load this session — retry"
          onRetry={() => setRetryKey((k) => k + 1)}
        />
      </div>
    );
  }

  const session = plan.sessions.find((s) => s.id === sessionId);
  if (!session) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-8 text-center">
        <p className="font-sans text-sm text-[var(--muted)]">
          Session not found in this plan.
        </p>
        <Link
          href={`/plan/${planId}`}
          className="mt-3 inline-block font-mono text-sm text-[var(--accent)] underline-offset-2 hover:underline"
        >
          ← Back to plan
        </Link>
      </div>
    );
  }

  return <SessionDetailBody planId={planId} session={session} />;
}

function SessionDetailBody({
  planId,
  session,
}: {
  planId: string;
  session: PlannedSessionOut;
}) {
  const isCompleted = session.status === "completed";

  if (session.session_type === "rest") {
    return (
      <div className="mx-auto max-w-2xl px-5 py-8 text-center">
        <p className="font-sans text-sm text-[var(--muted)]">
          {formatShortDate(session.scheduled_date)} — Rest day
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-8">
      <div>
        <Link
          href={`/plan/${planId}`}
          className="font-mono text-xs text-[var(--muted)] hover:text-[var(--text)]"
        >
          ← plan overview
        </Link>
        <div className="mt-2 flex items-center justify-between gap-3">
          <h1 className="font-sans text-xl font-bold text-[var(--text)]">
            {session.title}
          </h1>
          <SessionTypeChip sessionType={session.session_type} />
        </div>
        <p className="mt-1 font-mono text-xs tabular-nums text-[var(--muted)]">
          {formatShortDate(session.scheduled_date)}
        </p>
        {isCompleted && (
          <p
            className="mt-1 font-mono text-xs"
            style={{ color: "var(--green)" }}
          >
            ✓ completed — read-only
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {session.items.map((item, idx) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-lg p-3"
            style={{
              border: "1px solid var(--border)",
              background: "var(--surface)",
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-xs tabular-nums text-[var(--muted)] w-5 text-right shrink-0">
                {idx + 1}
              </span>
              <span className="font-sans text-sm text-[var(--text)] truncate">
                {item.movement_name}
              </span>
            </div>
            <span className="font-mono text-xs tabular-nums text-[var(--muted)] shrink-0">
              {item.sets ?? "–"}×{item.reps ?? "–"}
              {item.load_kg != null && (
                <span style={{ color: "var(--amber)" }}>
                  {" "}
                  · {item.load_kg}kg
                </span>
              )}
              {item.load_pct_1rm != null && item.load_kg == null && (
                <span style={{ color: "var(--amber)" }}>
                  {" "}
                  · {item.load_pct_1rm}%
                </span>
              )}
            </span>
          </div>
        ))}
      </div>

      {!isCompleted && (
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/plan/${planId}/sessions/${session.id}/execute`}
            className="rounded font-mono text-sm font-semibold"
            style={{
              background: "var(--accent)",
              color: "var(--bg)",
              padding: "10px 24px",
              minHeight: "44px",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            start session
          </Link>
          {/*
           * Deliberately NOT "Adapt session" — that label belongs to Domain
           * 02's distinct, LLM-driven mesocycle-level "Adaptation review"
           * feature. This is a deterministic, single-session, injury-only
           * movement swap (03 §11, FR §6); the different wording keeps the
           * two concepts legible as separate features.
           */}
          <Link
            href={`/plan/${planId}/sessions/${session.id}/modify`}
            className="rounded font-mono text-sm font-semibold"
            style={{
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              padding: "10px 24px",
              minHeight: "44px",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            injury-adapt this session
          </Link>
        </div>
      )}

      {!isCompleted && (
        <Link
          href="/coach/check-wod"
          className="flex items-center gap-1 self-start font-mono text-xs text-[var(--muted)] hover:text-[var(--text)]"
        >
          Check a WOD against your injuries
          <ArrowRight size={12} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
