"use client";

interface Props {
  value: number;
  onChange: (v: number) => void;
}

export function RPEStepper({ value, onChange }: Props) {
  return (
    <div>
      <label className="block text-[12px] text-[var(--muted)] mb-2">
        Effort (RPE)
      </label>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={[
              "w-[34px] h-[34px] rounded-lg font-data text-[13px] font-semibold transition-all",
              value === n
                ? "bg-[var(--hot)] text-white font-bold"
                : "bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)] hover:border-[var(--muted)]",
            ].join(" ")}
            aria-pressed={value === n}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
