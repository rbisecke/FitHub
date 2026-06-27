"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { useUserPrefs } from "@/lib/contexts/UserPrefsContext";
import type { DistanceUnit } from "@/lib/api";

interface Props {
  initial: DistanceUnit;
  token: string;
}

export function DistanceUnitToggle({ initial, token }: Props) {
  const [value, setValue] = useState<DistanceUnit>(initial);
  const { setDistanceUnit } = useUserPrefs();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSelect(u: DistanceUnit) {
    setValue(u);
    setDistanceUnit(u);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      api.profile
        .patch(token, { distance_unit: u })
        .then(() =>
          toast.success("Settings saved.", {
            id: "settings-save",
            duration: 2000,
          }),
        )
        .catch(() => {
          setValue(initial);
          setDistanceUnit(initial);
          toast.error("Failed to save. Try again.", { duration: 4000 });
        });
    }, 300);
  }

  return (
    <div className="flex items-center justify-between py-3 gap-4">
      <p className="text-sm text-[#e6edf3] shrink-0">Distance unit</p>
      <div
        role="radiogroup"
        aria-label="Distance unit"
        className="flex rounded-md border border-[#30363d] overflow-hidden"
      >
        {(["km", "mi"] as DistanceUnit[]).map((u) => (
          <button
            key={u}
            role="radio"
            aria-checked={value === u}
            onClick={() => handleSelect(u)}
            className={[
              "min-w-[44px] min-h-[44px] px-4 flex items-center justify-center font-mono text-sm transition-colors",
              value === u
                ? "bg-[#161b22] text-[#58a6ff] ring-1 ring-inset ring-[#58a6ff]"
                : "bg-transparent text-[#8b949e] hover:text-[#e6edf3]",
            ].join(" ")}
          >
            {u}
          </button>
        ))}
      </div>
    </div>
  );
}
