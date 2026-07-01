"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import type { HistoryFilters } from "@/components/workout/HistoryControls";

const SESSION_TYPE_PILLS = [
  { label: "All", value: null as string | null },
  { label: "Strength", value: "strength" },
  { label: "Metcon", value: "metcon" },
  { label: "Skill", value: "skill" },
  { label: "Mixed", value: "mixed" },
  { label: "Rest", value: "rest" },
];

function activeFilterCount(
  filters: HistoryFilters,
  movementFilter: string | null,
): number {
  return [
    filters.partnerFilter !== "all",
    filters.dateFrom !== null,
    filters.dateTo !== null,
    filters.tagsFilter !== "all",
    movementFilter !== null,
  ].filter(Boolean).length;
}

interface FilterBarProps {
  filters: HistoryFilters;
  onFiltersChange: (filters: HistoryFilters) => void;
  onClear: () => void;
  movementFilter?: string | null;
  onClearMovementFilter?: () => void;
}

export function FilterBar({
  filters,
  onFiltersChange,
  onClear,
  movementFilter,
  onClearMovementFilter,
}: FilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const advCount = activeFilterCount(filters, movementFilter ?? null);

  return (
    <div className="mb-6">
      {/* Row: type pills + Filters button */}
      <div className="flex items-center gap-2.5 flex-wrap mb-3">
        {SESSION_TYPE_PILLS.map((pill) => {
          const isActive = filters.sessionType === pill.value;
          return (
            <button
              key={pill.label}
              onClick={() =>
                onFiltersChange({ ...filters, sessionType: pill.value })
              }
              className={`font-data text-[11.5px] font-semibold px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
                isActive
                  ? "bg-[rgba(74,222,128,0.14)] border-[var(--accent)] text-[var(--accent)]"
                  : "bg-transparent border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {pill.label}
            </button>
          );
        })}

        <div className="flex-1" />

        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex items-center gap-1.5 bg-[var(--card)] border border-[var(--border)] rounded-[9px] px-3 py-2 text-[12px] font-semibold text-[var(--foreground)] hover:border-[var(--muted-foreground)] transition-colors"
        >
          <SlidersHorizontal className="h-[13px] w-[13px]" />
          Filters
          {advCount > 0 && (
            <span className="inline-flex items-center justify-center bg-[var(--accent)] text-[#0A0D12] text-[10px] font-black min-w-[16px] h-[16px] rounded-full px-1">
              {advCount}
            </span>
          )}
        </button>
      </div>

      {/* Movement filter chip */}
      {movementFilter && (
        <div className="mb-3">
          <span className="inline-flex items-center gap-2 bg-[rgba(74,222,128,0.12)] border border-[rgba(74,222,128,0.3)] text-[var(--accent)] text-[12px] font-semibold px-[13px] py-[7px] rounded-full">
            filtering by movement: {movementFilter}
            {onClearMovementFilter && (
              <button
                onClick={onClearMovementFilter}
                aria-label="Clear movement filter"
                className="opacity-70 hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        </div>
      )}

      {/* Advanced filters panel */}
      {showAdvanced && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-[14px] p-[18px] mb-[14px] flex flex-wrap gap-6 items-end">
          {/* Date range */}
          <div>
            <div className="text-[10.5px] text-[var(--muted-foreground)] uppercase tracking-[1px] mb-2 font-semibold">
              Date range
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filters.dateFrom ?? ""}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    dateFrom: e.target.value || null,
                  })
                }
                className="bg-[var(--background)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[12px] text-[var(--foreground)] [color-scheme:dark] focus:outline-none focus:border-[var(--accent)]"
              />
              <span className="text-[var(--muted-foreground)] text-sm">→</span>
              <input
                type="date"
                value={filters.dateTo ?? ""}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    dateTo: e.target.value || null,
                  })
                }
                className="bg-[var(--background)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[12px] text-[var(--foreground)] [color-scheme:dark] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          {/* Partner filter */}
          <div>
            <div className="text-[10.5px] text-[var(--muted-foreground)] uppercase tracking-[1px] mb-2 font-semibold">
              Training partner
            </div>
            <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
              {(["all", "solo", "partner"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() =>
                    onFiltersChange({ ...filters, partnerFilter: v })
                  }
                  className={`px-3 py-1.5 text-[12px] font-semibold capitalize transition-colors ${
                    filters.partnerFilter === v
                      ? "bg-[var(--accent)] text-[#0A0D12]"
                      : "bg-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Tags only toggle */}
          <div>
            <div className="text-[10.5px] text-[var(--muted-foreground)] uppercase tracking-[1px] mb-2 font-semibold">
              Entry type
            </div>
            <button
              onClick={() =>
                onFiltersChange({
                  ...filters,
                  tagsFilter:
                    filters.tagsFilter === "tags-only" ? "all" : "tags-only",
                })
              }
              className={`flex items-center gap-1.5 border rounded-[9px] px-[14px] py-2 text-[12px] font-semibold transition-colors ${
                filters.tagsFilter === "tags-only"
                  ? "bg-[rgba(255,200,61,0.14)] border-[rgba(255,200,61,0.3)] text-[var(--gold)]"
                  : "bg-[var(--background)] border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              🏷️ Tags only
            </button>
          </div>

          {/* Reset all */}
          <div className="ml-auto">
            <button
              onClick={() => {
                onClear();
                if (onClearMovementFilter) onClearMovementFilter();
              }}
              className="text-[12px] font-semibold text-[var(--muted-foreground)] border border-[var(--border)] rounded-lg px-3 py-2 hover:text-[var(--foreground)] hover:border-[var(--muted-foreground)] transition-colors"
            >
              Reset all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
