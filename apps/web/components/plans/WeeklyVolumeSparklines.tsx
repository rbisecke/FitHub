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

  // SVG dimensions
  const SVG_H = 32;
  const BAR_W = 6;
  const BAR_GAP = 2;
  const totalWidth = weeks * (BAR_W + BAR_GAP) - BAR_GAP;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="font-mono text-xs text-[var(--muted)] mb-3">
        weekly volume
      </p>

      <div className="overflow-x-auto">
        <svg
          width="100%"
          viewBox={`0 0 ${totalWidth} ${SVG_H}`}
          preserveAspectRatio="none"
          aria-label="Weekly training volume sparkline"
          role="img"
          style={{
            display: "block",
            minWidth: `${Math.min(totalWidth, 200)}px`,
          }}
        >
          {countByWeek.map((count, i) => {
            const barHeight = Math.max(2, (count / maxCount) * SVG_H);
            const x = i * (BAR_W + BAR_GAP);
            const y = SVG_H - barHeight;
            const isZero = count === 0;

            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={BAR_W}
                height={barHeight}
                rx={1}
                fill={isZero ? "var(--border)" : "var(--accent)"}
                opacity={isZero ? 0.4 : 0.85}
                aria-label={`Week ${i + 1}: ${count} session${
                  count !== 1 ? "s" : ""
                }`}
              />
            );
          })}
        </svg>
      </div>

      <div className="flex justify-between mt-1">
        <span className="font-mono text-[10px] tabular-nums text-[var(--muted)]">
          week 1
        </span>
        <span className="font-mono text-[10px] tabular-nums text-[var(--muted)]">
          week {weeks}
        </span>
      </div>
    </div>
  );
}
