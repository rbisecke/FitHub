"use client";

import { useState } from "react";
import Link from "next/link";
import type {
  PlanDetail,
  MesocycleOut,
  PlannedSessionOut,
} from "@/lib/api/plans";
import { api } from "@/lib/api/client";

const SESSION_COLORS: Record<string, string> = {
  strength: "bg-[var(--accent)]",
  metcon: "bg-orange-500",
  skill: "bg-yellow-500",
  mixed: "bg-[var(--purple)]",
  rest: "bg-[var(--surface)]",
  active_recovery: "bg-[var(--green)]",
};

function SessionDot({ session }: { session: PlannedSessionOut }) {
  const color = SESSION_COLORS[session.session_type] ?? "bg-[var(--border)]";
  return (
    <div
      data-testid="session-dot"
      title={`${session.title} (${session.scheduled_date})`}
      className={`h-4 w-4 rounded-full ${color} cursor-default`}
    />
  );
}

function MesocycleSection({
  meso,
  sessions,
}: {
  meso: MesocycleOut;
  sessions: PlannedSessionOut[];
}) {
  const mesoSessions = sessions.filter((s) => s.mesocycle_id === meso.id);
  return (
    <div className="mb-6">
      <div
        data-testid="mesocycle-header"
        className="mb-2 flex items-center gap-2"
      >
        <span className="font-mono text-xs font-semibold text-[var(--text)]">
          {meso.name}
        </span>
        <span className="font-mono text-xs text-[var(--muted)]">
          · wk {meso.week_start}–{meso.week_end}
        </span>
      </div>
      {meso.focus && (
        <p className="mb-2 font-mono text-xs text-[var(--muted)]">
          # {meso.focus}
        </p>
      )}
      <div className="flex min-h-4 flex-wrap gap-1.5">
        {mesoSessions.length === 0 ? (
          <p className="font-mono text-xs text-[var(--muted)]">
            # no sessions scheduled
          </p>
        ) : (
          mesoSessions.map((s) => <SessionDot key={s.id} session={s} />)
        )}
      </div>
    </div>
  );
}

interface Props {
  plan: PlanDetail;
  accessToken: string;
}

export function PlanBranchView({ plan: initialPlan, accessToken }: Props) {
  const [plan, setPlan] = useState(initialPlan);
  const [feedback, setFeedback] = useState("");
  const [revising, setRevising] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectResult, setDetectResult] = useState<{
    count: number;
  } | null>(null);
  const [detectError, setDetectError] = useState<string | null>(null);

  async function handleDetect() {
    setDetecting(true);
    setDetectError(null);
    setDetectResult(null);
    try {
      const res = await api.adaptations.detect(accessToken, plan.id);
      setDetectResult({ count: res.proposed_adaptations.length });
    } catch {
      setDetectError("Detection failed — please try again.");
    } finally {
      setDetecting(false);
    }
  }

  async function handleRevise() {
    if (feedback.trim().length < 5) return;
    setRevising(true);
    setError(null);
    setSuccess(false);
    try {
      const updated = await api.plans.revise(
        accessToken,
        plan.id,
        feedback.trim(),
      );
      setPlan(updated);
      setFeedback("");
      setSuccess(true);
    } catch {
      setError("Revision failed — please try again.");
    } finally {
      setRevising(false);
    }
  }

  return (
    <div
      data-testid="plan-branch-view"
      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6"
    >
      <div className="mb-6">
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[var(--muted)]">
          {Object.entries(SESSION_COLORS).map(([type, color]) => (
            <span key={type} className="flex items-center gap-1.5">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${color}`}
              />
              {type.replace("_", " ")}
            </span>
          ))}
        </div>
      </div>

      {plan.mesocycles.map((meso) => (
        <MesocycleSection key={meso.id} meso={meso} sessions={plan.sessions} />
      ))}

      {plan.mesocycles.length === 0 && (
        <p className="font-mono text-sm text-[var(--muted)]">
          # plan is still being generated…
        </p>
      )}

      <div className="mt-6 rounded-md border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-[var(--muted)]">
              $ git detect --adaptations
            </p>
            <p className="mt-0.5 font-mono text-xs text-[var(--muted)]">
              # check if training load or trends warrant a plan update
            </p>
          </div>
          <button
            data-testid="detect-adaptations-btn"
            onClick={handleDetect}
            disabled={detecting}
            className="shrink-0 rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 font-mono text-xs text-[var(--text)] transition-colors hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {detecting ? "detecting…" : "detect"}
          </button>
        </div>
        {detectError && (
          <p className="mt-2 font-mono text-xs text-red-400">{detectError}</p>
        )}
        {detectResult !== null && (
          <p className="mt-2 font-mono text-xs text-[var(--muted)]">
            {detectResult.count === 0 ? (
              "# no adaptations triggered — plan looks good"
            ) : (
              <>
                ✓ {detectResult.count} adaptation
                {detectResult.count !== 1 ? "s" : ""} proposed —{" "}
                <Link
                  href={`/plans/${plan.id}/adaptations`}
                  className="text-[var(--accent)] underline hover:brightness-110"
                >
                  review now
                </Link>
              </>
            )}
          </p>
        )}
      </div>

      <div className="mt-6 rounded-md border-t border-[var(--border)] bg-[var(--surface)] px-5 pb-5 pt-5">
        <h2 className="mb-3 font-mono text-xs text-[var(--muted)]">
          $ git request-changes
        </h2>
        <textarea
          data-testid="revision-feedback-input"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          disabled={revising}
          maxLength={500}
          placeholder="Describe what you'd like changed (e.g. reduce squat volume, I have a knee issue)…"
          rows={5}
          className="w-full min-h-[120px] resize-y rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-mono text-sm text-[var(--text)] placeholder-[var(--muted)] focus:border-[var(--muted)] focus:outline-none disabled:opacity-50"
        />
        <div className="mt-1 flex justify-end">
          <span
            className={`font-mono text-xs ${
              feedback.length > 400
                ? "text-[var(--amber)]"
                : "text-[var(--muted)]"
            }`}
          >
            {feedback.length} / 500
          </span>
        </div>
        {error && (
          <p className="mt-2 font-mono text-xs text-red-400">{error}</p>
        )}
        {success && (
          <p className="mt-2 font-mono text-xs text-[var(--green)]">
            ✓ plan revised
          </p>
        )}
        <div className="mt-3 flex justify-end">
          <button
            data-testid="revise-plan-submit"
            onClick={handleRevise}
            disabled={revising || feedback.trim().length < 5}
            className={`rounded px-4 py-2 font-mono text-sm transition-colors disabled:cursor-not-allowed ${
              revising || feedback.trim().length < 5
                ? "bg-[var(--surface)] text-[var(--muted)]"
                : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:brightness-110"
            }`}
          >
            {revising ? "revising…" : "$ commit revision"}
          </button>
        </div>
      </div>
    </div>
  );
}
