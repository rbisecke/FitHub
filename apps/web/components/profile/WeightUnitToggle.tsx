"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { useUserPrefs } from "@/lib/contexts/UserPrefsContext";
import type { WeightUnit } from "@/lib/api";

interface Props {
  initial: WeightUnit;
  token: string;
}

export function WeightUnitToggle({ initial, token }: Props) {
  const [value, setValue] = useState<WeightUnit>(initial);
  const { setWeightUnit } = useUserPrefs();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleSelect(u: WeightUnit) {
    setValue(u);
    setWeightUnit(u);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      api.profile
        .patch(token, { weight_unit: u })
        .then(() =>
          toast.success("Settings saved.", {
            id: "settings-save",
            duration: 2000,
          }),
        )
        .catch(() => {
          setValue(initial);
          setWeightUnit(initial);
          toast.error("Failed to save. Try again.", { duration: 4000 });
        });
    }, 300);
  }

  return (
    <div className="flex items-center justify-between py-3 gap-4">
      <p className="text-sm text-[var(--text)] shrink-0">Weight unit</p>
      <div
        role="radiogroup"
        aria-label="Weight unit"
        className="flex rounded-md border border-[var(--border)] overflow-hidden"
      >
        {(["kg", "lb"] as WeightUnit[]).map((u) => (
          <button
            key={u}
            role="radio"
            aria-checked={value === u}
            onClick={() => handleSelect(u)}
            className={[
              "min-w-[44px] min-h-[44px] px-4 flex items-center justify-center font-mono text-sm transition-colors",
              value === u
                ? "bg-[var(--surface)] text-[var(--accent)] ring-1 ring-inset ring-[var(--accent)]"
                : "bg-transparent text-[var(--muted)] hover:text-[var(--text)]",
            ].join(" ")}
          >
            {u}
          </button>
        ))}
      </div>
    </div>
  );
}
