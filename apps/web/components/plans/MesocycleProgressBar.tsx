import type { MesocycleOut } from "@/lib/api/plans";

interface Props {
  mesocycles: MesocycleOut[];
  startDate: string; // "YYYY-MM-DD" — plan start, used to compute current week
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function MesocycleProgressBar({ mesocycles, startDate }: Props) {
  if (mesocycles.length === 0) return null;

  // Compute which week of the plan we are in (1-indexed)
  const [sy, sm, sd] = startDate.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const planStart = new Date(sy, sm - 1, sd);
  planStart.setHours(0, 0, 0, 0);

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const daysSinceStart = Math.floor(
    (now.getTime() - planStart.getTime()) / (1000 * 60 * 60 * 24),
  );
  const currentWeek = Math.max(1, Math.floor(daysSinceStart / 7) + 1);

  // Find the mesocycle that contains the current week
  const currentMeso = mesocycles.find(
    (m) => currentWeek >= m.week_start && currentWeek <= m.week_end,
  );

  if (!currentMeso) return null;

  const mesoIdx = mesocycles.indexOf(currentMeso) + 1;
  const phaseName = currentMeso.phase
    ? capitalize(currentMeso.phase)
    : `Phase ${mesoIdx}`;

  const mesoTotalWeeks = currentMeso.week_end - currentMeso.week_start + 1;
  const weekInMeso = currentWeek - currentMeso.week_start + 1;
  const pct = Math.min(100, (weekInMeso / mesoTotalWeeks) * 100);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-xs text-[var(--muted)]">
          {phaseName} — week <span className="tabular-nums">{weekInMeso}</span>{" "}
          of <span className="tabular-nums">{mesoTotalWeeks}</span>
        </span>
        <span className="font-mono text-xs tabular-nums text-[var(--accent)]">
          {Math.round(pct)}%
        </span>
      </div>

      {/* Segmented bar: one tick per week of the phase */}
      <div
        className="flex gap-0.5"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${phaseName} progress`}
      >
        {Array.from({ length: mesoTotalWeeks }, (_, i) => {
          const weekNum = i + 1;
          const isFilled = weekNum <= weekInMeso;
          const isCurrent = weekNum === weekInMeso;
          return (
            <div
              key={i}
              className={[
                "h-1.5 flex-1 rounded-sm transition-all",
                isFilled
                  ? isCurrent
                    ? "bg-[var(--accent)] opacity-100"
                    : "bg-[var(--accent)] opacity-60"
                  : "bg-[var(--border)]",
              ].join(" ")}
            />
          );
        })}
      </div>
    </div>
  );
}
