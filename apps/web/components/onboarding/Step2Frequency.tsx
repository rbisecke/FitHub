"use client";

import { useState } from "react";

const OPTIONS = [
  { label: "3-4×", value: 4, sub: "ideal", recommended: true },
  { label: "5-6×", value: 5, sub: "competitive", recommended: false },
  { label: "1-2×", value: 2, sub: "easy pace", recommended: false },
] as const;

function closestOptionValue(n: number): number {
  if (n >= 5) return 5;
  if (n <= 2) return 2;
  return 4;
}

interface Props {
  defaultValue?: number;
  onNext: (value: number) => void;
}

export function Step2Frequency({ defaultValue = 4, onNext }: Props) {
  const [selected, setSelected] = useState<number>(
    closestOptionValue(defaultValue),
  );

  return (
    <div className="animate-fadeUp flex flex-col">
      <p className="font-data mb-2 text-[13px] text-[var(--accent)]">
        $ git config streak.target
      </p>
      <h2
        className="font-heading mb-2 text-[28px] text-[var(--foreground)]"
        style={{ letterSpacing: "-0.6px" }}
      >
        How often do you train?
      </h2>
      <p className="mb-6 text-[14px] text-[var(--muted)]">
        We use this to track your streak and flag overtraining.
      </p>

      <div className="mb-7 flex flex-col gap-[11px]">
        {OPTIONS.map(({ label, value, sub, recommended }) => {
          const active = selected === value;
          return (
            <button
              key={value}
              onClick={() => setSelected(value)}
              aria-pressed={active}
              className="flex w-full items-center gap-[10px] rounded-[14px] border px-[18px] py-[16px] text-left transition-colors hover:border-[var(--accent)]"
              style={{
                background: active ? "rgba(74,222,128,0.05)" : "var(--card)",
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
              <div className="flex flex-1 justify-end">
                {recommended && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                    style={{
                      background: "rgba(74,222,128,0.15)",
                      color: "var(--accent)",
                    }}
                  >
                    RECOMMENDED
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onNext(selected)}
        className="min-h-[48px] w-full rounded-[13px] bg-[var(--accent)] py-[15px] text-[15px] font-extrabold text-[#0A0D12] transition-opacity hover:opacity-90 active:scale-[0.98]"
      >
        Continue
      </button>
    </div>
  );
}
