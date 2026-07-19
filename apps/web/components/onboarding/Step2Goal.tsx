"use client";

import { useState } from "react";
import type { PrimaryGoal } from "@/lib/api";

const OPTIONS: ReadonlyArray<{ value: PrimaryGoal; label: string }> = [
  { value: "build_strength", label: "Build strength" },
  { value: "gain_muscle", label: "Gain muscle" },
  { value: "lose_weight", label: "Lose weight" },
  { value: "improve_conditioning", label: "Improve conditioning" },
  { value: "compete", label: "Compete" },
  { value: "return_from_break", label: "Return from a break" },
  { value: "general_fitness", label: "General fitness" },
];

// Reused by the completion summary (step 8) for a plain-language recap.
export const GOAL_LABELS: Record<PrimaryGoal, string> = Object.fromEntries(
  OPTIONS.map((o) => [o.value, o.label]),
) as Record<PrimaryGoal, string>;

interface Props {
  defaultValue?: PrimaryGoal | null;
  onNext: (value: PrimaryGoal) => void;
}

export function Step2Goal({ defaultValue = null, onNext }: Props) {
  const [selected, setSelected] = useState<PrimaryGoal | null>(defaultValue);

  return (
    <div className="animate-fadeUp flex flex-col">
      <p className="font-data mb-2 text-[13px] text-[var(--accent)]">
        $ git config user.goal
      </p>
      <h2
        className="font-heading mb-2 text-[28px] text-[var(--foreground)]"
        style={{ letterSpacing: "-0.6px" }}
      >
        What&apos;s your main goal?
      </h2>
      <p className="mb-6 text-[14px] text-[var(--muted)]">
        We&apos;ll tailor your plans around this.
      </p>

      <div
        role="radiogroup"
        aria-label="Primary training goal"
        className="mb-7 grid grid-cols-2 gap-[11px]"
      >
        {OPTIONS.map(({ value, label }) => {
          const active = selected === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setSelected(value)}
              className="flex min-h-[68px] w-full items-center rounded-[14px] border px-[16px] py-[14px] text-left transition-colors hover:border-[var(--accent)]"
              style={{
                background: active ? "rgba(88,166,255,0.1)" : "var(--card)",
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
            </button>
          );
        })}
      </div>

      <button
        onClick={() => selected && onNext(selected)}
        disabled={!selected}
        className="min-h-[48px] w-full rounded-[13px] bg-[var(--accent)] py-[15px] text-[15px] font-extrabold text-[var(--bg)] transition-opacity hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Continue
      </button>
    </div>
  );
}
