"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PlanDetail, PlannedSessionOut } from "@/lib/api/plans";
import { PhaseChip, resolvePhaseChip, SessionTypeChip } from "./chips";
import {
  formatShortDate,
  localDateString,
  parseLocalDate,
  todayLocalDateString,
  weekNumberForDate,
} from "@/lib/plans/dates";

/**
 * Plan overview — Variant B, the fuller periodization layout (02 §5):
 * phase-block strip → volume sparkline → date strip with dot-density →
 * selected-day detail. The denser counterpart to Variant A, built
 * side-by-side per Bible Open Decision #5 — neither is pre-chosen.
 */
export function PlanOverviewVariantB({ plan }: { plan: PlanDetail }) {
  const planStart = useMemo(
    () => parseLocalDate(plan.start_date),
    [plan.start_date],
  );
  const allDates = useMemo(
    () =>
      Array.from({ length: plan.weeks * 7 }, (_, i) => {
        const d = new Date(planStart);
        d.setDate(planStart.getDate() + i);
        return d;
      }),
    [planStart, plan.weeks],
  );

  const sessionsByDate = useMemo(() => {
    const m = new Map<string, PlannedSessionOut[]>();
    for (const s of plan.sessions) {
      const arr = m.get(s.scheduled_date) ?? [];
      arr.push(s);
      m.set(s.scheduled_date, arr);
    }
    return m;
  }, [plan.sessions]);

  const today = todayLocalDateString();
  const defaultSelected = plan.sessions.find((s) => s.scheduled_date === today)
    ? today
    : allDates[0]
      ? localDateString(allDates[0])
      : today;
  const [selectedDate, setSelectedDate] = useState(defaultSelected);

  const selectedSessions = sessionsByDate.get(selectedDate) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PhaseStrip plan={plan} />
      <VolumeSparkline plan={plan} />
      <DateStrip
        dates={allDates}
        sessionsByDate={sessionsByDate}
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
      />
      <SelectedDayDetail
        planId={plan.id}
        date={selectedDate}
        sessions={selectedSessions}
      />
    </div>
  );
}

// ── Phase-block strip (macro) ──────────────────────────────────────────

function PhaseStrip({ plan }: { plan: PlanDetail }) {
  if (plan.mesocycles.length === 0) return null;
  return (
    <div>
      <p className="mb-1 font-sans text-xs text-[var(--muted)]">phases</p>
      <div className="overflow-x-auto">
        <div className="flex gap-1" style={{ minWidth: "480px" }}>
          {plan.mesocycles.map((meso) => {
            const { color } = resolvePhaseChip(meso.phase);
            const span = meso.week_end - meso.week_start + 1;
            return (
              <div
                key={meso.id}
                className="flex flex-col gap-1 rounded-md px-2 py-2"
                style={{
                  flex: span,
                  background: `color-mix(in srgb, ${color} 16%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`,
                }}
              >
                <PhaseChip phase={meso.phase} />
                <span className="font-mono text-[10px] tabular-nums text-[var(--muted)]">
                  wk {meso.week_start}–{meso.week_end}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Volume sparkline (single series, MEV→MAV ramp) ──────────────────────

function VolumeSparkline({ plan }: { plan: PlanDetail }) {
  const planStart = parseLocalDate(plan.start_date);
  const countByWeek = new Array<number>(plan.weeks).fill(0);
  const deloadWeeks = new Set<number>();
  for (const meso of plan.mesocycles) {
    if (meso.phase === "deload") {
      for (let w = meso.week_start; w <= meso.week_end; w++) deloadWeeks.add(w);
    }
  }
  for (const s of plan.sessions) {
    if (s.session_type === "rest") continue;
    const w = weekNumberForDate(s.scheduled_date, planStart);
    if (w >= 1 && w <= plan.weeks)
      countByWeek[w - 1] = (countByWeek[w - 1] ?? 0) + 1;
  }
  const max = Math.max(1, ...countByWeek);

  return (
    <div>
      <p className="mb-1 font-sans text-xs text-[var(--muted)]">
        weekly volume
      </p>
      <div className="overflow-x-auto">
        <div
          className="flex items-end gap-[3px]"
          style={{ minWidth: "480px", height: "36px" }}
        >
          {countByWeek.map((count, i) => {
            const weekNum = i + 1;
            const isDeload = deloadWeeks.has(weekNum);
            // Deloads read as visible dips (functional §4.1 step 2).
            const displayCount = isDeload ? count / 2 : count;
            const heightPct = Math.max(8, (displayCount / max) * 100);
            return (
              <div
                key={i}
                title={`Week ${weekNum}: ${count} session${
                  count !== 1 ? "s" : ""
                }${isDeload ? " (deload)" : ""}`}
                aria-label={`Week ${weekNum}: ${count} sessions${
                  isDeload ? ", deload" : ""
                }`}
                style={{
                  flex: 1,
                  height: `${heightPct}%`,
                  minWidth: "4px",
                  background: isDeload ? "var(--purple)" : "var(--accent)",
                  opacity: isDeload ? 0.6 : 0.9,
                  borderRadius: "1px 1px 0 0",
                }}
              />
            );
          })}
        </div>
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] tabular-nums text-[var(--muted)]">
        <span>week 1</span>
        <span>week {plan.weeks}</span>
      </div>
    </div>
  );
}

// ── Date strip with dot-density indicator ────────────────────────────────

function DateStrip({
  dates,
  sessionsByDate,
  selectedDate,
  onSelect,
}: {
  dates: Date[];
  sessionsByDate: Map<string, PlannedSessionOut[]>;
  selectedDate: string;
  onSelect: (date: string) => void;
}) {
  const today = todayLocalDateString();

  const selectedIdx = dates.findIndex(
    (d) => localDateString(d) === selectedDate,
  );
  const atStart = selectedIdx <= 0;
  const atEnd = selectedIdx >= dates.length - 1;

  function moveSelection(delta: number) {
    const nextIdx = Math.min(
      dates.length - 1,
      Math.max(0, selectedIdx + delta),
    );
    const next = dates[nextIdx];
    if (next) onSelect(localDateString(next));
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => moveSelection(-1)}
          disabled={atStart}
          aria-label="Previous date"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ border: "1px solid var(--border)", color: "var(--text)" }}
        >
          ‹
        </button>
        <div
          className="flex-1 overflow-x-auto"
          role="listbox"
          aria-label="Plan dates"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") moveSelection(1);
            if (e.key === "ArrowLeft") moveSelection(-1);
          }}
        >
          <div className="flex gap-2" style={{ minWidth: "max-content" }}>
            {dates.map((d) => {
              const key = localDateString(d);
              const sessions = sessionsByDate.get(key) ?? [];
              const isSelected = key === selectedDate;
              const isToday = key === today;
              const count = sessions.filter(
                (s) => s.session_type !== "rest",
              ).length;
              return (
                <button
                  key={key}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => onSelect(key)}
                  aria-label={`${d.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}${
                    count === 0
                      ? ", rest day"
                      : `, ${count} session${count !== 1 ? "s" : ""}`
                  }${isToday ? ", today" : ""}`}
                  className="flex min-w-[52px] flex-col items-center gap-1 rounded-md px-2 py-2"
                  style={{
                    minHeight: "44px",
                    background: isSelected
                      ? "color-mix(in srgb, var(--accent) 16%, transparent)"
                      : "transparent",
                    border: `1px solid ${
                      isSelected
                        ? "var(--accent)"
                        : isToday
                          ? "color-mix(in srgb, var(--accent) 50%, transparent)"
                          : "var(--border)"
                    }`,
                  }}
                >
                  <span className="font-mono text-[10px] uppercase text-[var(--muted)]">
                    {d.toLocaleDateString("en-US", { weekday: "short" })}
                  </span>
                  <span className="font-mono text-xs tabular-nums text-[var(--text)]">
                    {d.getDate()}
                  </span>
                  {/* Dot-density indicator — count encoded visually AND via
                      the aria-label text alternative above (accessibility
                      rule: never encode meaning by visual density alone). */}
                  <span className="flex gap-[2px]" aria-hidden="true">
                    {count === 0 ? (
                      <span
                        className="h-1 w-1 rounded-full"
                        style={{ background: "var(--border)" }}
                      />
                    ) : (
                      Array.from({ length: Math.min(count, 3) }, (_, i) => (
                        <span
                          key={i}
                          className="h-1 w-1 rounded-full"
                          style={{ background: "var(--accent)" }}
                        />
                      ))
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <button
          type="button"
          onClick={() => moveSelection(1)}
          disabled={atEnd}
          aria-label="Next date"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ border: "1px solid var(--border)", color: "var(--text)" }}
        >
          ›
        </button>
      </div>
    </div>
  );
}

// ── Selected-day detail ──────────────────────────────────────────────────

function SelectedDayDetail({
  planId,
  date,
  sessions,
}: {
  planId: string;
  date: string;
  sessions: PlannedSessionOut[];
}) {
  const nonRest = sessions.filter((s) => s.session_type !== "rest");

  if (nonRest.length === 0) {
    return (
      <div
        className="rounded-lg p-4 text-center"
        style={{
          border: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <p className="font-sans text-sm text-[var(--muted)]">
          {formatShortDate(date)} — Rest day
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {nonRest.map((session) => (
        <Link
          key={session.id}
          href={`/plan/${planId}/sessions/${session.id}`}
          className="flex flex-col gap-2 rounded-lg p-4 transition-colors"
          style={{
            border: `1px solid ${
              session.status === "completed"
                ? "color-mix(in srgb, var(--green) 40%, transparent)"
                : "var(--border)"
            }`,
            background:
              session.status === "completed"
                ? "color-mix(in srgb, var(--green) 10%, transparent)"
                : "var(--surface)",
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-sans text-sm font-semibold text-[var(--text)]">
              {session.title}
            </span>
            <SessionTypeChip sessionType={session.session_type} />
          </div>
          <div className="flex flex-col gap-1">
            {session.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 font-mono text-xs tabular-nums"
              >
                <span className="truncate text-[var(--text)]">
                  {item.movement_name}
                </span>
                <span className="shrink-0 text-[var(--muted)]">
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
        </Link>
      ))}
    </div>
  );
}
