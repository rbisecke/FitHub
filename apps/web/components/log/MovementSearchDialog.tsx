"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api/client";
import type { Movement } from "@/lib/api";

const MODALITY_LABEL: Record<string, string> = {
  strength: "Str",
  weightlifting: "WL",
  gymnastics: "Gym",
  mono_structural: "Cardio",
  plyometric: "Plyo",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accessToken: string;
  onSelect: (m: { id: string; name: string; modality: string | null }) => void;
}

export function MovementSearchDialog({
  open,
  onOpenChange,
  accessToken,
  onSelect,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!open) return;

    debounceRef.current = setTimeout(() => {
      setLoading(true);
      api.movements
        .search(accessToken, { q: query || undefined, limit: 20 })
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open, accessToken]);

  function handleSelect(m: Movement) {
    onSelect({ id: m.id, name: m.name, modality: m.modality });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-sm p-0 overflow-hidden"
        showCloseButton={false}
      >
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="sr-only">Browse movements</DialogTitle>
          <input
            autoFocus
            type="text"
            placeholder="Search movements..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent)] focus:outline-none"
          />
        </DialogHeader>

        <div className="max-h-72 overflow-y-auto px-2 py-2">
          {loading ? (
            <div className="flex flex-col gap-1 px-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-9 rounded-lg bg-[var(--border)] animate-pulse"
                />
              ))}
            </div>
          ) : results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">
              {query
                ? `No movements matching "${query}"`
                : "No movements found"}
            </p>
          ) : (
            <div className="flex flex-col gap-0.5">
              {results.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelect(m)}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm hover:bg-[var(--surface-2)] transition-colors"
                >
                  <span className="font-sans text-[var(--foreground)]">
                    {m.name}
                  </span>
                  {m.modality && (
                    <span className="font-data text-[10px] text-[var(--muted-foreground)] bg-[var(--surface-2)] px-[7px] py-[2px] rounded-[6px] shrink-0 ml-2">
                      {MODALITY_LABEL[m.modality] ?? m.modality}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
