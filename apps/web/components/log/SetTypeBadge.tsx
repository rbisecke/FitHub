"use client";

type SetType = "warmup" | "working" | "drop";

interface SetTypeBadgeProps {
  value: SetType;
  onChange: (next: SetType) => void;
}

const LABELS: Record<SetType, string> = {
  warmup: "W",
  working: "●",
  drop: "↓",
};

const COLOURS: Record<SetType, string> = {
  warmup: "text-[#8b949e]",
  working: "text-[#3fb950]",
  drop: "text-[#d29922]",
};

const CYCLE: Record<SetType, SetType> = {
  warmup: "working",
  working: "drop",
  drop: "warmup",
};

export function SetTypeBadge({ value, onChange }: SetTypeBadgeProps) {
  return (
    <button
      type="button"
      aria-label={`Set type: ${value}`}
      onClick={() => onChange(CYCLE[value])}
      className={`font-mono text-sm w-6 h-6 flex items-center justify-center rounded hover:bg-[#161b22] transition-colors ${COLOURS[value]}`}
    >
      {LABELS[value]}
    </button>
  );
}
