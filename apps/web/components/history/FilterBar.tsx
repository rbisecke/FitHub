"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import type { HistoryFilters } from "@/components/workout/HistoryControls";
import { HistoryFilterSheet } from "@/components/workout/HistoryFilterSheet";

const SESSION_TYPE_PILLS = [
  { label: "All", value: null as string | null },
  { label: "Strength", value: "strength" },
  { label: "Metcon", value: "metcon" },
  { label: "Skill", value: "skill" },
  { label: "Mixed", value: "mixed" },
  { label: "Rest", value: "rest" },
];

function activeServerFilterCount(filters: HistoryFilters): number {
  return [
    filters.sessionType !== null,
    filters.partnerFilter !== "all",
    filters.dateFrom !== null,
    filters.dateTo !== null,
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetKey, setSheetKey] = useState(0);
  const advCount = activeServerFilterCount(filters);

  function openSheet() {
    setSheetKey((k) => k + 1);
    setSheetOpen(true);
  }

  // Build active filter pills for server-side filters
  const activePills: { label: string; onRemove: () => void }[] = [];

  if (filters.sessionType) {
    const label =
      SESSION_TYPE_PILLS.find((p) => p.value === filters.sessionType)?.label ??
      filters.sessionType;
    activePills.push({
      label,
      onRemove: () => onFiltersChange({ ...filters, sessionType: null }),
    });
  }

  if (filters.partnerFilter !== "all") {
    activePills.push({
      label: filters.partnerFilter === "partner" ? "Partner only" : "Solo only",
      onRemove: () => onFiltersChange({ ...filters, partnerFilter: "all" }),
    });
  }

  if (filters.dateFrom || filters.dateTo) {
    const fromLabel = filters.dateFrom
      ? new Date(filters.dateFrom + "T00:00:00").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : "…";
    const toLabel = filters.dateTo
      ? new Date(filters.dateTo + "T00:00:00").toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })
      : "…";
    activePills.push({
      label: `${fromLabel} – ${toLabel}`,
      onRemove: () =>
        onFiltersChange({ ...filters, dateFrom: null, dateTo: null }),
    });
  }

  const hasServerFilters = activePills.length > 0;
  const hasAnyFilter = hasServerFilters || !!movementFilter;

  return (
    <div className="mb-6">
      {/* Row: type pills + mobile filter button */}
      <div className="flex items-center gap-[7px] overflow-x-auto scrollbar-none mb-[18px] md:flex-wrap md:gap-2.5 md:mb-3">
        {SESSION_TYPE_PILLS.map((pill) => {
          const isActive = filters.sessionType === pill.value;
          return (
            <button
              key={pill.label}
              onClick={() =>
                onFiltersChange({ ...filters, sessionType: pill.value })
              }
              className={`flex-shrink-0 font-data text-[11px] px-[13px] py-[6px] rounded-full border transition-colors whitespace-nowrap ${
                isActive
                  ? "font-bold bg-[rgba(74,222,128,0.14)] border-[var(--accent)] text-[var(--accent)]"
                  : "font-semibold bg-[var(--card)] border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {pill.label}
            </button>
          );
        })}

        {/* Mobile: Filters button (always visible) */}
        <button
          onClick={openSheet}
          aria-label="Open filters"
          className="md:hidden relative flex-shrink-0 h-[30px] flex items-center gap-1.5 px-[10px] rounded-full border border-[var(--border)] bg-[var(--card)] text-[11px] font-semibold text-[var(--muted-foreground)] transition-colors"
        >
          <SlidersHorizontal className="h-[11px] w-[11px]" />
          Filters
          {advCount > 0 && (
            <span className="inline-flex items-center justify-center bg-[var(--amber)] text-[var(--bg)] text-[9px] font-black min-w-[14px] h-[14px] rounded-full px-0.5">
              {advCount}
            </span>
          )}
        </button>

        <div className="hidden md:flex flex-1" />

        {/* Desktop: Filters button */}
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className="hidden md:flex items-center gap-1.5 bg-[var(--card)] border border-[var(--border)] rounded-[9px] px-3 py-2 text-[12px] font-semibold text-[var(--foreground)] hover:border-[var(--muted-foreground)] transition-colors flex-shrink-0"
        >
          <SlidersHorizontal className="h-[13px] w-[13px]" />
          Filters
          {advCount > 0 && (
            <span className="inline-flex items-center justify-center bg-[var(--amber)] text-[var(--bg)] text-[10px] font-black min-w-[16px] h-[16px] rounded-full px-1">
              {advCount}
            </span>
          )}
        </button>
      </div>

      {/* Active filter pills row (server-side filters only) */}
      {hasAnyFilter && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {activePills.map((pill) => (
            <span
              key={pill.label}
              className="inline-flex items-center gap-1.5 bg-[rgba(210,153,34,0.14)] border border-[rgba(210,153,34,0.4)] text-[var(--amber)] text-[11px] font-semibold px-[11px] py-[5px] rounded-full"
            >
              {pill.label}
              <button
                onClick={pill.onRemove}
                aria-label={`Clear ${pill.label} filter`}
                className="opacity-70 hover:opacity-100 transition-opacity"
              >
                <X className="h-[10px] w-[10px]" />
              </button>
            </span>
          ))}

          {movementFilter && (
            <span className="inline-flex items-center gap-1.5 bg-[rgba(74,222,128,0.12)] border border-[rgba(74,222,128,0.3)] text-[var(--accent)] text-[11px] font-semibold px-[11px] py-[5px] rounded-full">
              movement: {movementFilter}
              {onClearMovementFilter && (
                <button
                  onClick={onClearMovementFilter}
                  aria-label="Clear movement filter"
                  className="opacity-70 hover:opacity-100 transition-opacity"
                >
                  <X className="h-[10px] w-[10px]" />
                </button>
              )}
            </span>
          )}

          {hasAnyFilter && (
            <button
              onClick={() => {
                onClear();
                if (onClearMovementFilter) onClearMovementFilter();
              }}
              className="text-[11px] font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors ml-1"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Advanced filters panel - desktop only */}
      {showAdvanced && (
        <div className="hidden md:flex bg-[var(--card)] border border-[var(--border)] rounded-[14px] p-[18px] mb-[14px] flex-wrap gap-6 items-end">
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
                      ? "bg-[var(--accent)] text-[var(--bg)]"
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

      {/* Mobile filter sheet */}
      <HistoryFilterSheet
        key={sheetKey}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        filters={filters}
        onFiltersChange={onFiltersChange}
        onClear={onClear}
      />
    </div>
  );
}
