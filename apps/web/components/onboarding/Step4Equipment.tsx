"use client";

import { useState } from "react";
import type { EquipmentAccess } from "@/lib/api";

const OPTIONS: ReadonlyArray<{ value: EquipmentAccess; label: string }> = [
  { value: "barbell", label: "Barbell" },
  { value: "dumbbells", label: "Dumbbells" },
  { value: "kettlebells", label: "Kettlebells" },
  { value: "rig_pull_up", label: "Rig / pull-up bar" },
  { value: "rower_erg", label: "Rower / erg" },
  { value: "machines", label: "Machines" },
  { value: "none", label: "No equipment" },
];

// Reused by the completion summary (step 8) for a plain-language recap.
export const EQUIPMENT_LABELS: Record<EquipmentAccess, string> =
  Object.fromEntries(OPTIONS.map((o) => [o.value, o.label])) as Record<
    EquipmentAccess,
    string
  >;

interface Props {
  defaultValue?: EquipmentAccess[];
  onNext: (value: EquipmentAccess[]) => void;
}

export function Step4Equipment({ defaultValue = [], onNext }: Props) {
  const [selected, setSelected] = useState<EquipmentAccess[]>(defaultValue);

  function toggle(value: EquipmentAccess) {
    setSelected((prev) => {
      // "none" (bodyweight only) is mutually exclusive with real equipment.
      if (value === "none") {
        return prev.includes("none") ? [] : ["none"];
      }
      const withoutNone = prev.filter((v) => v !== "none");
      return withoutNone.includes(value)
        ? withoutNone.filter((v) => v !== value)
        : [...withoutNone, value];
    });
  }

  return (
    <div className="animate-fadeUp flex flex-col">
      <p className="font-data mb-2 text-[13px] text-[var(--accent)]">
        $ git config user.equipment
      </p>
      <h2
        className="font-heading mb-2 text-[28px] text-[var(--foreground)]"
        style={{ letterSpacing: "-0.6px" }}
      >
        What equipment do you have?
      </h2>
      <p className="mb-6 text-[14px] text-[var(--muted)]">
        Select everything you have access to.
      </p>

      <div className="mb-7 grid grid-cols-2 gap-[11px]">
        {OPTIONS.map(({ value, label }) => {
          const active = selected.includes(value);
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(value)}
              className="relative flex min-h-[68px] w-full items-center rounded-[14px] border px-[16px] py-[14px] text-left transition-colors hover:border-[var(--accent)]"
              style={{
                background: active
                  ? "color-mix(in srgb, var(--accent) 10%, transparent)"
                  : "var(--card)",
                borderColor: active ? "var(--accent)" : "var(--border)",
              }}
            >
              <span
                className="font-heading text-[15px]"
                style={{
                  color: active ? "var(--accent)" : "var(--foreground)",
                }}
              >
                {label}
              </span>
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full"
                  style={{ background: "var(--accent)" }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--bg)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onNext(selected)}
        disabled={selected.length === 0}
        className="min-h-[48px] w-full rounded-[13px] bg-[var(--accent)] py-[15px] text-[15px] font-extrabold text-[var(--bg)] transition-opacity hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Continue
      </button>
    </div>
  );
}
