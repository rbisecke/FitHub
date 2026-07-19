"use client";

import { useState } from "react";
import Link from "next/link";
import type {
  MesocycleOut,
  PlanDetail,
  PlannedSessionOut,
} from "@/lib/api/plans";
import { PhaseChip, SessionTypeChip } from "./chips";
import {
  formatShortDate,
  weekNumberForDate,
  parseLocalDate,
} from "@/lib/plans/dates";

/**
 * Plan overview — Variant A, the simplified low-density drill-down (02 §4).
 * Progress line → collapsed mesocycle rail → week drill-down → session
 * cards. Only one level is dense at a time (the "calm weight" promise).
 */
export function PlanOverviewVariantA({ plan }: { plan: PlanDetail }) {
  const completed = plan.sessions.filter(
    (s) => s.status === "completed",
  ).length;
  const total = plan.sessions.filter((s) => s.session_type !== "rest").length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Progress line — the only summary statistic (Bible 1.5) */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="font-sans text-xs text-[var(--muted)]">
            plan progress
          </span>
          <span className="font-mono text-xs tabular-nums text-[var(--text)]">
            {completed} / {total} sessions · {pct}%
          </span>
        </div>
        <div
          className="h-2 w-full overflow-hidden rounded-full"
          style={{ background: "var(--border)" }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Plan progress"
        >
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: "var(--accent)" }}
          />
        </div>
      </div>

      {/* Mesocycle rail */}
      <div className="flex flex-col gap-2">
        {plan.mesocycles.length === 0 ? (
          <p className="font-sans text-sm text-[var(--muted)]">
            Plan is still being generated…
          </p>
        ) : (
          plan.mesocycles.map((meso) => (
            <MesocycleRow key={meso.id} plan={plan} meso={meso} />
          ))
        )}
      </div>
    </div>
  );
}

function MesocycleRow({
  plan,
  meso,
}: {
  plan: PlanDetail;
  meso: MesocycleOut;
}) {
  const [expanded, setExpanded] = useState(false);
  const weekCount = meso.week_end - meso.week_start + 1;

  return (
    <div
      className="rounded-lg border"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={`Toggle ${meso.name} mesocycle`}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        style={{ minHeight: "44px" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-sans text-sm font-semibold text-[var(--text)] truncate">
            {meso.name}
          </span>
          <PhaseChip phase={meso.phase} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-xs tabular-nums text-[var(--muted)]">
            wk {meso.week_start}–{meso.week_end}
          </span>
          <span
            aria-hidden="true"
            className="inline-block transition-transform duration-150"
            style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
          >
            ▸
          </span>
        </div>
      </button>

      {expanded && (
        <div
          className="flex flex-col gap-2 border-t px-4 py-3"
          style={{ borderColor: "var(--border)" }}
        >
          {Array.from({ length: weekCount }, (_, i) => meso.week_start + i).map(
            (weekNum) => (
              <WeekRow key={weekNum} plan={plan} weekNum={weekNum} />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function WeekRow({ plan, weekNum }: { plan: PlanDetail; weekNum: number }) {
  const [expanded, setExpanded] = useState(false);
  const planStart = parseLocalDate(plan.start_date);
  const weekSessions = plan.sessions.filter(
    (s) => weekNumberForDate(s.scheduled_date, planStart) === weekNum,
  );

  return (
    <div className="rounded-md border" style={{ borderColor: "var(--border)" }}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={`Toggle week ${weekNum}`}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
        style={{ minHeight: "44px" }}
      >
        <span className="font-mono text-xs tabular-nums text-[var(--text)]">
          week {weekNum}
        </span>
        <span
          aria-hidden="true"
          className="inline-block text-[var(--muted)] transition-transform duration-150"
          style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          ▸
        </span>
      </button>

      {expanded && (
        <div
          className="flex flex-col gap-2 border-t p-3"
          style={{ borderColor: "var(--border)" }}
        >
          {weekSessions.length === 0 ? (
            <p className="font-sans text-xs text-[var(--muted)]">
              No sessions scheduled.
            </p>
          ) : (
            weekSessions.map((s) => (
              <SessionCardA key={s.id} planId={plan.id} session={s} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SessionCardA({
  planId,
  session,
}: {
  planId: string;
  session: PlannedSessionOut;
}) {
  // Rest days render with no card chrome at all (TrainingPeaks "OFF!"
  // treatment, 02 §4 item 6) — cleanly distinguishes rest from
  // active_recovery without a card.
  if (session.session_type === "rest") {
    return (
      <p className="px-1 py-1 font-sans text-xs text-[var(--muted)]">
        {formatShortDate(session.scheduled_date)} · Rest
      </p>
    );
  }

  const isCompleted = session.status === "completed";

  return (
    <Link
      href={`/plan/${planId}/sessions/${session.id}`}
      className="flex items-center justify-between gap-3 rounded-lg p-4 transition-colors"
      style={{
        minHeight: "44px",
        background: isCompleted
          ? "color-mix(in srgb, var(--green) 12%, transparent)"
          : "var(--bg)",
        border: `1px solid ${
          isCompleted
            ? "color-mix(in srgb, var(--green) 40%, transparent)"
            : "var(--border)"
        }`,
      }}
    >
      <div className="min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          {isCompleted && (
            <span aria-hidden="true" style={{ color: "var(--green)" }}>
              ✓
            </span>
          )}
          <span className="font-sans text-sm font-medium text-[var(--text)] truncate">
            {session.title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <SessionTypeChip sessionType={session.session_type} />
          <span className="font-mono text-xs tabular-nums text-[var(--muted)]">
            {formatShortDate(session.scheduled_date)}
          </span>
        </div>
      </div>
      <span className="shrink-0 font-mono text-xs tabular-nums text-[var(--muted)]">
        {session.items.length} exercise{session.items.length !== 1 ? "s" : ""}
      </span>
    </Link>
  );
}
