"use client";

import { useState } from "react";
import { readRecentMovements, type RecentMovement } from "@/lib/tag";

// Accent colours matching MovementSearch modality config
const MODALITY_BORDER_COLOUR: Record<string, string> = {
  strength: "var(--accent)",
  gymnastics: "var(--purple)",
  mono_structural: "var(--green)",
  weightlifting: "var(--amber)",
  plyometric: "var(--red)",
  carry: "var(--amber)",
  strongman: "var(--red)",
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
          ? MODALITY_BORDER_COLOUR[m.modality] ?? "var(--border)"
          : "var(--border)";
        return (
          <button
            key={m.movement_id}
            type="button"
            onClick={() => onSelect(m)}
            style={{ borderLeftColor: borderColour, borderLeftWidth: "3px" }}
            className={[
              "shrink-0 rounded border px-3 py-1 font-mono text-sm transition-colors",
              isActive
                ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--accent)]/40 hover:text-[var(--text)]",
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
        className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 font-mono text-sm text-[var(--muted)] hover:border-[var(--accent)]/40 hover:text-[var(--text)] transition-colors"
      >
        +
      </button>
    </div>
  );
}
