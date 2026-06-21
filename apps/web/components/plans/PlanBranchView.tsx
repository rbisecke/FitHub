"use client";

import type {
  PlanDetail,
  MesocycleOut,
  PlannedSessionOut,
} from "@/lib/api/plans";

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

export function PlanBranchView({ plan }: { plan: PlanDetail }) {
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
    </div>
  );
}
