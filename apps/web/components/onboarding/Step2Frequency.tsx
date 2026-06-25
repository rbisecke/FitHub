"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const OPTIONS = [2, 3, 4, 5] as const;

interface Props {
  defaultValue?: number;
  onNext: (value: number) => void;
  onBack: () => void;
}

export function Step2Frequency({ defaultValue = 3, onNext, onBack }: Props) {
  const [selected, setSelected] = useState<number>(defaultValue);

  return (
    <div className="flex min-h-[calc(100dvh-48px)] flex-col px-6 py-8 md:min-h-0">
      <p className="font-mono text-xs text-[#8b949e]">
        $ git config --global training.frequency
      </p>

      <h2 className="mt-6 text-xl font-semibold text-[#e6edf3]">
        How often do you train?
      </h2>
      <p className="mt-2 text-sm text-[#8b949e]">
        We&apos;ll use this to track your consistency and flag overtraining.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3">
        {OPTIONS.map((days) => (
          <button
            key={days}
            onClick={() => setSelected(days)}
            aria-pressed={selected === days}
            className={[
              "min-h-[48px] rounded-md border py-4 text-center transition-colors",
              selected === days
                ? "border-[#58a6ff] bg-[#58a6ff]/10 text-[#58a6ff]"
                : "border-[#30363d] bg-[#161b22] text-[#e6edf3] hover:border-[#58a6ff]/50",
            ].join(" ")}
          >
            <span className="block font-mono text-2xl font-semibold">
              {days}
            </span>
            <span className="mt-0.5 block text-xs text-[#8b949e]">
              {days === 2 ? "days / week" : "days / week"}
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
