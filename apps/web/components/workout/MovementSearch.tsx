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
  strength: "text-[var(--accent)]",
  gymnastics: "text-[var(--purple)]",
  mono_structural: "text-[var(--green)]",
  weightlifting: "text-[var(--amber)]",
  plyometric: "text-[var(--red)]",
  carry: "text-[var(--amber)]",
  strongman: "text-[var(--red)]",
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
    // No query + no filter: no network call; stale results are hidden via displayResults below
    if (!query && !modalityFilter) return;
    const t = setTimeout(() => search(query, modalityFilter), 300);
    return () => clearTimeout(t);
  }, [open, query, modalityFilter, search]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) setQuery("");
  }

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

  // Hide stale results when picker is in the no-query/no-filter empty state
  const displayResults = query || modalityFilter ? results : [];

  // Group results in MODALITY_ORDER, drop empty groups
  const groupedResults: Array<{ modality: string; movements: Movement[] }> =
    MODALITY_ORDER.map((mod) => ({
      modality: mod,
      movements: displayResults.filter((m) => m.modality === mod),
    })).filter(({ movements }) => movements.length > 0);

  const showLimitHint = displayResults.length >= 20 && query.length > 0;

  const triggerClass =
    "inline-flex w-full min-h-[44px] items-center justify-start rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-left text-sm text-[var(--muted)] hover:border-[var(--accent)]/40 hover:text-[var(--text)] transition-colors";

  const pickerContent = (
    <Command shouldFilter={false} className="bg-[var(--surface)]">
      <CommandInput
        placeholder={
          modalityFilter
            ? `Search ${modalityFilter.replace("_", "-")}…`
            : "Search movements…"
        }
        value={query}
        onValueChange={setQuery}
        className="text-[var(--text)] placeholder:text-[var(--muted)]"
      />
      <ModalityFilterPills
        active={modalityFilter}
        onChange={handleModalityChange}
      />
      <CommandList>
        {groupedResults.length === 0 && !query && !modalityFilter && (
          <p className="py-6 text-center text-xs text-[var(--muted)]">
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
                className="flex items-center justify-between px-3 py-2 text-[var(--text)] data-[selected=true]:bg-[var(--surface)]"
              >
                <span className="truncate">{m.name}</span>
                <span
                  className={`ml-2 shrink-0 font-mono text-xs ${
                    MODALITY_COLOUR[m.modality] ?? "text-[var(--muted)]"
                  }`}
                >
                  {m.modality.replace(/_/g, "-")}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
        {groupedResults.length === 0 && query.length > 0 && (
          <CommandEmpty className="py-4 text-center text-sm text-[var(--muted)]">
            No movements found.
          </CommandEmpty>
        )}
        {showLimitHint && (
          <p className="border-t border-[var(--border)] py-2 text-center text-xs text-[var(--muted)]">
            Showing first 20 · type to narrow
          </p>
        )}
      </CommandList>
    </Command>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetTrigger className={triggerClass} aria-label="Search movements">
          {displayName}
        </SheetTrigger>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="h-[82vh] bg-[var(--surface)] border-t border-[var(--border)] p-0"
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-[var(--border)]" />
          </div>
          {pickerContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger className={triggerClass} aria-label="Search movements">
        {displayName}
      </PopoverTrigger>
      <PopoverContent className="w-[min(90vw,420px)] p-0 bg-[var(--surface)] border-[var(--border)]">
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
  strength: "var(--accent)",
  weightlifting: "var(--amber)",
  gymnastics: "var(--purple)",
  mono_structural: "var(--green)",
  plyometric: "var(--red)",
  carry: "var(--amber)",
  strongman: "var(--red)",
};

function ModalityFilterPills({
  active,
  onChange,
}: {
  active: string | null;
  onChange: (modality: string | null) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-[var(--border)] px-2 py-1.5 scrollbar-none">
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
                ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                : !isActive
                  ? "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]/40 hover:text-[var(--text)]"
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
