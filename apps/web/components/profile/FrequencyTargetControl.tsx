"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import type { FrequencyTarget } from "@/lib/api";

const OPTIONS: FrequencyTarget[] = [1, 2, 3, 4, 5, 6, 7];

interface Props {
  initial: FrequencyTarget;
  token: string;
}

export function FrequencyTargetControl({ initial, token }: Props) {
  const [value, setValue] = useState<FrequencyTarget>(initial);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleSelect(v: FrequencyTarget) {
    setValue(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      api.profile
        .patch(token, { frequency_target_days: v })
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

  return (
    <div className="flex items-center justify-between py-3">
      <div className="min-w-0">
        <p className="text-sm text-[var(--text)]">Frequency target</p>
        <p className="text-xs text-[var(--muted)]">
          Days per week you aim to train
        </p>
      </div>
      <div
        role="radiogroup"
        aria-label="Frequency target"
        className="flex rounded-md border border-[var(--border)] overflow-hidden shrink-0"
      >
        {OPTIONS.map((opt) => (
          <button
            key={opt}
            role="radio"
            aria-checked={value === opt}
            onClick={() => handleSelect(opt)}
            className={[
              "min-w-[44px] min-h-[44px] flex items-center justify-center font-mono text-sm transition-colors",
              value === opt
                ? "bg-[var(--surface)] text-[var(--accent)] ring-1 ring-inset ring-[var(--accent)]"
                : "bg-transparent text-[var(--muted)] hover:text-[var(--text)]",
            ].join(" ")}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
