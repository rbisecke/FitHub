"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { api } from "@/lib/api/client";
import type { Movement } from "@/lib/api";

const MODALITY_COLOUR: Record<string, string> = {
  strength: "text-[#58a6ff]",
  gymnastics: "text-[#bc8cff]",
  mono_structural: "text-[#3fb950]",
  weightlifting: "text-[#d29922]",
  plyometric: "text-[#ff7b72]",
  carry: "text-[#d29922]",
  strongman: "text-[#ff7b72]",
};

interface MovementSearchProps {
  accessToken: string;
  onSelect: (m: Movement) => void;
  initialName?: string;
}

export function MovementSearch({
  accessToken,
  onSelect,
  initialName,
}: MovementSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Movement[]>([]);
  const [selected, setSelected] = useState<Movement | null>(null);

  const search = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setResults([]);
        return;
      }
      try {
        const data = await api.movements.search(accessToken, { q });
        setResults(data);
      } catch {
        setResults([]);
      }
    },
    [accessToken],
  );

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  const displayName = selected?.name ?? initialName ?? "Search movement…";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="inline-flex w-full min-h-[44px] items-center justify-start rounded-lg border border-[#30363d] bg-[#161b22] px-3 text-left text-sm text-[#8b949e] hover:border-[#58a6ff]/40 hover:text-[#e6edf3] transition-colors"
        aria-label="Search movements"
      >
        {displayName}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0 bg-[#161b22] border-[#30363d]">
        <Command className="bg-[#161b22]">
          <CommandInput
            placeholder="Search movements…"
            value={query}
            onValueChange={setQuery}
            className="text-[#e6edf3] placeholder:text-[#8b949e]"
          />
          <CommandList>
            <CommandEmpty className="py-4 text-center text-sm text-[#8b949e]">
              No movements found.
            </CommandEmpty>
            {results.map((m) => (
              <CommandItem
                key={m.id}
                value={m.name}
                onSelect={() => {
                  setSelected(m);
                  onSelect(m);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex items-center justify-between px-3 py-2 text-[#e6edf3] data-[selected=true]:bg-[#21262d]"
              >
                <span>{m.name}</span>
                <span
                  className={`text-xs ${
                    MODALITY_COLOUR[m.modality] ?? "text-[#8b949e]"
                  }`}
                >
                  {m.modality}
                </span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
