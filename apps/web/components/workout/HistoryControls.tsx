"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { HistoryFilterSheet } from "./HistoryFilterSheet";

export interface HistoryFilters {
  sessionType: string | null;
  partnerFilter: "all" | "solo" | "partner";
  dateFrom: string | null;
  dateTo: string | null;
}

export const DEFAULT_FILTERS: HistoryFilters = {
  sessionType: null,
  partnerFilter: "all",
  dateFrom: null,
  dateTo: null,
};

export function isFilterActive(filters: HistoryFilters): boolean {
  return (
    filters.sessionType !== null ||
    filters.partnerFilter !== "all" ||
    filters.dateFrom !== null ||
    filters.dateTo !== null
  );
}

function activeFilterCount(filters: HistoryFilters): number {
  return [
    filters.sessionType !== null,
    filters.partnerFilter !== "all",
    filters.dateFrom !== null,
    filters.dateTo !== null,
  ].filter(Boolean).length;
}

const SESSION_TYPE_OPTIONS = [
  { value: "strength", label: "Strength" },
  { value: "metcon", label: "Metcon" },
  { value: "skill", label: "Skill" },
  { value: "mixed", label: "Mixed" },
  { value: "rest", label: "Rest" },
  { value: "deload", label: "Deload" },
  { value: "active_recovery", label: "Active Recovery" },
];

interface HistoryControlsProps {
  filters: HistoryFilters;
  onFiltersChange: (filters: HistoryFilters) => void;
  onClear: () => void;
}

export function HistoryControls({
  filters,
  onFiltersChange,
  onClear,
}: HistoryControlsProps) {
  const count = activeFilterCount(filters);
  const hasFilters = count > 0;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetKey, setSheetKey] = useState(0);

  function openSheet() {
    setSheetKey((k) => k + 1);
    setSheetOpen(true);
  }

  return (
    <>
      {/* Mobile: filter icon + optional clear */}
      <div className="flex items-center gap-2 md:hidden">
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-xs text-[#8b949e] hover:text-[#e6edf3] px-2 h-7"
          >
            Clear
          </Button>
        )}
        <button
          onClick={openSheet}
          aria-label="Open filters"
          className="relative h-8 w-8 flex items-center justify-center rounded border border-[#30363d] text-[#8b949e] hover:border-[#58a6ff]/40 hover:text-[#e6edf3] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#58a6ff]"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-[#58a6ff] text-[#0d1117] text-[10px] font-bold flex items-center justify-center leading-none">
              {count}
            </span>
          )}
        </button>
        <HistoryFilterSheet
          key={sheetKey}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          filters={filters}
          onFiltersChange={onFiltersChange}
          onClear={onClear}
        />
      </div>

      {/* Desktop: inline filter row */}
      <div className="hidden md:flex items-center gap-2 flex-wrap">
        <Select
          value={filters.sessionType ?? "all"}
          onValueChange={(v) =>
            onFiltersChange({
              ...filters,
              sessionType: v === "all" ? null : v,
            })
          }
        >
          <SelectTrigger className="h-8 w-40 text-xs border-[#30363d] bg-[#161b22] text-[#8b949e] focus:ring-[#58a6ff]">
            <SelectValue placeholder="Type: All" />
          </SelectTrigger>
          <SelectContent className="bg-[#161b22] border-[#30363d]">
            <SelectItem value="all" className="text-[#8b949e] text-xs">
              All types
            </SelectItem>
            {SESSION_TYPE_OPTIONS.map(({ value, label }) => (
              <SelectItem key={value} value={value} className="text-xs">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex rounded border border-[#30363d] overflow-hidden">
          {(["all", "solo", "partner"] as const).map((v) => (
            <button
              key={v}
              onClick={() => onFiltersChange({ ...filters, partnerFilter: v })}
              className={`px-3 py-1 text-xs font-mono capitalize transition-colors ${
                filters.partnerFilter === v
                  ? "bg-[#21262d] text-[#e6edf3]"
                  : "text-[#8b949e] hover:text-[#e6edf3]"
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        <Input
          type="date"
          value={filters.dateFrom ?? ""}
          onChange={(e) =>
            onFiltersChange({ ...filters, dateFrom: e.target.value || null })
          }
          className="h-8 w-36 text-xs border-[#30363d] bg-[#161b22] text-[#8b949e] [color-scheme:dark]"
          aria-label="Filter from date"
        />
        <span className="text-[#8b949e] text-xs select-none">—</span>
        <Input
          type="date"
          value={filters.dateTo ?? ""}
          onChange={(e) =>
            onFiltersChange({ ...filters, dateTo: e.target.value || null })
          }
          className="h-8 w-36 text-xs border-[#30363d] bg-[#161b22] text-[#8b949e] [color-scheme:dark]"
          aria-label="Filter to date"
        />

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-8 px-2 text-xs text-[#8b949e] hover:text-[#e6edf3]"
          >
            Clear filters
          </Button>
        )}
      </div>
    </>
  );
}
