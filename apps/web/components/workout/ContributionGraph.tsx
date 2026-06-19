"use client";

import type { WorkoutSummary } from "@/lib/api/types";

// Static class names required — Tailwind JIT won't emit dynamically constructed strings.
// Hue = session type, lightness = perceived load (AU thresholds: <80 easy, 80-200 moderate, 200+ heavy)
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

// Fallback palette when session_type is unknown — use metcon (amber)
const FALLBACK_PALETTE: Palette = [
  "bg-amber-950",
  "bg-amber-700",
  "bg-amber-500",
];

const EMPTY_CLASS = "bg-zinc-800";

function loadBucket(au: number): 0 | 1 | 2 {
  if (au < 80) return 0;
  if (au < 200) return 1;
  return 2;
}

function cellClass(totalLoad: number, dominantType: string | null): string {
  if (totalLoad === 0 || !dominantType) return EMPTY_CLASS;
  const palette: Palette = SESSION_HUE[dominantType] ?? FALLBACK_PALETTE;
  return palette[loadBucket(totalLoad)];
}

export function ContributionGraph({
  workouts,
}: {
  workouts: WorkoutSummary[];
}) {
  // Build date → { totalLoad, dominantType } map.
  // dominantType = session_type of the single workout with the highest perceived_load_au.
  // Using performed_at.slice(0,10) avoids the UTC-midnight → previous-local-day bug.
  const byDate = new Map<
    string,
    { totalLoad: number; dominantType: string | null; topLoad: number }
  >();
  for (const w of workouts) {
    const date = w.performed_at.slice(0, 10);
    const prev = byDate.get(date) ?? {
      totalLoad: 0,
      dominantType: null,
      topLoad: -1,
    };
    const wLoad = w.perceived_load_au ?? 0;
    byDate.set(date, {
      totalLoad: prev.totalLoad + wLoad,
      dominantType:
        wLoad > prev.topLoad
          ? w.session_type ?? "metcon"
          : prev.dominantType ?? w.session_type ?? "metcon",
      topLoad: Math.max(prev.topLoad, wLoad),
    });
  }

  // Generate 365 days ending today, split into 53 columns of 7.
  const today = new Date();
  const cells: {
    date: string;
    totalLoad: number;
    dominantType: string | null;
  }[] = [];
  for (let day = -364; day <= 0; day++) {
    const dt = new Date(today);
    dt.setDate(today.getDate() + day);
    const key = dt.toLocaleDateString("sv"); // YYYY-MM-DD local date
    const data = byDate.get(key) ?? { totalLoad: 0, dominantType: null };
    cells.push({
      date: key,
      totalLoad: data.totalLoad,
      dominantType: data.dominantType,
    });
  }

  const weeks: (typeof cells)[] = [];
  for (let w = 0; w < 53; w++) {
    weeks.push(cells.slice(w * 7, w * 7 + 7));
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-0.5" aria-label="Training contribution graph">
        {weeks.map((week, wi) =>
          week.length > 0 ? (
            <div key={wi} className="flex flex-col gap-0.5">
              {week.map((c) => {
                const cls = cellClass(c.totalLoad, c.dominantType);
                const label =
                  c.totalLoad > 0
                    ? `${c.date}: ${c.dominantType ?? "workout"} · Load ${
                        c.totalLoad
                      }`
                    : `${c.date}: no training`;
                return (
                  <div
                    key={c.date}
                    title={label}
                    className={`w-3 h-3 rounded-sm transition-opacity ${cls}`}
                  />
                );
              })}
            </div>
          ) : null,
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-zinc-600">
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
        <span className="text-zinc-700">
          · Darker = easier · Brighter = heavier load
        </span>
      </div>
    </div>
  );
}
