"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import type { FrequencyTarget } from "@/lib/api";

const MIN = 3;
const MAX = 6;

interface Props {
  initial: FrequencyTarget;
  token: string;
}

export function FrequencyStepper({ initial, token }: Props) {
  const [value, setValue] = useState<FrequencyTarget>(initial);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(next: FrequencyTarget) {
    setValue(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      api.profile
        .patch(token, { frequency_target_days: next })
        .then(() =>
          toast.success("Settings saved.", {
            id: "settings-save",
            duration: 2000,
          }),
        )
        .catch(() => {
          setValue(initial);
          toast.error("Failed to save. Try again.", { duration: 4000 });
        });
    }, 300);
  }

  const decrement = () => {
    if (value > MIN) handleChange((value - 1) as FrequencyTarget);
  };

  const increment = () => {
    if (value < MAX) handleChange((value + 1) as FrequencyTarget);
  };

  return (
    <div className="flex items-center justify-between py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--foreground)]">
          Weekly target
        </p>
        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
          Sessions per week
        </p>
      </div>
      <div
        className="flex items-center gap-1 shrink-0"
        role="group"
        aria-label="Weekly frequency target"
      >
        <button
          type="button"
          onClick={decrement}
          disabled={value <= MIN}
          aria-label="Decrease frequency target"
          className="w-8 h-8 flex items-center justify-center border border-[var(--border)] rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--muted-foreground)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed select-none"
        >
          −
        </button>
        <div
          aria-live="polite"
          className="font-heading text-[20px] text-[var(--foreground)] min-w-[32px] text-center"
        >
          {value}
        </div>
        <button
          type="button"
          onClick={increment}
          disabled={value >= MAX}
          aria-label="Increase frequency target"
          className="w-8 h-8 flex items-center justify-center border border-[var(--border)] rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--muted-foreground)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed select-none"
        >
          +
        </button>
      </div>
    </div>
  );
}
