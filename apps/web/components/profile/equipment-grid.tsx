"use client";

import { Check } from "lucide-react";
import type { EquipmentAccess } from "@/lib/api";
import { cn } from "@/lib/utils";

const EQUIPMENT_OPTIONS: ReadonlyArray<{
  value: EquipmentAccess;
  label: string;
}> = [
  { value: "barbell", label: "Barbell" },
  { value: "dumbbells", label: "Dumbbells" },
  { value: "kettlebells", label: "Kettlebells" },
  { value: "rig_pull_up", label: "Rig / pull-up bar" },
  { value: "rower_erg", label: "Rower / erg" },
  { value: "machines", label: "Machines" },
  { value: "none", label: "No equipment" },
];

export const EQUIPMENT_LABELS: Record<EquipmentAccess, string> =
  Object.fromEntries(
    EQUIPMENT_OPTIONS.map((o) => [o.value, o.label]),
  ) as Record<EquipmentAccess, string>;

/**
 * Multi-select equipment card grid (08 §3 identity edit sheet), same 7 values
 * as onboarding step 4. "none" (bodyweight only) is mutually exclusive with
 * every other value, matching the backend CHECK constraint (migration 0076).
 */
export function EquipmentGrid({
  value,
  onChange,
}: {
  value: EquipmentAccess[];
  onChange: (value: EquipmentAccess[]) => void;
}) {
  function toggle(v: EquipmentAccess) {
    if (v === "none") {
      onChange(value.includes("none") ? [] : ["none"]);
      return;
    }
    const withoutNone = value.filter((x) => x !== "none");
    onChange(
      withoutNone.includes(v)
        ? withoutNone.filter((x) => x !== v)
        : [...withoutNone, v],
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {EQUIPMENT_OPTIONS.map(({ value: v, label }) => {
        const active = value.includes(v);
        return (
          <button
            key={v}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(v)}
            className={cn(
              "relative flex min-h-[56px] items-center rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors",
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-foreground hover:border-primary/50",
            )}
          >
            {label}
            {active && (
              <span
                aria-hidden="true"
                className="absolute top-2 right-2 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground"
              >
                <Check className="size-2.5" strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
