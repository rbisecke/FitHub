"use client";

interface MovementVariantChipsProps {
  value: string; // comma-joined current selection e.g. "pause,block"
  onChange: (value: string) => void;
  modality: string | undefined;
}

const CHIP_DEFS = [
  { key: "pause", label: "Pause" },
  { key: "block", label: "Block" },
  { key: "tempo", label: "Tempo" },
  { key: "strict", label: "Strict" },
  { key: "deficit", label: "Deficit" },
  { key: "elevated", label: "Elevated" },
  { key: "banded", label: "Banded" },
  { key: "chains", label: "Chains" },
  { key: "pin", label: "Pin" },
  { key: "deadstop", label: "Dead Stop" },
  { key: "kipping", label: "Kipping" },
  { key: "seated", label: "Seated" },
] as const;

type ChipKey = (typeof CHIP_DEFS)[number]["key"];

const MOD_CHIPS: Record<string, ChipKey[]> = {
  strength: [
    "pause",
    "block",
    "tempo",
    "strict",
    "deficit",
    "elevated",
    "banded",
    "chains",
    "pin",
    "deadstop",
  ],
  weightlifting: [
    "pause",
    "block",
    "tempo",
    "strict",
    "deficit",
    "banded",
    "chains",
    "deadstop",
  ],
  gymnastics: ["pause", "block", "strict", "deficit", "kipping"],
  plyometric: ["seated"],
};

export function MovementVariantChips({
  value,
  onChange,
  modality,
}: MovementVariantChipsProps) {
  const allowedKeys = modality ? MOD_CHIPS[modality] ?? [] : [];
  if (allowedKeys.length === 0) return null;

  const selected = new Set(
    value
      .split(",")
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean),
  );

  function toggle(key: ChipKey) {
    const next = new Set(selected);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    onChange(Array.from(next).join(","));
  }

  const visibleChips = CHIP_DEFS.filter((c) =>
    (allowedKeys as readonly string[]).includes(c.key),
  );

  return (
    <div className="space-y-1">
      <p className="text-xs text-[var(--muted)]">Modifiers</p>
      <div className="flex flex-wrap gap-1">
        {visibleChips.map((chip) => {
          const isSelected = selected.has(chip.key);
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => toggle(chip.key)}
              className={`text-xs px-2 py-0.5 rounded border font-mono cursor-pointer ${
                isSelected
                  ? "bg-[#58a6ff]/20 border-[#58a6ff] text-[#58a6ff]"
                  : "bg-transparent border-[var(--border)] text-[var(--muted)]"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
