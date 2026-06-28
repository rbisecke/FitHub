"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
  CommandGroup,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { api } from "@/lib/api/client";
import type { Movement } from "@/lib/api";
import { useIsMobile } from "@/lib/hooks/useIsMobile";

// ── Modality display config ────────────────────────────────────────────────────

const MODALITY_COLOUR: Record<string, string> = {
  strength: "text-[#58a6ff]",
  gymnastics: "text-[#bc8cff]",
  mono_structural: "text-[#3fb950]",
  weightlifting: "text-[#d29922]",
  plyometric: "text-[#ff7b72]",
  carry: "text-[#d29922]",
  strongman: "text-[#ff7b72]",
};

const MODALITY_ORDER = [
  "strength",
  "weightlifting",
  "gymnastics",
  "mono_structural",
  "plyometric",
  "carry",
  "strongman",
] as const;

// ── Props ──────────────────────────────────────────────────────────────────────

interface MovementSearchProps {
  accessToken: string;
  onSelect: (m: Movement) => void;
  initialName?: string;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function MovementSearch({
  accessToken,
  onSelect,
  initialName,
}: MovementSearchProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Movement[]>([]);
  const [selected, setSelected] = useState<Movement | null>(null);
  const [modalityFilter, setModalityFilter] = useState<string | null>(null);

  const search = useCallback(
    async (q: string, modality: string | null) => {
      try {
        // Use higher limit when browsing a modality with no query
        const limit = q.length === 0 ? 50 : 20;
        const data = await api.movements.search(accessToken, {
          ...(q ? { q } : {}),
          ...(modality ? { modality } : {}),
          limit,
        });
        setResults(data);
      } catch {
        setResults([]);
      }
    },
    [accessToken],
  );

  useEffect(() => {
    if (!open) return;
    // No query + no filter: show empty state, no network call
    if (!query && !modalityFilter) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => search(query, modalityFilter), 300);
    return () => clearTimeout(t);
  }, [open, query, modalityFilter, search]);

  // Clear query when popover closes
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  function handleSelect(m: Movement) {
    setSelected(m);
    onSelect(m);
    setOpen(false);
    setQuery("");
  }

  function handleModalityChange(mod: string | null) {
    setModalityFilter(mod);
    setQuery("");
  }

  const displayName = selected?.name ?? initialName ?? "Search movements…";

  // Group results in MODALITY_ORDER, drop empty groups
  const groupedResults: Array<{ modality: string; movements: Movement[] }> =
    MODALITY_ORDER.map((mod) => ({
      modality: mod,
      movements: results.filter((m) => m.modality === mod),
    })).filter(({ movements }) => movements.length > 0);

  const showLimitHint = results.length >= 20 && query.length > 0;

  const triggerClass =
    "inline-flex w-full min-h-[44px] items-center justify-start rounded-lg border border-[#30363d] bg-[#161b22] px-3 text-left text-sm text-[#8b949e] hover:border-[#58a6ff]/40 hover:text-[#e6edf3] transition-colors";

  const pickerContent = (
    <Command shouldFilter={false} className="bg-[#161b22]">
      <CommandInput
        placeholder={
          modalityFilter
            ? `Search ${modalityFilter.replace("_", "-")}…`
            : "Search movements…"
        }
        value={query}
        onValueChange={setQuery}
        className="text-[#e6edf3] placeholder:text-[#8b949e]"
      />
      <ModalityFilterPills
        active={modalityFilter}
        onChange={handleModalityChange}
      />
      <CommandList>
        {groupedResults.length === 0 && !query && !modalityFilter && (
          <p className="py-6 text-center text-xs text-[#8b949e]">
            Type to search, or pick a modality above.
          </p>
        )}
        {groupedResults.map(({ modality, movements }) => (
          <CommandGroup
            key={modality}
            heading={`${modality.replace(/_/g, "-").toUpperCase()} · ${
              movements.length
            }`}
          >
            {/* TODO: add @tanstack/react-virtual if any modality exceeds 150 items */}
            {movements.map((m) => (
              <CommandItem
                key={m.id}
                value={m.name}
                onSelect={() => handleSelect(m)}
                className="flex items-center justify-between px-3 py-2 text-[#e6edf3] data-[selected=true]:bg-[#21262d]"
              >
                <span className="truncate">{m.name}</span>
                <span
                  className={`ml-2 shrink-0 font-mono text-xs ${
                    MODALITY_COLOUR[m.modality] ?? "text-[#8b949e]"
                  }`}
                >
                  {m.modality.replace(/_/g, "-")}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
        {groupedResults.length === 0 && query.length > 0 && (
          <CommandEmpty className="py-4 text-center text-sm text-[#8b949e]">
            No movements found.
          </CommandEmpty>
        )}
        {showLimitHint && (
          <p className="border-t border-[#30363d] py-2 text-center text-xs text-[#8b949e]">
            Showing first 20 · type to narrow
          </p>
        )}
      </CommandList>
    </Command>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className={triggerClass} aria-label="Search movements">
          {displayName}
        </SheetTrigger>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="h-[82vh] bg-[#161b22] border-t border-[#30363d] p-0"
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-[#30363d]" />
          </div>
          {pickerContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={triggerClass} aria-label="Search movements">
        {displayName}
      </PopoverTrigger>
      <PopoverContent className="w-[min(90vw,420px)] p-0 bg-[#161b22] border-[#30363d]">
        {pickerContent}
      </PopoverContent>
    </Popover>
  );
}

// ── ModalityFilterPills ────────────────────────────────────────────────────────
// Unexported: only used inside MovementSearch.

const PILLS: Array<{ value: string | null; label: string; ariaLabel: string }> =
  [
    { value: null, label: "All", ariaLabel: "All modalities" },
    { value: "strength", label: "Str", ariaLabel: "Strength" },
    { value: "weightlifting", label: "WL", ariaLabel: "Weightlifting" },
    { value: "gymnastics", label: "Gym", ariaLabel: "Gymnastics" },
    { value: "mono_structural", label: "Mono", ariaLabel: "Mono-structural" },
    { value: "plyometric", label: "Plyo", ariaLabel: "Plyometric" },
    { value: "carry", label: "Carry", ariaLabel: "Carry" },
    { value: "strongman", label: "Strong", ariaLabel: "Strongman" },
  ];

const MODALITY_ACCENT: Record<string, string> = {
  strength: "#58a6ff",
  weightlifting: "#d29922",
  gymnastics: "#bc8cff",
  mono_structural: "#3fb950",
  plyometric: "#ff7b72",
  carry: "#d29922",
  strongman: "#ff7b72",
};

function ModalityFilterPills({
  active,
  onChange,
}: {
  active: string | null;
  onChange: (modality: string | null) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-[#30363d] px-2 py-1.5 scrollbar-none">
      {PILLS.map(({ value, label, ariaLabel }) => {
        const isActive = active === value;
        const accent = value ? MODALITY_ACCENT[value] : null;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onChange(value)}
            aria-label={ariaLabel}
            aria-pressed={isActive}
            style={
              isActive && accent
                ? {
                    color: accent,
                    borderColor: accent,
                    backgroundColor: `${accent}1a`,
                  }
                : undefined
            }
            className={[
              "shrink-0 rounded-full border px-2.5 py-0.5 font-mono text-xs transition-colors",
              isActive && !accent
                ? "border-[#58a6ff] bg-[#58a6ff]/10 text-[#58a6ff]"
                : !isActive
                  ? "border-[#30363d] text-[#8b949e] hover:border-[#58a6ff]/40 hover:text-[#e6edf3]"
                  : "",
            ].join(" ")}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
