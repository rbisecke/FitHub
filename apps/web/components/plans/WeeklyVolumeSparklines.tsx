import type { PlannedSessionOut, MesocycleOut } from "@/lib/api/plans";
import { mesoPhaseForWeek } from "@/lib/plans/mesocycle";

interface Props {
  sessions: PlannedSessionOut[];
  mesocycles: MesocycleOut[];
  startDate: string; // "YYYY-MM-DD" — plan start date
  weeks: number;
}

// Derive the 1-indexed week number for a session given the plan start date.
// Uses local date parts to avoid UTC midnight pitfalls.
function sessionWeek(scheduledDate: string, planStart: Date): number {
  const [py, pm, pd] = scheduledDate.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const d = new Date(py, pm - 1, pd);
  const dayDiff = Math.floor(
    (d.getTime() - planStart.getTime()) / (1000 * 60 * 60 * 24),
  );
  return Math.max(1, Math.floor(dayDiff / 7) + 1);
}

// Derive the current plan week (1-indexed) based on today's date.
function currentPlanWeek(planStart: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayDiff = Math.floor(
    (today.getTime() - planStart.getTime()) / (1000 * 60 * 60 * 24),
  );
  return Math.max(1, Math.floor(dayDiff / 7) + 1);
}

type LoadLevel = "light" | "moderate" | "heavy" | "deload" | "none";

// A week's label is driven by the real mesocycle phase, not a session-count
// heuristic — "Deload" means the plan's actual deload phase, never just "we
// happened to schedule nothing here." A zero-session week outside a real
// deload phase gets the neutral "None" label instead.
function loadLevel(
  weekNumber: number,
  count: number,
  max: number,
  mesocycles: MesocycleOut[],
): LoadLevel {
  const phase = mesoPhaseForWeek(weekNumber, mesocycles);
  if (phase === "deload") return "deload";
  if (count === 0) return "none";
  const ratio = count / max;
  if (ratio <= 0.4) return "light";
  if (ratio <= 0.7) return "moderate";
  return "heavy";
}

// Single source of truth for level → color/label, shared by the bars and
// the legend so they can never drift out of sync with each other.
const LOAD_LEVELS: { level: LoadLevel; label: string; color: string }[] = [
  { level: "light", label: "Light", color: "var(--accent)" },
  { level: "moderate", label: "Moderate", color: "var(--green)" },
  { level: "heavy", label: "Heavy", color: "var(--amber)" },
  { level: "deload", label: "Deload", color: "var(--purple)" },
  { level: "none", label: "None", color: "var(--muted)" },
];

const LOAD_COLOR: Record<LoadLevel, string> = LOAD_LEVELS.reduce(
  (acc, { level, color }) => ({ ...acc, [level]: color }),
  {} as Record<LoadLevel, string>,
);

const LOAD_LABEL: Record<LoadLevel, string> = LOAD_LEVELS.reduce(
  (acc, { level, label }) => ({ ...acc, [level]: label }),
  {} as Record<LoadLevel, string>,
);

const LEGEND_ITEMS = LOAD_LEVELS;

export function WeeklyVolumeSparklines({
  sessions,
  mesocycles,
  startDate,
  weeks,
}: Props) {
  const [sy, sm, sd] = startDate.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const planStart = new Date(sy, sm - 1, sd);

  // Count non-rest sessions per week
  const countByWeek = new Array<number>(weeks).fill(0);
  for (const s of sessions) {
    if (s.session_type === "rest") continue;
    const w = sessionWeek(s.scheduled_date, planStart);
    if (w >= 1 && w <= weeks) {
      (countByWeek[w - 1] as number) += 1;
    }
  }

  const maxCount = countByWeek.reduce((a, b) => Math.max(a, b), 1);
  const thisWeek = currentPlanWeek(planStart);

  // Bar dimensions
  const SVG_H = 32;
  const BAR_W = 6;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="font-mono text-xs text-[var(--muted)] mb-3">
        weekly volume
      </p>

      <div className="overflow-x-auto">
        <div style={{ display: "flex", gap: "2px", alignItems: "flex-end" }}>
          {countByWeek.map((count, i) => {
            const weekNum = i + 1;
            const level = loadLevel(weekNum, count, maxCount, mesocycles);
            const color = LOAD_COLOR[level] ?? "var(--border)";
            const isCurrentWeek = weekNum === thisWeek;
            const isEmpty = count === 0;
            const heightPct = Math.max(6, (count / maxCount) * 100);

            return (
              <div
                key={i}
                title={`Week ${weekNum}: ${count} session${
                  count !== 1 ? "s" : ""
                } — ${LOAD_LABEL[level]}`}
                aria-label={`Week ${weekNum}: ${count} session${
                  count !== 1 ? "s" : ""
                } — ${LOAD_LABEL[level]}`}
                style={{
                  width: `${BAR_W}px`,
                  height: `${SVG_H}px`,
                  display: "flex",
                  alignItems: "flex-end",
                  outline: isCurrentWeek ? `2px solid var(--accent)` : "none",
                  outlineOffset: "1px",
                  borderRadius: "2px",
                }}
              >
                {isEmpty ? (
                  // No sessions scheduled: dashed pattern in the level's
                  // color — purple for a real deload week, muted for a gap.
                  <div
                    style={{
                      width: "100%",
                      height: "4px",
                      background: `repeating-linear-gradient(90deg, ${color} 0px, ${color} 2px, transparent 2px, transparent 4px)`,
                      opacity: 0.6,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: `${heightPct}%`,
                      background: color,
                      borderRadius: "1px 1px 0 0",
                      opacity: 0.85,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between mt-1">
        <span className="font-mono text-[10px] tabular-nums text-[var(--muted)]">
          week 1
        </span>
        <span className="font-mono text-[10px] tabular-nums text-[var(--muted)]">
          week {weeks}
        </span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 flex-wrap">
        {LEGEND_ITEMS.map(({ level, label }) => (
          <div key={level} className="flex items-center gap-1">
            <span
              aria-hidden="true"
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: 2,
                background: LOAD_COLOR[level],
                opacity: 0.85,
              }}
            />
            <span
              className="font-data text-[10px]"
              style={{ color: "var(--muted)" }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
