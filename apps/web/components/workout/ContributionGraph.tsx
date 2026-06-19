"use client";

import type { WorkoutSummary } from "@/lib/api/types";

// Static class names required — Tailwind JIT can't purge dynamically constructed strings.
const CELL_CLASSES = {
  empty: "bg-zinc-800",
  solo: ["bg-green-900", "bg-green-700", "bg-green-500"],
  partner: ["bg-amber-900", "bg-amber-700", "bg-amber-500"],
} as const;

function cellClass(count: number, partner: boolean): string {
  if (count === 0) return CELL_CLASSES.empty;
  const palette = partner ? CELL_CLASSES.partner : CELL_CLASSES.solo;
  if (count === 1) return palette[0];
  if (count === 2) return palette[1];
  return palette[2];
}

export function ContributionGraph({
  workouts,
}: {
  workouts: WorkoutSummary[];
}) {
  // Build date → {count, hasPartner} map
  const byDate = new Map<string, { count: number; partner: boolean }>();
  for (const w of workouts) {
    // "sv" locale produces YYYY-MM-DD which is what we want
    const date = new Date(w.performed_at).toLocaleDateString("sv");
    const prev = byDate.get(date) ?? { count: 0, partner: false };
    byDate.set(date, {
      count: prev.count + 1,
      partner:
        prev.partner ||
        w.workout_format === "partner" ||
        w.workout_format === "team",
    });
  }

  // Generate 365 days (52 complete weeks + up to 1 extra) ending today
  const today = new Date();
  const cells: { date: string; count: number; partner: boolean }[] = [];
  for (let d = -364; d <= 0; d++) {
    const dt = new Date(today);
    dt.setDate(today.getDate() + d);
    const key = dt.toLocaleDateString("sv");
    const data = byDate.get(key) ?? { count: 0, partner: false };
    cells.push({ date: key, ...data });
  }

  // Split into 52 columns of 7 days each (oldest first per column)
  const weeks: (typeof cells)[] = [];
  for (let w = 0; w < 53; w++) {
    weeks.push(cells.slice(w * 7, w * 7 + 7));
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-0.5" aria-label="Contribution graph">
        {weeks.map((week, wi) =>
          week.length > 0 ? (
            <div key={wi} className="flex flex-col gap-0.5">
              {week.map((c) => (
                <div
                  key={c.date}
                  title={`${c.date}: ${c.count} workout${
                    c.count !== 1 ? "s" : ""
                  }`}
                  className={`w-3 h-3 rounded-sm transition-opacity ${cellClass(
                    c.count,
                    c.partner,
                  )}`}
                />
              ))}
            </div>
          ) : null,
        )}
      </div>
      <div className="flex items-center gap-2 mt-2 text-xs text-zinc-600">
        <div className="w-3 h-3 rounded-sm bg-zinc-800" />
        <span>No training</span>
        <div className="w-3 h-3 rounded-sm bg-green-700" />
        <span>Solo</span>
        <div className="w-3 h-3 rounded-sm bg-amber-700" />
        <span>Partner</span>
      </div>
    </div>
  );
}
