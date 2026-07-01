"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import {
  readRecentMovements,
  formatCurrentBest,
  type RecentMovement,
} from "@/lib/tag";
import type { LastResult, PersonalRecordResult } from "@/lib/api";
import { api } from "@/lib/api/client";

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
  accessToken: string;
}

export function MovementGrid({
  selectedId,
  onSelect,
  onSearchRequest,
  accessToken,
}: MovementGridProps) {
  const [recent] = useState<RecentMovement[]>(() => {
    if (typeof window === "undefined") return [];
    return readRecentMovements();
  });
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [prMap, setPrMap] = useState<Map<string, PersonalRecordResult>>(
    new Map(),
  );

  useEffect(() => {
    if (recent.length === 0) return;
    api.movements
      .personalRecordsBatch(
        accessToken,
        recent.map((m) => m.movement_id),
      )
      .then((results) => {
        setPrMap(new Map(results.map((r) => [r.movement_id, r])));
      })
      .catch(() => {
        // PR display is non-critical; silently skip on error
      });
  }, [accessToken, recent]);

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
          <Search className="pointer-events-none absolute left-3 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder="Search movements..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-[11px] md:rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-[9px] md:py-2.5 pl-9 pr-4 md:pr-16 text-[13px] md:text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] transition-colors focus:border-[var(--accent)] focus:outline-none"
          />
          {query && filtered.length > 0 && (
            <span className="pointer-events-none hidden md:block absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[var(--muted-foreground)] shrink-0">
              {filtered.length} hits
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onSearchRequest}
          className="hidden md:block shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 text-sm text-[var(--muted-foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)]"
        >
          Browse all
        </button>
      </div>

      {/* Category pills — desktop only */}
      <div className="hidden md:flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
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
        <div className="grid grid-cols-2 gap-[10px] md:gap-3 md:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
          {filtered.map((m) => {
            const isSelected = m.movement_id === selectedId;
            const pr = prMap.get(m.movement_id);
            const prDisplay = pr
              ? formatCurrentBest(pr as unknown as LastResult)
              : null;
            return (
              <button
                key={m.movement_id}
                type="button"
                onClick={() => onSelect(m)}
                className={[
                  "font-data flex flex-col items-start rounded-[13px] md:rounded-[14px] border p-[13px_14px] md:p-[15px_16px] text-left transition-all cursor-pointer",
                  isSelected
                    ? "animate-glow border-[var(--accent)] bg-[var(--surface-2)]"
                    : "border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)] hover:shadow-[0_0_0_1px_rgba(74,222,128,0.2)]",
                ].join(" ")}
              >
                <div className="flex items-center justify-between w-full gap-2">
                  <span className="font-bold text-[13px] md:text-[14px] leading-snug text-[var(--foreground)] text-left">
                    {m.movement_name}
                  </span>
                  {!prDisplay && m.modality && (
                    <span className="hidden md:block shrink-0 text-[10px] text-[var(--muted-foreground)] bg-[var(--surface-2)] px-[7px] py-[2px] rounded-[6px]">
                      {MODALITY_LABEL[m.modality] ?? m.modality}
                    </span>
                  )}
                </div>
                {prDisplay && (
                  <div className="font-data text-[10.5px] text-[var(--muted-foreground)] mt-[7px] text-left">
                    PR{" "}
                    <span style={{ color: "var(--gold)", fontWeight: 700 }}>
                      {prDisplay}
                    </span>
                  </div>
                )}
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
