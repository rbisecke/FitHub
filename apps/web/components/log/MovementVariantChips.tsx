"use client";

interface MovementVariantChipsProps {
  value: string; // comma-joined current selection e.g. "hang,power"
  onChange: (value: string) => void;
  modality: string | undefined;
}

const CHIPS = ["Hang", "Power", "Squat", "Block", "Pause"] as const;

export function MovementVariantChips({
  value,
  onChange,
  modality,
}: MovementVariantChipsProps) {
  if (modality !== "weightlifting") return null;

  const selected = new Set(
    value
      .split(",")
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean),
  );

  function toggle(chip: string) {
    const key = chip.toLowerCase();
    const next = new Set(selected);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    onChange(Array.from(next).join(","));
  }

  return (
    <div className="flex flex-wrap gap-1">
      {CHIPS.map((chip) => {
        const isSelected = selected.has(chip.toLowerCase());
        return (
          <button
            key={chip}
            type="button"
            onClick={() => toggle(chip)}
            className={`text-xs px-2 py-0.5 rounded border font-mono cursor-pointer ${
              isSelected
                ? "bg-[#58a6ff]/20 border-[#58a6ff] text-[#58a6ff]"
                : "bg-transparent border-[#30363d] text-[#8b949e]"
            }`}
          >
            {chip}
          </button>
        );
      })}
    </div>
  );
}
