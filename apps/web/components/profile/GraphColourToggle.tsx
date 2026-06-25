"use client";

import { useState, useRef } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import { useUserPrefs } from "@/lib/contexts/UserPrefsContext";
import type { GraphColourMode } from "@/lib/api";

interface Props {
  initial: GraphColourMode;
  token: string;
}

export function GraphColourToggle({ initial, token }: Props) {
  const [value, setValue] = useState<GraphColourMode>(initial);
  const { setGraphColourMode } = useUserPrefs();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(v: string) {
    const mode = v as GraphColourMode;
    setValue(mode);
    setGraphColourMode(mode);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      api.profile
        .patch(token, { graph_colour_mode: mode })
        .then(() =>
          toast.success("Settings saved.", {
            id: "settings-save",
            duration: 2000,
          }),
        )
        .catch(() => {
          setValue(initial);
          setGraphColourMode(initial);
          toast.error("Failed to save. Try again.", { duration: 4000 });
        });
    }, 300);
  }

  return (
    <div className="flex items-center justify-between py-3 gap-4">
      <p className="text-sm text-[#e6edf3] shrink-0">Graph colour</p>
      <RadioGroup
        value={value}
        onValueChange={handleChange}
        className="flex gap-4"
        aria-label="Graph colour mode"
      >
        <div className="flex items-center gap-1.5">
          <RadioGroupItem
            value="intensity"
            aria-label="Intensity"
            className="border-[#30363d] text-[#58a6ff]"
          />
          <span className="text-sm text-[#e6edf3] cursor-pointer font-sans select-none">
            Intensity
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <RadioGroupItem
            value="volume"
            aria-label="Volume"
            className="border-[#30363d] text-[#58a6ff]"
          />
          <span className="text-sm text-[#e6edf3] cursor-pointer font-sans select-none">
            Volume
          </span>
        </div>
      </RadioGroup>
    </div>
  );
}
