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
  strength: "bg-indigo-500",
  metcon: "bg-orange-500",
  skill: "bg-yellow-500",
  mixed: "bg-purple-500",
  rest: "bg-zinc-700",
  active_recovery: "bg-green-700",
};

function SessionDot({ session }: { session: PlannedSessionOut }) {
  const color = SESSION_COLORS[session.session_type] ?? "bg-zinc-600";
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
        <span className="font-mono text-xs font-semibold text-zinc-300">
          {meso.name}
        </span>
        <span className="font-mono text-xs text-zinc-500">
          · wk {meso.week_start}–{meso.week_end}
        </span>
      </div>
      {meso.focus && (
        <p className="mb-2 font-mono text-xs text-zinc-600"># {meso.focus}</p>
      )}
      <div className="flex min-h-4 flex-wrap gap-1.5">
        {mesoSessions.length === 0 ? (
          <p className="font-mono text-xs text-zinc-700">
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
      className="rounded-lg border border-zinc-800 bg-zinc-900 p-6"
    >
      <div className="mb-6">
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-zinc-500">
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
        <p className="font-mono text-sm text-zinc-600">
          # plan is still being generated…
        </p>
      )}

      <div className="mt-6 rounded-md border border-zinc-800 bg-zinc-800/30 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-zinc-400">
              $ git detect --adaptations
            </p>
            <p className="mt-0.5 font-mono text-xs text-zinc-600">
              # check if training load or trends warrant a plan update
            </p>
          </div>
          <button
            data-testid="detect-adaptations-btn"
            onClick={handleDetect}
            disabled={detecting}
            className="shrink-0 rounded border border-zinc-600 bg-zinc-700 px-3 py-1.5 font-mono text-xs text-zinc-200 transition-colors hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {detecting ? "detecting…" : "detect"}
          </button>
        </div>
        {detectError && (
          <p className="mt-2 font-mono text-xs text-red-400">{detectError}</p>
        )}
        {detectResult !== null && (
          <p className="mt-2 font-mono text-xs text-zinc-400">
            {detectResult.count === 0 ? (
              "# no adaptations triggered — plan looks good"
            ) : (
              <>
                ✓ {detectResult.count} adaptation
                {detectResult.count !== 1 ? "s" : ""} proposed —{" "}
                <Link
                  href={`/plans/${plan.id}/adaptations`}
                  className="text-indigo-400 hover:text-indigo-300 underline"
                >
                  review now
                </Link>
              </>
            )}
          </p>
        )}
      </div>

      <div className="mt-6 rounded-md border-t border-zinc-600 bg-zinc-800/40 px-5 pb-5 pt-5">
        <h2 className="mb-3 font-mono text-xs text-zinc-400">
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
          className="w-full min-h-[120px] resize-y rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-200 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none disabled:opacity-50"
        />
        <div className="mt-1 flex justify-end">
          <span
            className={`font-mono text-xs ${
              feedback.length > 400 ? "text-amber-400" : "text-zinc-600"
            }`}
          >
            {feedback.length} / 500
          </span>
        </div>
        {error && (
          <p className="mt-2 font-mono text-xs text-red-400">{error}</p>
        )}
        {success && (
          <p className="mt-2 font-mono text-xs text-green-400">
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
                ? "bg-zinc-800 text-zinc-600"
                : "border border-zinc-500 bg-zinc-700 text-zinc-200 hover:bg-zinc-600"
            }`}
          >
            {revising ? "revising…" : "$ commit revision"}
          </button>
        </div>
      </div>
    </div>
  );
}
