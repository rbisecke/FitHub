"use client";

interface MovementVariantChipsProps {
  value: string; // comma-joined current selection e.g. "pause,block"
  onChange: (value: string) => void;
  modality: string | undefined;
}

// Hang/Power/Squat removed: those are now distinct named movements in the catalog.
// Pause, Block, Tempo, Strict remain as annotation-only variants with no dedicated DB entry.
const CHIPS = ["Pause", "Block", "Tempo", "Strict"] as const;

const HIDDEN_MODALITIES = new Set([
  "mono_structural",
  "plyometric",
  "carry",
  "strongman",
]);

export function MovementVariantChips({
  value,
  onChange,
  modality,
}: MovementVariantChipsProps) {
  if (!modality || HIDDEN_MODALITIES.has(modality)) return null;

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
    <div className="space-y-1">
      <p className="text-xs text-[#8b949e]">Annotate variant</p>
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
    </div>
  );
}
