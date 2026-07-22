"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Snowflake, Moon } from "lucide-react";
import { createApiClient } from "@/lib/api/client";
import {
  gapFillContributions,
  type ContributionDay,
} from "@/lib/analytics/contributions";
import {
  fetchPlannedRestMap,
  type PlannedRestKind,
} from "@/lib/dashboard/plannedRestMap";
import { formatLocalDate } from "@/lib/units";

const CELL = 11;
const GAP = 3;
const WEEKS = 53;
const DAY_LABEL_WIDTH = 26;
// Comfortably covers the 53-week (371-day) grid plus the up-to-6-day slack
// between "today" and the Monday that starts the current column.
const FETCH_DAYS = 380;

const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

type CellKind = "future" | "logged" | "freeze" | "rest" | "deload" | "empty";

interface Cell {
  key: string;
  dateKey: string | null;
  kind: CellKind;
  count: number;
  loadAu: number;
}

interface Column {
  key: string;
  monthLabel: string | null;
  cells: Cell[];
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function mondayOf(d: Date): Date {
  const dow = d.getDay(); // 0=Sun..6=Sat
  const sinceMonday = (dow + 6) % 7;
  return addDays(d, -sinceMonday);
}

function humanDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function cellDetail(cell: Cell): string {
  if (!cell.dateKey) return "";
  const date = humanDate(cell.dateKey);
  switch (cell.kind) {
    case "logged":
      return `${date} — ${cell.count} ${
        cell.count === 1 ? "workout" : "workouts"
      } · load ${Math.round(cell.loadAu)}`;
    case "freeze":
      return `${date} — Freeze used, this week was protected`;
    case "rest":
      return `${date} — Rest day, planned`;
    case "deload":
      return `${date} — Deload day, planned`;
    case "empty":
      return `${date} — No training logged`;
    default:
      return date;
  }
}

function buildColumns(
  days: Map<string, ContributionDay>,
  restMap: Map<string, PlannedRestKind>,
  today: Date,
  freezeConsumedThisWeek: boolean,
): Column[] {
  const currentMonday = mondayOf(today);
  const gridStart = addDays(currentMonday, -(WEEKS - 1) * 7);

  // Best-effort freeze visualization (07 §G open item): the streak endpoint
  // only exposes `freeze_consumed_this_week` (a boolean for "was one
  // consumed reconciling the most recently closed week"), not a historical
  // per-week ledger of every freeze ever used — there's no endpoint for
  // that today. So only the most recently closed week (the one directly
  // before the current partial week) can get the frost/snowflake treatment;
  // freezes consumed further back in history render as plain empty cells.
  // Flagged here as a real gap for a future backend fast-follow (a
  // `streak_freeze_events` history endpoint), not silently worked around.
  const freezeWeekStart = addDays(currentMonday, -7);
  const freezeWeekEnd = addDays(currentMonday, -1);

  const columns: Column[] = [];
  let prevMonth = -1;

  for (let col = 0; col < WEEKS; col++) {
    const colMonday = addDays(gridStart, col * 7);
    const cells: Cell[] = [];

    for (let row = 0; row < 7; row++) {
      const date = addDays(colMonday, row);
      if (date > today) {
        cells.push({
          key: `future-${col}-${row}`,
          dateKey: null,
          kind: "future",
          count: 0,
          loadAu: 0,
        });
        continue;
      }
      const dateKey = formatLocalDate(date);
      const day = days.get(dateKey);
      const logged = (day?.count ?? 0) > 0;
      const restKind = restMap.get(dateKey);

      let kind: CellKind;
      if (logged) {
        kind = "logged";
      } else if (restKind) {
        kind = restKind;
      } else if (
        freezeConsumedThisWeek &&
        date >= freezeWeekStart &&
        date <= freezeWeekEnd
      ) {
        kind = "freeze";
      } else {
        kind = "empty";
      }

      cells.push({
        key: dateKey,
        dateKey,
        kind,
        count: day?.count ?? 0,
        loadAu: day?.load_au ?? 0,
      });
    }

    const month = colMonday.getMonth();
    const monthLabel = month !== prevMonth ? MONTH_NAMES[month]! : null;
    prevMonth = month;

    columns.push({ key: `col-${col}`, monthLabel, cells });
  }

  return columns;
}

const KIND_STYLE: Record<
  CellKind,
  { className: string; icon: "snowflake" | "moon" | null }
> = {
  future: { className: "opacity-0", icon: null },
  logged: { className: "bg-[var(--cyan)]", icon: null },
  freeze: {
    className: "bg-[var(--frost)]/30 text-[var(--frost)]",
    icon: "snowflake",
  },
  rest: { className: "bg-[var(--frost)]/30 text-[var(--frost)]", icon: "moon" },
  deload: {
    className: "bg-[var(--frost)]/30 text-[var(--frost)]",
    icon: "moon",
  },
  empty: { className: "bg-[var(--surface-2)]", icon: null },
};

interface ContributionGraphProps {
  accessToken: string;
  freezeConsumedThisWeek: boolean;
}

/**
 * The consistency/contribution graph (07 §G) — Variant A (binary), the
 * Bible's mandated default. Variant B (volume-graded, opt-in) is out of
 * scope for this pass; ambiguity between "a great day" and "an overtraining
 * spike" is exactly why the Bible names binary the safer default, and this
 * domain's effort budget went to shipping that default solidly (streak
 * display, this graph, the PR banner) rather than the stretch toggle.
 */
export function ContributionGraph({
  accessToken,
  freezeConsumedThisWeek,
}: ContributionGraphProps) {
  const [status, setStatus] = useState<"loading" | "error" | "ready">(
    "loading",
  );
  const [columns, setColumns] = useState<Column[] | null>(null);
  const [activeCell, setActiveCell] = useState<Cell | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const client = createApiClient(accessToken);
    const today = new Date();
    const currentMonday = mondayOf(today);
    const gridStartDate = addDays(currentMonday, -(WEEKS - 1) * 7);
    const fromDate = formatLocalDate(gridStartDate);
    const toDate = formatLocalDate(today);

    Promise.all([
      client.analytics.contributions(FETCH_DAYS, { signal: controller.signal }),
      fetchPlannedRestMap(client, fromDate, toDate, controller.signal),
    ])
      .then(([contributionsRes, restMap]) => {
        if (cancelled) return;
        const dayList = gapFillContributions(
          contributionsRes,
          FETCH_DAYS,
          today,
        );
        const dayMap = new Map(dayList.map((d) => [d.day, d]));
        setColumns(
          buildColumns(dayMap, restMap, today, freezeConsumedThisWeek),
        );
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled || controller.signal.aborted) return;
        setStatus("error");
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [accessToken, freezeConsumedThisWeek, retryToken]);

  // Mobile (< 768px): most-recent week pinned to the right edge, auto-scrolled
  // into view on mount (07 §G responsive behavior). Harmless no-op when the
  // grid already fits (desktop) — there's nothing to scroll.
  useEffect(() => {
    if (status === "ready" && scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [status]);

  const gridWidth = useMemo(() => WEEKS * (CELL + GAP) - GAP, []);

  if (status === "error") {
    return (
      <div
        className="rounded-lg border p-4 text-center"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <p className="mb-2 font-sans text-sm text-[var(--muted)]">
          Couldn&apos;t load your training history.
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus("loading");
            setRetryToken((n) => n + 1);
          }}
          className="rounded-[6px] border px-3 py-1.5 font-sans text-xs"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (status === "loading" || !columns) {
    return (
      <div
        className="rounded-lg border p-4"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="overflow-x-auto" aria-hidden="true">
          <div
            className="flex animate-pulse"
            style={{ gap: GAP, width: gridWidth }}
          >
            {Array.from({ length: WEEKS }).map((_, col) => (
              <div key={col} className="flex flex-col" style={{ gap: GAP }}>
                {Array.from({ length: 7 }).map((_, row) => (
                  <div
                    key={row}
                    className="rounded-[2px] bg-[var(--surface-2)]"
                    style={{ width: CELL, height: CELL }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border p-4"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <div
        ref={scrollRef}
        className="overflow-x-auto"
        data-testid="contribution-graph"
      >
        <div style={{ minWidth: gridWidth + DAY_LABEL_WIDTH }}>
          {/* Month labels row */}
          <div
            className="flex"
            style={{ gap: GAP, marginLeft: DAY_LABEL_WIDTH, marginBottom: 4 }}
          >
            {columns.map((col) => (
              <div
                key={col.key}
                className="shrink-0 font-mono text-[9px] text-[var(--muted)]"
                style={{ width: CELL }}
              >
                {col.monthLabel}
              </div>
            ))}
          </div>

          <div className="flex" style={{ gap: GAP }}>
            {/* Day-of-week labels (Mon/Wed/Fri) */}
            <div
              className="flex shrink-0 flex-col"
              style={{ gap: GAP, width: DAY_LABEL_WIDTH - GAP }}
            >
              {DAY_LABELS.map((label, i) => (
                <div
                  key={i}
                  className="font-mono text-[9px] leading-[11px] text-[var(--muted)]"
                  style={{ height: CELL }}
                >
                  {label}
                </div>
              ))}
            </div>

            {columns.map((col) => (
              <div key={col.key} className="flex flex-col" style={{ gap: GAP }}>
                {col.cells.map((cell) => {
                  const style = KIND_STYLE[cell.kind];
                  const Icon =
                    style.icon === "snowflake"
                      ? Snowflake
                      : style.icon === "moon"
                        ? Moon
                        : null;
                  if (cell.kind === "future") {
                    return (
                      <div
                        key={cell.key}
                        aria-hidden="true"
                        style={{ width: CELL, height: CELL }}
                      />
                    );
                  }
                  return (
                    <button
                      key={cell.key}
                      type="button"
                      className={`rounded-[2px] transition-opacity flex items-center justify-center ${style.className}`}
                      style={{ width: CELL, height: CELL }}
                      onMouseEnter={() => setActiveCell(cell)}
                      onFocus={() => setActiveCell(cell)}
                      onClick={() => setActiveCell(cell)}
                      aria-label={cellDetail(cell)}
                      title={cellDetail(cell)}
                    >
                      {Icon && (
                        <Icon
                          style={{ width: 7, height: 7 }}
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <p
        aria-live="polite"
        className="mt-3 min-h-[1rem] font-mono text-xs text-[var(--muted)]"
      >
        {activeCell ? cellDetail(activeCell) : "Tap or hover a day for details"}
      </p>
    </div>
  );
}
