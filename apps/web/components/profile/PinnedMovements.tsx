"use client";

import { useState } from "react";
import type { PinnedMovement } from "@/lib/api";
import { Separator } from "@/components/ui/separator";
import { PinnedMovementCard } from "./PinnedMovementCard";
import { PinnedMovementEdit } from "./PinnedMovementEdit";
import { useUserPrefs } from "@/lib/contexts/UserPrefsContext";

interface PinnedMovementsProps {
  initial: PinnedMovement[];
  accessToken: string;
}

export function PinnedMovements({
  initial,
  accessToken,
}: PinnedMovementsProps) {
  const { weightUnit } = useUserPrefs();
  const unit = weightUnit === "lb" ? "lb" : "kg";
  const [pinned, setPinned] = useState<PinnedMovement[]>(
    [...initial].sort((a, b) => a.display_order - b.display_order),
  );
  const [editOpen, setEditOpen] = useState(false);

  return (
    <section className="space-y-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-1">
        <h2 className="font-mono text-xs uppercase tracking-widest text-[var(--muted)]">
          Pinned movements
        </h2>
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          aria-label="Edit pinned movements"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-xs font-mono text-[var(--accent)] hover:brightness-110 transition-colors"
        >
          [edit]
        </button>
      </div>
      <Separator className="bg-[var(--border)]" />

      {/* Cards or empty state */}
      {pinned.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <p className="text-sm text-[var(--muted)]">
            No pinned movements yet.
          </p>
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="min-h-[44px] px-4 flex items-center gap-1 text-sm font-mono text-[var(--accent)] hover:brightness-110 border border-[var(--border)] rounded-lg transition-colors"
          >
            + Pin a movement
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 pt-2">
          {pinned.map((m) => (
            <PinnedMovementCard
              key={m.movement_id}
              movement={m}
              weightUnit={unit}
            />
          ))}
        </div>
      )}

      <PinnedMovementEdit
        open={editOpen}
        onOpenChange={setEditOpen}
        pinned={pinned}
        accessToken={accessToken}
        onSaved={setPinned}
      />
    </section>
  );
}
