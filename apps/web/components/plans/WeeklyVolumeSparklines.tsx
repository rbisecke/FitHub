import type { PlannedSessionOut } from "@/lib/api/plans";

interface Props {
  sessions: PlannedSessionOut[];
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

// Map session count relative to max to a load level.
function loadLevel(
  count: number,
  max: number,
): "light" | "moderate" | "heavy" | "deload" {
  if (count === 0) return "deload";
  const ratio = count / max;
  if (ratio <= 0.4) return "light";
  if (ratio <= 0.7) return "moderate";
  return "heavy";
}

// Map load level to token color string.
const LOAD_COLOR: Record<string, string> = {
  light: "var(--accent)",
  moderate: "var(--green)",
  heavy: "var(--amber)",
  deload: "var(--amber)",
};

const LEGEND_ITEMS: { level: string; label: string }[] = [
  { level: "light", label: "Light" },
  { level: "moderate", label: "Moderate" },
  { level: "heavy", label: "Heavy" },
  { level: "deload", label: "Deload" },
];

export function WeeklyVolumeSparklines({ sessions, startDate, weeks }: Props) {
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
            const level = loadLevel(count, maxCount);
            const color = LOAD_COLOR[level] ?? "var(--border)";
            const isCurrentWeek = weekNum === thisWeek;
            const isDeload = count === 0;
            const heightPct = Math.max(6, (count / maxCount) * 100);

            return (
              <div
                key={i}
                title={`Week ${weekNum}: ${count} session${
                  count !== 1 ? "s" : ""
                }`}
                aria-label={`Week ${weekNum}: ${count} session${
                  count !== 1 ? "s" : ""
                }`}
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
                {isDeload ? (
                  // Deload: dashed amber pattern (empty week)
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
