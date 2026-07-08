import type { ResultType, SessionType, WorkoutFormat } from "@/lib/api";

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

export function convertWeight(kg: number, unit: "kg" | "lb"): number {
  return unit === "lb" ? Math.round(kg * 2.20462 * 10) / 10 : kg;
}

export function formatWeight(kg: number, unit: "kg" | "lb"): string {
  if (unit === "lb") return `${Math.round(kg * 2.20462)} lb`;
  return `${kg.toFixed(1)} kg`;
}

export function formatWeightDelta(deltaKg: number, unit: "kg" | "lb"): string {
  if (unit === "lb") return `${Math.round(Math.abs(deltaKg) * 2.20462)} lb`;
  return `${Math.abs(deltaKg).toFixed(1)} kg`;
}

type AcwrZone =
  | "insufficient_data"
  | "sweet_spot"
  | "undertraining"
  | "caution"
  | "overreaching";

export function formatAcwrZone(zone: AcwrZone | string): string {
  switch (zone) {
    case "sweet_spot":
      return "optimal";
    case "undertraining":
      return "low";
    case "caution":
      return "caution";
    case "overreaching":
      return "high risk";
    case "insufficient_data":
      return "calibrating";
    default:
      return "calibrating";
  }
}

export function getAcwrZoneColor(zone: AcwrZone | string): string {
  switch (zone) {
    case "overreaching":
      return "var(--red)";
    case "caution":
      return "var(--amber)";
    case "sweet_spot":
      return "var(--accent)";
    default:
      return "var(--muted)";
  }
}

export function formatGoal(goal: string): string {
  return goal.replace(/_/g, " ");
}

export function toHandle(
  displayName: string | null | undefined,
  email?: string,
): string {
  if (displayName) {
    return displayName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  return (email ?? "user").split("@")[0] ?? "user";
}
