"use client";

import { useState } from "react";
import { readRecentMovements, type RecentMovement } from "@/lib/tag";

// Accent colours matching MovementSearch modality config
const MODALITY_BORDER_COLOUR: Record<string, string> = {
  strength: "#58a6ff",
  gymnastics: "#bc8cff",
  mono_structural: "#3fb950",
  weightlifting: "#d29922",
  plyometric: "#ff7b72",
  carry: "#d29922",
  strongman: "#ff7b72",
};

interface MovementChipsProps {
  selectedId: string | null;
  onSelect: (m: RecentMovement) => void;
  onSearchRequest: () => void;
}

export function MovementChips({
  selectedId,
  onSelect,
  onSearchRequest,
}: MovementChipsProps) {
  // Lazy initializer: reads localStorage on first client render; returns [] during SSR
  const [recent] = useState<RecentMovement[]>(() => {
    if (typeof window === "undefined") return [];
    return readRecentMovements();
  });

  if (recent.length === 0) return null;

  return (
    <div
      role="group"
      aria-label="Recent movements"
      className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none"
    >
      {recent.map((m) => {
        const isActive = m.movement_id === selectedId;
        const borderColour = m.modality
          ? MODALITY_BORDER_COLOUR[m.modality] ?? "#30363d"
          : "#30363d";
        return (
          <button
            key={m.movement_id}
            type="button"
            onClick={() => onSelect(m)}
            style={{ borderLeftColor: borderColour, borderLeftWidth: "3px" }}
            className={[
              "shrink-0 rounded border px-3 py-1 font-mono text-sm transition-colors",
              isActive
                ? "border-[#58a6ff] bg-[#58a6ff]/10 text-[#58a6ff]"
                : "border-[#30363d] bg-[#161b22] text-[#8b949e] hover:border-[#58a6ff]/40 hover:text-[#e6edf3]",
            ].join(" ")}
          >
            {m.movement_name}
          </button>
        );
      })}
      <button
        type="button"
        onClick={onSearchRequest}
        aria-label="Search for a movement"
        className="shrink-0 rounded-full border border-[#30363d] bg-[#161b22] px-3 py-1 font-mono text-sm text-[#8b949e] hover:border-[#58a6ff]/40 hover:text-[#e6edf3] transition-colors"
      >
        +
      </button>
    </div>
  );
}
