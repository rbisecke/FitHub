"use client";

import type { PrimaryGoal } from "@/lib/api";
import { cn } from "@/lib/utils";

const GOAL_OPTIONS: ReadonlyArray<{ value: PrimaryGoal; label: string }> = [
  { value: "build_strength", label: "Build strength" },
  { value: "gain_muscle", label: "Gain muscle" },
  { value: "lose_weight", label: "Lose weight" },
  { value: "improve_conditioning", label: "Improve conditioning" },
  { value: "compete", label: "Compete" },
  { value: "return_from_break", label: "Return from a break" },
  { value: "general_fitness", label: "General fitness" },
];

export const GOAL_LABELS: Record<PrimaryGoal, string> = Object.fromEntries(
  GOAL_OPTIONS.map((o) => [o.value, o.label]),
) as Record<PrimaryGoal, string>;

/**
 * Single-select primary-goal card grid (08 §3 identity edit sheet).
 *
 * Same 7 values and full-fill selection treatment as onboarding step 2, but a
 * distinct component (profile is a separate domain surface, no cross-domain
 * import from components/onboarding per the project's layer boundary) and
 * styled for the light profile ground rather than onboarding's dark ground.
 */
export function GoalGrid({
  value,
  onChange,
}: {
  value: PrimaryGoal | null;
  onChange: (value: PrimaryGoal) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Primary training goal"
      className="grid grid-cols-2 gap-2"
    >
      {GOAL_OPTIONS.map(({ value: v, label }) => {
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(v)}
            className={cn(
              "flex min-h-[56px] items-center rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors",
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-foreground hover:border-primary/50",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
