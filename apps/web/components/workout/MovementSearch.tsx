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
import type { Movement } from "@/lib/api/types";

const MODALITY_COLOUR: Record<string, string> = {
  strength: "text-blue-400",
  gymnastics: "text-orange-400",
  mono_structural: "text-green-400",
  weightlifting: "text-yellow-400",
  plyometric: "text-red-400",
  carry: "text-amber-400",
  strongman: "text-rose-400",
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
        className="inline-flex min-w-40 items-center justify-start rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-left text-sm text-zinc-300 hover:border-zinc-600 hover:bg-zinc-700 transition-colors"
        aria-label="Search movement"
      >
        {displayName}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0 bg-zinc-900 border-zinc-700">
        <Command className="bg-zinc-900">
          <CommandInput
            placeholder="Search movements…"
            value={query}
            onValueChange={setQuery}
            className="text-zinc-200 placeholder:text-zinc-500"
          />
          <CommandList>
            <CommandEmpty className="py-4 text-center text-sm text-zinc-500">
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
                className="flex items-center justify-between px-3 py-2 text-zinc-200 data-[selected=true]:bg-zinc-800"
              >
                <span>{m.name}</span>
                <span
                  className={`text-xs ${
                    MODALITY_COLOUR[m.modality] ?? "text-zinc-500"
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
