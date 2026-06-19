import type { ResultType, SessionType, WorkoutFormat } from "@/lib/api/types";

export const FORMAT_LABELS: Record<WorkoutFormat, string> = {
  strength: "Strength",
  amrap: "AMRAP",
  emom: "EMOM",
  for_time: "For Time",
  tabata: "Tabata",
  intervals: "Intervals",
  chipper: "Chipper",
  benchmark: "Benchmark",
  open: "Open WOD",
  partner: "Partner",
  team: "Team",
};

export const SESSION_LABELS: Record<SessionType, string> = {
  strength: "Strength",
  metcon: "Metcon",
  skill: "Skill",
  mixed: "Mixed",
  rest: "Rest",
  deload: "Deload",
  active_recovery: "Active Recovery",
};

export const RESULT_TYPE_LABELS: Record<ResultType, string> = {
  weight: "Weight",
  reps: "Reps",
  time: "Time",
  distance: "Distance",
  calories: "Calories",
  height: "Height",
  rounds_reps: "Rounds + Reps",
  pace: "Pace",
  watts: "Watts",
};

export function formatLabel(key: string | null | undefined): string {
  if (!key) return "";
  return (
    FORMAT_LABELS[key as WorkoutFormat] ??
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function sessionLabel(key: string | null | undefined): string {
  if (!key) return "";
  return SESSION_LABELS[key as SessionType] ?? key;
}

/** Returns the load as a plain number string, or "" when absent/zero. */
export function loadDisplay(au: number | null | undefined): string {
  if (au == null || au === 0) return "";
  return String(Math.round(au));
}

/**
 * Returns a human-friendly relative date label from a "YYYY-MM-DD" string:
 *   "Today" / "Yesterday" / weekday name / "Jun 18" / "Jun 18, 2025"
 */
export function relativeDate(dateStr: string): string {
  const [y, mo, d] = dateStr.split("-").map(Number) as [number, number, number];
  const date = new Date(y, mo - 1, d); // local midnight — avoids UTC offset bug
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - date.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays <= 6)
    return date.toLocaleDateString("en-US", { weekday: "long" });
  if (date.getFullYear() === today.getFullYear()) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
