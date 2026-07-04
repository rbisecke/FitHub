"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { HistoryFilters } from "./HistoryControls";

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
  // Local state is initialized once per mount from parent filters.
  // The parent uses a key prop to force remount when the sheet reopens.
  const [local, setLocal] = useState<HistoryFilters>(filters);

  // Visible drives the CSS transition; mounted controls DOM presence.
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      // All state updates deferred to rAF to satisfy react-hooks/set-state-in-effect
      const raf = requestAnimationFrame(() => {
        setMounted(true);
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(raf);
    } else {
      // Delay state updates to allow exit animation to complete
      exitTimerRef.current = setTimeout(() => {
        setVisible(false);
        exitTimerRef.current = setTimeout(() => setMounted(false), 210);
      }, 0);
      return () => {
        if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      };
    }
  }, [open]);

  function handleApply() {
    onFiltersChange(local);
    onOpenChange(false);
  }

  function handleClear() {
    onClear();
    onOpenChange(false);
  }

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-black/60"
        style={{
          opacity: visible ? 1 : 0,
          transition: "opacity 150ms ease",
        }}
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Sheet panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Filter workouts"
        className="relative bg-[#161b22] border-t border-[#30363d] max-h-[85vh] overflow-y-auto"
        style={{
          borderRadius: "16px 16px 0 0",
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: visible
            ? "transform 240ms cubic-bezier(.2,.9,.3,1)"
            : "transform 200ms ease-in",
        }}
      >
        {/* Grab handle — 32×4px, #30363d, 4px radius, 12px from top */}
        <div
          className="flex justify-center"
          style={{ paddingTop: 12, paddingBottom: 8 }}
        >
          <div
            style={{
              width: 32,
              height: 4,
              borderRadius: 4,
              background: "#30363d",
            }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4">
          <h2 className="text-[#e6edf3] text-base font-semibold">Filters</h2>
          <button
            onClick={() => onOpenChange(false)}
            aria-label="Close filters"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8b949e] hover:text-[#e6edf3] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 space-y-6 pb-4">
          {/* Entry type */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">
              Entry type
            </p>
            <div className="flex gap-2 flex-wrap">
              {(
                [
                  { value: "all", label: "All" },
                  { value: "tags-only", label: "Tags only" },
                  { value: "no-tags", label: "Commits only" },
                ] as const
              ).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setLocal({ ...local, tagsFilter: value })}
                  className={`px-3 py-3 rounded-full text-xs font-mono border transition-colors ${
                    local.tagsFilter === value
                      ? "bg-[#21262d] border-[#58a6ff] text-[#e6edf3]"
                      : "border-[#30363d] text-[#8b949e] hover:border-[#58a6ff]/40 hover:text-[#e6edf3]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

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

        <div className="flex gap-3 px-5 pb-6 pt-2">
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
      </div>
    </div>
  );
}
