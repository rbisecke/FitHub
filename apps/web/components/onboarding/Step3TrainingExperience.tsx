"use client";

import { useState } from "react";
import type { TrainingAge } from "@/lib/types/plans";

const OPTIONS: ReadonlyArray<{
  value: TrainingAge;
  label: string;
  sub: string;
}> = [
  { value: "beginner", label: "Beginner", sub: "< 1 year training" },
  { value: "intermediate", label: "Intermediate", sub: "1–3 years" },
  { value: "advanced", label: "Advanced", sub: "3+ years" },
];

interface Props {
  defaultValue?: TrainingAge | null;
  onNext: (value: TrainingAge) => void;
}

// training_age is asked here (mirroring the plan wizard's TrainingAgeStep)
// but has no UserProfile column to persist to yet — only public.plans carries
// it today (see CreatePlanRequest.training_age). The selection advances the
// wizard without a PATCH call until a profile-level field exists.
export function Step3TrainingExperience({
  defaultValue = null,
  onNext,
}: Props) {
  const [selected, setSelected] = useState<TrainingAge | null>(defaultValue);

  return (
    <div className="animate-fadeUp flex flex-col">
      <p className="font-data mb-2 text-[13px] text-[var(--accent)]">
        $ git config user.experience
      </p>
      <h2
        className="font-heading mb-2 text-[28px] text-[var(--foreground)]"
        style={{ letterSpacing: "-0.6px" }}
      >
        How long have you been training?
      </h2>
      <p className="mb-6 text-[14px] text-[var(--muted)]">
        This shapes how aggressive your programming is.
      </p>

      <div
        role="radiogroup"
        aria-label="Training experience"
        className="mb-7 flex flex-col gap-[11px]"
      >
        {OPTIONS.map(({ value, label, sub }) => {
          const active = selected === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setSelected(value)}
              className="flex w-full items-center gap-[10px] rounded-[14px] border px-[18px] py-[16px] text-left transition-colors hover:border-[var(--accent)]"
              style={{
                background: active
                  ? "color-mix(in srgb, var(--accent) 10%, transparent)"
                  : "var(--card)",
                borderColor: active ? "var(--accent)" : "var(--border)",
              }}
            >
              <div>
                <span
                  className="font-heading block text-[20px]"
                  style={{
                    color: active ? "var(--accent)" : "var(--foreground)",
                  }}
                >
                  {label}
                </span>
                <span className="block text-[12px] text-[var(--muted)]">
                  {sub}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => selected && onNext(selected)}
        disabled={!selected}
        className="min-h-[48px] w-full rounded-[13px] py-[15px] text-[15px] font-extrabold transition-colors hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:hover:opacity-100"
        style={{
          background: selected ? "var(--accent)" : "var(--border)",
          color: selected ? "var(--bg)" : "var(--muted)",
        }}
      >
        Continue
      </button>
    </div>
  );
}
