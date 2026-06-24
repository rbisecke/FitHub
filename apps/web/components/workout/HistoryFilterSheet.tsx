"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { HistoryFilters } from "./HistoryControls";
import { useState } from "react";

const SESSION_TYPE_OPTIONS = [
  { value: null, label: "All" },
  { value: "strength", label: "Strength" },
  { value: "metcon", label: "Metcon" },
  { value: "skill", label: "Skill" },
  { value: "mixed", label: "Mixed" },
  { value: "rest", label: "Rest" },
  { value: "deload", label: "Deload" },
  { value: "active_recovery", label: "Active Recovery" },
];

interface HistoryFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: HistoryFilters;
  onFiltersChange: (filters: HistoryFilters) => void;
  onClear: () => void;
}

export function HistoryFilterSheet({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  onClear,
}: HistoryFilterSheetProps) {
  const [local, setLocal] = useState<HistoryFilters>(filters);

  function handleApply() {
    onFiltersChange(local);
    onOpenChange(false);
  }

  function handleClear() {
    onClear();
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="bg-[#161b22] border-t border-[#30363d] max-h-[85vh] overflow-y-auto"
      >
        <SheetHeader className="mb-5">
          <SheetTitle className="text-[#e6edf3] text-left text-base">
            Filters
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 pb-2">
          {/* Session type */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">
              Session type
            </p>
            <div className="flex flex-wrap gap-2">
              {SESSION_TYPE_OPTIONS.map(({ value, label }) => (
                <button
                  key={label}
                  onClick={() => setLocal({ ...local, sessionType: value })}
                  className={`px-3 py-3 rounded-full text-xs font-mono border transition-colors ${
                    local.sessionType === value
                      ? "bg-[#21262d] border-[#58a6ff] text-[#e6edf3]"
                      : "border-[#30363d] text-[#8b949e] hover:border-[#58a6ff]/40 hover:text-[#e6edf3]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Partner */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">
              Partner
            </p>
            <div className="flex gap-2">
              {(["all", "solo", "partner"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setLocal({ ...local, partnerFilter: v })}
                  className={`px-3 py-3 rounded-full text-xs font-mono border capitalize transition-colors ${
                    local.partnerFilter === v
                      ? "bg-[#21262d] border-[#58a6ff] text-[#e6edf3]"
                      : "border-[#30363d] text-[#8b949e] hover:border-[#58a6ff]/40 hover:text-[#e6edf3]"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">
              Date range
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-[#8b949e]">From</label>
                <Input
                  type="date"
                  value={local.dateFrom ?? ""}
                  onChange={(e) =>
                    setLocal({ ...local, dateFrom: e.target.value || null })
                  }
                  className="h-9 text-sm border-[#30363d] bg-[#0d1117] text-[#8b949e] [color-scheme:dark]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[#8b949e]">To</label>
                <Input
                  type="date"
                  value={local.dateTo ?? ""}
                  onChange={(e) =>
                    setLocal({ ...local, dateTo: e.target.value || null })
                  }
                  className="h-9 text-sm border-[#30363d] bg-[#0d1117] text-[#8b949e] [color-scheme:dark]"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            className="flex-1 border-[#30363d] text-[#8b949e] hover:border-[#58a6ff]/40 hover:text-[#e6edf3]"
            onClick={handleClear}
          >
            Clear
          </Button>
          <Button
            className="flex-1 bg-[#58a6ff] text-[#0d1117] hover:bg-[#58a6ff]/90"
            onClick={handleApply}
          >
            Apply
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
