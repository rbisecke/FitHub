import type { MesocycleOut } from "@/lib/api/plans";
import { mesoBandColor, mesoForWeek } from "@/lib/plans/mesocycle";

interface Props {
  mesocycles: MesocycleOut[];
  startDate: string; // "YYYY-MM-DD" — plan start, used to compute current week
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Local-date formatter for a "YYYY-MM-DD" plan start date — never parse
// date-only ISO strings with `new Date(iso)` (UTC midnight pitfall).
function formatStartDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Defensive guard: week_end >= week_start is enforced by a DB CHECK
// constraint, so mesoTotalWeeks <= 0 is currently unreachable — but
// Array.from({ length: n }) throws a RangeError for negative n, so guard
// it anyway rather than trust an invariant the component can't see.
export function computeWeekTicks(mesoTotalWeeks: number): number[] {
  return mesoTotalWeeks > 0
    ? Array.from({ length: mesoTotalWeeks }, (_, i) => i)
    : [];
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

  // A future start date must not be clamped into "week 1" — that renders
  // fake partial progress on a plan that hasn't started yet.
  const hasStarted = planStart <= now;

  const daysSinceStart = Math.floor(
    (now.getTime() - planStart.getTime()) / (1000 * 60 * 60 * 24),
  );
  const currentWeek = hasStarted
    ? Math.max(1, Math.floor(daysSinceStart / 7) + 1)
    : 0;

  // Find the mesocycle for the current week, or fall back to the first
  // mesocycle (to show its phase name) when the plan hasn't started yet.
  const currentMeso = hasStarted
    ? mesoForWeek(currentWeek, mesocycles)
    : mesocycles[0];

  if (!currentMeso) return null;

  const mesoIdx = mesocycles.indexOf(currentMeso) + 1;
  const phaseName = currentMeso.phase
    ? capitalize(currentMeso.phase)
    : `Phase ${mesoIdx}`;

  const mesoTotalWeeks = currentMeso.week_end - currentMeso.week_start + 1;
  const weekInMeso = hasStarted ? currentWeek - currentMeso.week_start + 1 : 0;
  const pct = hasStarted
    ? Math.min(100, (weekInMeso / mesoTotalWeeks) * 100)
    : 0;

  // Reuse PlanTimelineRail's phase → color mapping so the two components
  // never disagree about what color a given phase is on the same page.
  const segmentColor = mesoBandColor(currentMeso.phase);
  const weekTicks = computeWeekTicks(mesoTotalWeeks);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-xs text-[var(--muted)]">
          {hasStarted ? (
            <>
              {phaseName} — week{" "}
              <span className="tabular-nums">{weekInMeso}</span> of{" "}
              <span className="tabular-nums">{mesoTotalWeeks}</span>
            </>
          ) : (
            <>
              {phaseName} — starts {formatStartDate(startDate)}
            </>
          )}
        </span>
        <span
          className="font-mono text-xs tabular-nums"
          style={{ color: hasStarted ? "var(--accent)" : "var(--muted)" }}
        >
          {hasStarted ? `${Math.round(pct)}%` : "Not started"}
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
        {weekTicks.map((i) => {
          const weekNum = i + 1;
          const isFilled = hasStarted && weekNum <= weekInMeso;
          const isCurrent = hasStarted && weekNum === weekInMeso;
          return (
            <div
              key={i}
              className={[
                "h-1.5 flex-1 rounded-sm transition-all",
                isFilled
                  ? `${segmentColor} ${
                      isCurrent ? "opacity-100" : "opacity-60"
                    }`
                  : "bg-[var(--border)]",
              ].join(" ")}
            />
          );
        })}
      </div>
    </div>
  );
}
