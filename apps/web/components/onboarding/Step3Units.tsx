"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Unit = "kg" | "lb";

interface Props {
  defaultValue?: Unit;
  onNext: (value: Unit) => void;
  onBack: () => void;
}

export function Step3Units({ defaultValue = "lb", onNext, onBack }: Props) {
  const [selected, setSelected] = useState<Unit>(defaultValue);

  return (
    <div className="flex min-h-[calc(100dvh-48px)] flex-col px-6 py-8 md:min-h-0">
      <p className="font-mono text-xs text-[#8b949e]">
        $ git config --global training.units
      </p>

      <h2 className="mt-6 text-xl font-semibold text-[#e6edf3]">
        Which weight units do you use?
      </h2>
      <p className="mt-2 text-sm text-[#8b949e]">
        All weights are stored in kg internally. We&apos;ll display in your
        preferred unit.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3">
        {(["kg", "lb"] as const).map((unit) => (
          <button
            key={unit}
            onClick={() => setSelected(unit)}
            aria-pressed={selected === unit}
            className={[
              "min-h-[48px] rounded-md border py-6 text-center transition-colors",
              selected === unit
                ? "border-[#58a6ff] bg-[#58a6ff]/10 text-[#58a6ff]"
                : "border-[#30363d] bg-[#161b22] text-[#e6edf3] hover:border-[#58a6ff]/50",
            ].join(" ")}
          >
            <span className="block font-mono text-3xl font-semibold">
              {unit}
            </span>
            <span className="mt-1 block text-xs text-[#8b949e]">
              {unit === "kg" ? "kilograms" : "pounds"}
            </span>
          </button>
        ))}
      </div>

      <div className="flex-1" />

      <div className="space-y-3 pb-8 md:pb-0">
        <Button
          onClick={() => onNext(selected)}
          className="min-h-[48px] w-full bg-[#58a6ff] font-medium text-[#0d1117] hover:bg-[#79b8ff]"
        >
          Continue
        </Button>
        <div className="flex justify-center">
          <button
            onClick={onBack}
            className="py-2 text-xs text-[#8b949e] transition-colors hover:text-[#e6edf3]"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
