"use client";

import { useEffect, useState } from "react";
import { ArrowUp, ArrowDown, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import type { PinnedMovement, Movement } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const MAX_PINS = 6;

/**
 * Pinned movements manager (08 §3, FR §3.4). Reordering uses explicit up/down
 * controls (not drag-and-drop) and an explicit "Save order" commit button —
 * the PUT is a full transactional delete+reinsert, so batching edits behind
 * one deliberate save avoids firing that replace on every reorder click.
 */
export function PinnedMovementsSection({
  token,
  loading,
  pins,
  onPinsChange,
}: {
  token: string;
  loading: boolean;
  pins: PinnedMovement[];
  onPinsChange: (pins: PinnedMovement[]) => void;
}) {
  const [working, setWorking] = useState<PinnedMovement[]>(pins);
  // Reset the local working copy whenever the parent's saved pins change
  // (e.g. after a successful save) — adjusted during render per React's
  // guidance for resetting state from props, rather than a useEffect, since
  // a synchronous setState at the top of an effect body is disallowed here.
  const [syncedPins, setSyncedPins] = useState(pins);
  if (pins !== syncedPins) {
    setSyncedPins(pins);
    setWorking(pins);
  }

  const [query, setQuery] = useState("");
  const [rawResults, setRawResults] = useState<Movement[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  // Below the 2-char minimum there is nothing to show even if a stale result
  // set lingers in state — filtered at render instead of cleared inside the
  // effect, so the effect only ever setStates from within its async callbacks.
  const results = query.trim().length < 2 ? [] : rawResults;

  useEffect(() => {
    if (query.trim().length < 2 || working.length >= MAX_PINS) {
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) setSearching(true);
      api.movements
        .search(token, { q: query, limit: 8 }, { signal: controller.signal })
        .then((movements) => {
          if (!cancelled) setRawResults(movements);
        })
        .catch((err) => {
          if (!cancelled && !controller.signal.aborted) {
            toast.error("Movement search failed.");
            void err;
          }
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, token, working.length]);

  function addMovement(m: Movement) {
    if (working.length >= MAX_PINS) return;
    if (working.some((p) => p.movement_id === m.id)) return;
    setWorking((prev) => [
      ...prev,
      {
        movement_id: m.id,
        movement_name: m.name,
        modality: m.modality,
        display_order: prev.length,
      },
    ]);
    setQuery("");
    setRawResults([]);
  }

  function remove(movementId: string) {
    setWorking((prev) => prev.filter((p) => p.movement_id !== movementId));
  }

  function move(index: number, dir: -1 | 1) {
    setWorking((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  }

  const dirty =
    working.length !== pins.length ||
    working.some((p, i) => p.movement_id !== pins[i]?.movement_id);

  async function saveOrder() {
    setSaving(true);
    try {
      const saved = await api.profile.setPinnedMovements(
        token,
        working.map((p) => p.movement_id),
      );
      onPinsChange(saved);
      toast.success("Pinned movements saved.");
    } catch {
      toast.error("Couldn't save pinned movements. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
      <h2 className="type-h3">Pinned movements</h2>

      {loading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ) : working.length === 0 ? (
        <p className="type-small text-muted-foreground">
          Pin up to 6 movements for quick reference
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {working.map((p, i) => (
            <li
              key={p.movement_id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
            >
              <span className="type-small font-medium">{p.movement_name}</span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Move ${p.movement_name} up`}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Move ${p.movement_name} down`}
                  disabled={i === working.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Unpin ${p.movement_name}`}
                  onClick={() => remove(p.movement_id)}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-1.5">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search movements to pin…"
          disabled={working.length >= MAX_PINS}
          aria-label="Search movements to pin"
        />
        {working.length >= MAX_PINS && (
          <p className="type-caption">Max 6 movements pinned</p>
        )}
        {searching && (
          <p className="type-caption flex items-center gap-1">
            <Loader2 className="size-3 animate-spin" aria-hidden />
            Searching…
          </p>
        )}
        {results.length > 0 && (
          <ul className="flex flex-col gap-1 rounded-lg border border-border bg-popover p-1">
            {results.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => addMovement(m)}
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-secondary"
                >
                  {m.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Button
        type="button"
        onClick={saveOrder}
        disabled={!dirty || saving}
        aria-busy={saving}
        className="self-start"
      >
        {saving ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          "Save order"
        )}
      </Button>
    </section>
  );
}
