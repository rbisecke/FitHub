"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError, createApiClient } from "@/lib/api/client";
import {
  computeManualRevisionDiff,
  summarizeAdaptationMagnitude,
} from "@/lib/adaptationDiff";
import type { AdaptationSessionDiff, PlanDetail } from "@/lib/api/plans";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { SessionDiffCard } from "./SessionDiffCard";

const MIN_LEN = 5;
const MAX_LEN = 500;

interface Props {
  token: string;
  planId: string;
  /** Optional server-fetched plan detail to skip a duplicate client fetch. */
  initialPlanDetail?: PlanDetail | null;
}

/**
 * The `$ git request-changes` composer (design spec §9). Unlike the AI
 * adaptation flow, a manual revision applies immediately — there is no
 * verdict step. The result renders as an already-applied diff (reusing the
 * §8.5 diff-rendering component in read-only mode), not a pending decision.
 *
 * The `/plans/{id}/revise` endpoint returns the updated PlanDetail, not an
 * old/new diff (that shape only exists on the AI-adaptation path). To honor
 * §9's "show the result as an applied diff" requirement without a backend
 * change, this component snapshots the plan's prescribed sessions before
 * submitting and reconstructs a presentational diff client-side — see
 * `computeManualRevisionDiff` in `lib/adaptationDiff.ts`.
 */
export function ManualRevisionComposer({
  token,
  planId,
  initialPlanDetail = null,
}: Props) {
  const client = useMemo(() => createApiClient(token), [token]);
  const [plan, setPlan] = useState<PlanDetail | null>(initialPlanDetail);
  const [loading, setLoading] = useState(initialPlanDetail === null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [resultDiff, setResultDiff] = useState<AdaptationSessionDiff[] | null>(
    null,
  );

  useEffect(() => {
    if (initialPlanDetail !== null && retryKey === 0) return;
    const controller = new AbortController();
    let cancelled = false;
    client.plans
      .get(planId, { signal: controller.signal })
      .then((data) => {
        if (cancelled) return;
        setPlan(data);
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

  const hasEligibleSessions = useMemo(
    () => (plan ? plan.sessions.some((s) => s.status === "prescribed") : null),
    [plan],
  );

  async function handleSubmit() {
    if (!plan || feedback.trim().length < MIN_LEN) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const beforeSessions = plan.sessions;
      const updated = await client.plans.revise(planId, feedback.trim());
      const diff = computeManualRevisionDiff(beforeSessions, updated.sessions);
      setPlan(updated);
      setResultDiff(diff);
      setFeedback("");
      setOpen(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setSubmitError(
          "You've made several changes recently — try again in a bit.",
        );
      } else if (err instanceof ApiError && err.status === 422) {
        // A 422 here covers two distinct backend cases (LLM targeted a
        // non-prescribed session, or the plan's prescribed sessions ran out
        // between this composer's load and submit) — kept deliberately
        // generic since "try rephrasing" is a non-sequitur for the second.
        setSubmitError(
          "Couldn't apply that change — please check your plan and try again.",
        );
      } else {
        setSubmitError("Something went wrong — please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Skeleton
        className="h-32 w-full rounded-lg"
        data-testid="revision-composer-loading"
      />
    );
  }

  if (loadFailed || !plan) {
    return (
      <div
        className="rounded-lg border p-4"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        data-testid="revision-composer-error"
      >
        <p className="font-mono text-[13px]" style={{ color: "var(--red)" }}>
          Couldn&apos;t load this plan.
        </p>
        <button
          type="button"
          onClick={refetch}
          className="mt-2 min-h-11 rounded-md border px-3 font-mono text-[12px]"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        >
          retry
        </button>
      </div>
    );
  }

  if (resultDiff) {
    const magnitude = summarizeAdaptationMagnitude(resultDiff);
    return (
      <div className="flex flex-col gap-3" data-testid="revision-applied-diff">
        <div
          className="rounded-lg border p-4"
          style={{
            borderColor: "var(--green)",
            background: "color-mix(in srgb, var(--green) 8%, var(--bg))",
          }}
        >
          <p
            className="font-mono text-[13px] font-semibold"
            style={{ color: "var(--green)" }}
          >
            ✓ revision applied
          </p>
          <p
            className="mt-1 font-mono text-[12px] tabular-nums"
            style={{ color: "var(--muted)" }}
          >
            {resultDiff.length === 0
              ? "No session changes were needed."
              : magnitude.label}
          </p>
        </div>
        {resultDiff.map((diff) => (
          <SessionDiffCard
            key={diff.session_id}
            diff={diff}
            viewed={true}
            onToggleViewed={() => {}}
            readOnly
          />
        ))}
        <button
          type="button"
          onClick={() => setResultDiff(null)}
          className="min-h-11 self-start rounded-md border px-3 font-mono text-[12px]"
          style={{ borderColor: "var(--border)", color: "var(--muted)" }}
        >
          done
        </button>
      </div>
    );
  }

  if (hasEligibleSessions === false) {
    return (
      <div
        className="rounded-lg border p-4"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        data-testid="revision-no-eligible-sessions"
      >
        <p className="font-mono text-[13px]" style={{ color: "var(--muted)" }}>
          Nothing left to revise — this plan is fully executed or already
          adapted.
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="open-revision-composer"
        className="min-h-11 self-start rounded-md border px-4 font-mono text-[13px]"
        style={{ borderColor: "var(--border)", color: "var(--text)" }}
      >
        $ git request-changes
      </button>
    );
  }

  const charCount = feedback.length;
  const tooShort =
    feedback.trim().length > 0 && feedback.trim().length < MIN_LEN;

  return (
    <div
      className="flex flex-col gap-3 rounded-lg border p-4"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      data-testid="revision-composer"
    >
      <label
        htmlFor="revision-feedback-input"
        className="font-mono text-[12px]"
        style={{ color: "var(--muted)" }}
      >
        $ git request-changes
      </label>
      <Textarea
        id="revision-feedback-input"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        placeholder="Describe the change you want… e.g. 'swap Thursday's metcon for a Zone 2 row'"
        maxLength={MAX_LEN}
        rows={4}
        disabled={submitting}
        className="font-mono text-[13px]"
        data-testid="revision-feedback-input"
      />
      <div className="flex items-center justify-between">
        <span
          className="font-mono text-[11px] tabular-nums"
          style={{ color: tooShort ? "var(--amber)" : "var(--muted)" }}
        >
          {charCount}/{MAX_LEN}
        </span>
      </div>
      {submitError && (
        <p
          className="font-mono text-[12px]"
          style={{ color: "var(--red)" }}
          role="alert"
        >
          {submitError}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || feedback.trim().length < MIN_LEN}
          data-testid="revise-plan-submit"
          className="min-h-11 rounded-md px-4 font-mono text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            background:
              submitting || feedback.trim().length < MIN_LEN
                ? "var(--border)"
                : "var(--accent)",
            color:
              submitting || feedback.trim().length < MIN_LEN
                ? "var(--muted)"
                : "var(--bg)",
          }}
        >
          {submitting ? "applying…" : "Request changes"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setFeedback("");
            setSubmitError(null);
          }}
          disabled={submitting}
          className="min-h-11 rounded-md border px-3 font-mono text-[12px]"
          style={{ borderColor: "var(--border)", color: "var(--muted)" }}
        >
          cancel
        </button>
      </div>
    </div>
  );
}
