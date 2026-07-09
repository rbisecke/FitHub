import type { PlannedSessionOut, MesocycleOut } from "@/lib/api/plans";

interface Props {
  sessions: PlannedSessionOut[];
  mesocycles: MesocycleOut[];
  startDate: string; // "YYYY-MM-DD"
  weeks: number;
}

function mesoBandColor(phase: string | undefined | null): string {
  switch (phase) {
    case "accumulation":
      return "bg-[var(--green)]";
    case "intensification":
      return "bg-[var(--amber)]";
    case "peak":
    case "realization":
      return "bg-[var(--red)]";
    case "deload":
      return "bg-[var(--purple)]";
    default:
      return "bg-[var(--muted)]";
  }
}

function todayDateStr(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(t.getDate()).padStart(2, "0")}`;
}

export function PlanTimelineRail({
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
  const totalDays = weeks * 7;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayPct = Math.min(
    100,
    Math.max(
      0,
      ((today.getTime() - planStart.getTime()) /
        (1000 * 60 * 60 * 24 * totalDays)) *
        100,
    ),
  );

  const todayStr = todayDateStr();

  // Compute mesocycle band positions using week_start / week_end (1-indexed)
  const mesoSegments = mesocycles.map((meso) => {
    const left = ((meso.week_start - 1) / weeks) * 100;
    const width = ((meso.week_end - meso.week_start + 1) / weeks) * 100;
    return { meso, left, width };
  });

  // Compute session dot positions
  const sessionDots = sessions
    .filter((s) => s.session_type !== "rest")
    .map((s) => {
      const [py, pm, pd] = s.scheduled_date.split("-").map(Number) as [
        number,
        number,
        number,
      ];
      const sessionDate = new Date(py, pm - 1, pd);
      const pct = Math.min(
        100,
        Math.max(
          0,
          ((sessionDate.getTime() - planStart.getTime()) /
            (1000 * 60 * 60 * 24 * totalDays)) *
            100,
        ),
      );
      const isToday = s.scheduled_date === todayStr;
      const isCompleted = s.status === "completed";
      return { s, pct, isToday, isCompleted };
    });

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="font-mono text-xs text-[var(--muted)] mb-3">
        plan timeline
      </p>

      {/* Phase label row — hidden on very small screens to avoid overflow */}
      {mesocycles.length > 0 && (
        <div className="relative h-4 mb-1 hidden sm:block">
          {mesoSegments.map(({ meso, left, width }, i) => (
            <div
              key={meso.id ?? i}
              style={{ left: `${left}%`, width: `${width}%` }}
              className="absolute inset-y-0 flex items-center px-1 overflow-hidden"
            >
              <span className="font-mono text-[9px] text-[var(--muted)] truncate uppercase tracking-wide">
                {meso.name}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Timeline bar with phase bands */}
      <div
        className="relative h-3 rounded-full bg-[var(--border)] overflow-hidden"
        role="img"
        aria-label={`Plan timeline: ${weeks} weeks`}
      >
        {mesoSegments.map(({ meso, left, width }, i) => (
          <div
            key={meso.id ?? i}
            style={{ left: `${left}%`, width: `${width}%` }}
            className={
              "absolute inset-y-0 opacity-30 " + mesoBandColor(meso.phase)
            }
          />
        ))}

        {/* Today marker */}
        {todayPct >= 0 && todayPct <= 100 && (
          <div
            style={{ left: `${todayPct}%` }}
            className="absolute inset-y-0 w-0.5 bg-[var(--accent)] z-10"
            aria-label="Today"
          />
        )}
      </div>

      {/* Session dots below the bar */}
      <div className="relative h-4 mt-1" aria-hidden="true">
        {sessionDots.map(({ s, pct, isToday, isCompleted }) => (
          <div
            key={s.id}
            title={`${s.scheduled_date} — ${s.title}${
              isCompleted ? " (completed)" : ""
            }`}
            style={{ left: `${pct}%` }}
            className={[
              "absolute top-1 w-1.5 h-1.5 rounded-full -translate-x-1/2",
              isToday
                ? "bg-[var(--accent)] scale-125"
                : isCompleted
                  ? "bg-[var(--green)]"
                  : "bg-[var(--border)]",
            ].join(" ")}
          />
        ))}
      </div>

      {/* Week ruler — first and last */}
      <div className="flex justify-between mt-2">
        <span className="font-mono text-[10px] tabular-nums text-[var(--muted)]">
          w1
        </span>
        <span className="font-mono text-[10px] tabular-nums text-[var(--muted)]">
          w{weeks}
        </span>
      </div>
    </div>
  );
}
