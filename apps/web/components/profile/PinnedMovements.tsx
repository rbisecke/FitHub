"use client";

import { useState } from "react";
import type { PinnedMovement } from "@/lib/api";
import { Separator } from "@/components/ui/separator";
import { PinnedMovementCard } from "./PinnedMovementCard";
import { PinnedMovementEdit } from "./PinnedMovementEdit";

interface PinnedMovementsProps {
  initial: PinnedMovement[];
  accessToken: string;
}

export function PinnedMovements({
  initial,
  accessToken,
}: PinnedMovementsProps) {
  const [pinned, setPinned] = useState<PinnedMovement[]>(
    [...initial].sort((a, b) => a.display_order - b.display_order),
  );
  const [editOpen, setEditOpen] = useState(false);

  return (
    <section className="space-y-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-1">
        <h2 className="font-mono text-[10px] uppercase tracking-widest text-[#8b949e]">
          Pinned movements
        </h2>
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          aria-label="Edit pinned movements"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-xs font-mono text-[#58a6ff] hover:text-[#79c0ff] transition-colors"
        >
          [edit]
        </button>
      </div>
      <Separator className="bg-[#30363d]" />

      {/* Cards or empty state */}
      {pinned.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <p className="text-sm text-[#8b949e]">No pinned movements yet.</p>
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="min-h-[44px] px-4 flex items-center gap-1 text-sm font-mono text-[#58a6ff] hover:text-[#79c0ff] border border-[#30363d] rounded-lg transition-colors"
          >
            + Pin a movement
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 pt-2">
          {pinned.map((m) => (
            <PinnedMovementCard key={m.movement_id} movement={m} />
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
