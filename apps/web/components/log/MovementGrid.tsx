"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { readRecentMovements, type RecentMovement } from "@/lib/tag";

const CATEGORIES: Array<{ value: string | null; label: string }> = [
  { value: null, label: "All" },
  { value: "strength", label: "Strength" },
  { value: "weightlifting", label: "Olympic" },
  { value: "gymnastics", label: "Gymnastic" },
  { value: "mono_structural", label: "Cardio" },
];

const MODALITY_LABEL: Record<string, string> = {
  strength: "Str",
  weightlifting: "WL",
  gymnastics: "Gym",
  mono_structural: "Cardio",
  plyometric: "Plyo",
  carry: "Carry",
  strongman: "SM",
};

interface MovementGridProps {
  selectedId: string | null;
  onSelect: (m: RecentMovement) => void;
  onSearchRequest: () => void;
}

export function MovementGrid({
  selectedId,
  onSelect,
  onSearchRequest,
}: MovementGridProps) {
  const [recent] = useState<RecentMovement[]>(() => {
    if (typeof window === "undefined") return [];
    return readRecentMovements();
  });
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const filtered = recent.filter((m) => {
    const matchesQuery =
      !query || m.movement_name.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = !categoryFilter || m.modality === categoryFilter;
    return matchesQuery && matchesCategory;
  });

  return (
    <div className="space-y-3">
      {/* Search + browse row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder="Search movements..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-2.5 pl-9 pr-16 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] transition-colors focus:border-[var(--accent)] focus:outline-none"
          />
          {query && filtered.length > 0 && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[var(--muted-foreground)] shrink-0">
              {filtered.length} hits
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onSearchRequest}
          className="shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 text-sm text-[var(--muted-foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)]"
        >
          Browse all
        </button>
      </div>

      {/* Category pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
        {CATEGORIES.map(({ value, label }) => {
          const isActive = categoryFilter === value;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setCategoryFilter(value)}
              className={[
                "shrink-0 rounded-full border px-3 py-1 font-data text-[11.5px] transition-colors",
                isActive
                  ? "border-[var(--accent)] bg-[rgba(74,222,128,0.14)] text-[var(--accent)]"
                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--accent)]/40 hover:text-[var(--foreground)]",
              ].join(" ")}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Movement card grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
          {filtered.map((m) => {
            const isSelected = m.movement_id === selectedId;
            return (
              <button
                key={m.movement_id}
                type="button"
                onClick={() => onSelect(m)}
                className={[
                  "font-data flex flex-col items-start rounded-[14px] border p-[15px_16px] text-left transition-all cursor-pointer",
                  isSelected
                    ? "animate-glow border-[var(--accent)] bg-[var(--card)]"
                    : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)] hover:shadow-[0_0_0_1px_rgba(74,222,128,0.2)]",
                ].join(" ")}
              >
                <div className="flex items-center justify-between w-full gap-2">
                  <span className="font-bold text-[14px] leading-snug text-[var(--foreground)] text-left">
                    {m.movement_name}
                  </span>
                  {m.modality && (
                    <span className="shrink-0 text-[10px] text-[var(--muted-foreground)] bg-[var(--surface-2)] px-[7px] py-[2px] rounded-[6px]">
                      {MODALITY_LABEL[m.modality] ?? m.modality}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[14px] border border-dashed border-[var(--border)] p-8 text-center">
          <p className="text-sm text-[var(--muted-foreground)]">
            {query
              ? `No movements matching "${query}"`
              : "No recent movements — use Browse all to add movements"}
          </p>
        </div>
      )}
    </div>
  );
}
