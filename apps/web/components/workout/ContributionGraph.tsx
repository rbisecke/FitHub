"use client";

import type { WorkoutSummary } from "@/lib/api";

// Static class names required — Tailwind JIT won't emit dynamically constructed strings.
// Hue = session type, lightness bucket = perceived load AU:
//   bucket 0 (<150): very dim — light day or no load data
//   bucket 1 (150-400): mid — typical training session
//   bucket 2 (400+): bright — heavy/long session
type Palette = readonly [string, string, string];

const SESSION_HUE: Record<string, Palette> = {
  strength: ["bg-blue-950", "bg-blue-700", "bg-blue-500"],
  metcon: ["bg-amber-950", "bg-amber-700", "bg-amber-500"],
  skill: ["bg-purple-950", "bg-purple-700", "bg-purple-500"],
  mixed: ["bg-teal-950", "bg-teal-700", "bg-teal-500"],
  rest: ["bg-zinc-700", "bg-zinc-700", "bg-zinc-700"],
  active_recovery: ["bg-zinc-700", "bg-zinc-700", "bg-zinc-700"],
  deload: ["bg-zinc-700", "bg-zinc-700", "bg-zinc-700"],
};

const FALLBACK_PALETTE: Palette = [
  "bg-amber-950",
  "bg-amber-700",
  "bg-amber-500",
];
const EMPTY_CLASS = "bg-zinc-800";

function loadBucket(au: number): 0 | 1 | 2 {
  if (au < 150) return 0;
  if (au < 400) return 1;
  return 2;
}

function cellClass(
  totalLoad: number,
  dominantType: string | null,
  hasWorkout: boolean,
): string {
  if (!hasWorkout || !dominantType) return EMPTY_CLASS;
  const palette: Palette = SESSION_HUE[dominantType] ?? FALLBACK_PALETTE;
  return palette[loadBucket(totalLoad)];
}

export function ContributionGraph({
  workouts,
}: {
  workouts: WorkoutSummary[];
}) {
  const byDate = new Map<
    string,
    {
      totalLoad: number;
      dominantType: string | null;
      topLoad: number;
      hasWorkout: boolean;
    }
  >();

  for (const w of workouts) {
    const date = w.performed_at.slice(0, 10);
    const prev = byDate.get(date) ?? {
      totalLoad: 0,
      dominantType: null,
      topLoad: -1,
      hasWorkout: false,
    };
    const wLoad = w.perceived_load_au ?? 0;
    byDate.set(date, {
      totalLoad: prev.totalLoad + wLoad,
      dominantType:
        wLoad > prev.topLoad
          ? w.session_type ?? "metcon"
          : prev.dominantType ?? w.session_type ?? "metcon",
      topLoad: Math.max(prev.topLoad, wLoad),
      hasWorkout: true,
    });
  }

  const today = new Date();
  const cells: {
    date: string;
    totalLoad: number;
    dominantType: string | null;
    hasWorkout: boolean;
  }[] = [];

  for (let day = -364; day <= 0; day++) {
    const dt = new Date(today);
    dt.setDate(today.getDate() + day);
    const key = dt.toLocaleDateString("sv"); // YYYY-MM-DD local date
    const data = byDate.get(key) ?? {
      totalLoad: 0,
      dominantType: null,
      hasWorkout: false,
    };
    cells.push({
      date: key,
      totalLoad: data.totalLoad,
      dominantType: data.dominantType,
      hasWorkout: data.hasWorkout,
    });
  }

  const weeks: (typeof cells)[] = [];
  for (let w = 0; w < 53; w++) {
    weeks.push(cells.slice(w * 7, w * 7 + 7));
  }

  // Month labels: track the first column that starts each calendar month
  const monthLabels = new Map<number, string>();
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const firstDay = week[0]?.date;
    if (!firstDay) return;
    const parts = firstDay.split("-").map(Number);
    const monthIdx = (parts[1] ?? 1) - 1;
    if (monthIdx !== lastMonth) {
      monthLabels.set(
        wi,
        new Date(parts[0] ?? 2025, monthIdx, parts[2] ?? 1).toLocaleDateString(
          "en-US",
          {
            month: "short",
          },
        ),
      );
      lastMonth = monthIdx;
    }
  });

  return (
    <div className="overflow-x-auto">
      {/* Month label row */}
      <div className="flex gap-0.5 mb-1 h-3">
        {weeks.map((week, wi) =>
          week.length > 0 ? (
            <div key={wi} className="w-3 flex-shrink-0 relative">
              {monthLabels.has(wi) && (
                <span className="absolute left-0 top-0 text-[9px] leading-3 text-zinc-500 whitespace-nowrap font-mono">
                  {monthLabels.get(wi)}
                </span>
              )}
            </div>
          ) : null,
        )}
      </div>

      {/* Graph */}
      <div className="flex gap-0.5" aria-label="Training contribution graph">
        {weeks.map((week, wi) =>
          week.length > 0 ? (
            <div key={wi} className="flex flex-col gap-0.5">
              {week.map((c) => {
                const cls = cellClass(
                  c.totalLoad,
                  c.dominantType,
                  c.hasWorkout,
                );
                const loadStr =
                  c.hasWorkout && c.totalLoad === 0
                    ? "no load logged"
                    : `Load ${c.totalLoad} AU`;
                const label = c.hasWorkout
                  ? `${c.date}: ${c.dominantType ?? "workout"} · ${loadStr}`
                  : `${c.date}: no training`;
                return (
                  <div
                    key={c.date}
                    title={label}
                    aria-label={label}
                    className={`w-3 h-3 rounded-sm transition-opacity ${cls}`}
                  />
                );
              })}
            </div>
          ) : null,
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-zinc-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-zinc-800" />
          <span>No training</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-blue-700" />
          <span>Strength</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-amber-700" />
          <span>Metcon</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-purple-700" />
          <span>Skill</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-teal-700" />
          <span>Mixed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-zinc-700" />
          <span>Rest</span>
        </div>
        <span className="text-zinc-600 ml-1">
          · Dimmer = lighter load · Brighter = heavier
        </span>
      </div>
    </div>
  );
}
