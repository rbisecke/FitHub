"use client";

import { useState } from "react";
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
        <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-zinc-500">
          {meso.phase}
        </span>
        <span className="font-mono text-xs text-zinc-600">
          wk {meso.week_start}–{meso.week_end}
        </span>
      </div>
      {meso.focus && (
        <p className="mb-2 font-mono text-xs text-zinc-600"># {meso.focus}</p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {mesoSessions.map((s) => (
          <SessionDot key={s.id} session={s} />
        ))}
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
        <div className="mb-3 flex flex-wrap gap-3 text-xs text-zinc-500">
          {Object.entries(SESSION_COLORS).map(([type, color]) => (
            <span key={type} className="flex items-center gap-1">
              <span className={`inline-block h-3 w-3 rounded-full ${color}`} />
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

      <div className="mt-8 border-t border-zinc-800 pt-6">
        <h2 className="mb-3 font-mono text-sm font-semibold text-zinc-300">
          $ git request-changes
        </h2>
        <textarea
          data-testid="revision-feedback-input"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          disabled={revising}
          placeholder="Describe what you'd like changed (e.g. reduce squat volume, I have a knee issue)…"
          rows={3}
          className="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-200 placeholder-zinc-600 focus:border-zinc-500 focus:outline-none disabled:opacity-50"
        />
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
            className="rounded bg-zinc-700 px-4 py-2 font-mono text-sm text-zinc-200 hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {revising ? "revising…" : "request changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
