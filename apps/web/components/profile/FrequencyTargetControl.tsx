"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import type { FrequencyTarget } from "@/lib/api";

const OPTIONS: FrequencyTarget[] = [3, 4, 5, 6];

interface Props {
  initial: FrequencyTarget;
  token: string;
}

export function FrequencyTargetControl({ initial, token }: Props) {
  const [value, setValue] = useState<FrequencyTarget>(initial);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      <div>
        <p className="text-sm text-[#e6edf3]">Frequency target</p>
        <p className="text-xs text-[#8b949e]">Days per week you aim to train</p>
      </div>
      <div
        role="radiogroup"
        aria-label="Frequency target"
        className="flex rounded-md border border-[#30363d] overflow-hidden"
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
                ? "bg-[#161b22] text-[#58a6ff] ring-1 ring-inset ring-[#58a6ff]"
                : "bg-transparent text-[#8b949e] hover:text-[#e6edf3]",
            ].join(" ")}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
