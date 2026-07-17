import type { MesocycleOut } from "@/lib/api/plans";

/**
 * Find the mesocycle that contains a given 1-indexed plan week.
 * Single source of truth for "which phase is week N in" — reused by
 * MesocycleProgressBar, PlanTimelineRail, and WeeklyVolumeSparklines so
 * they never disagree about phase boundaries for the same plan.
 */
export function mesoForWeek(
  weekNumber: number,
  mesocycles: MesocycleOut[],
): MesocycleOut | undefined {
  return mesocycles.find(
    (m) => weekNumber >= m.week_start && weekNumber <= m.week_end,
  );
}

/** Look up the mesocycle phase for a given 1-indexed plan week. */
export function mesoPhaseForWeek(
  weekNumber: number,
  mesocycles: MesocycleOut[],
): MesocycleOut["phase"] | undefined {
  return mesoForWeek(weekNumber, mesocycles)?.phase;
}

/** Map a mesocycle phase to its design-system Tailwind background class. */
export function mesoBandColor(phase: string | undefined | null): string {
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
