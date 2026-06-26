"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MovementSearch } from "@/components/workout/MovementSearch";
import { api } from "@/lib/api/client";
import type { PinnedMovement } from "@/lib/api";
import type { Movement } from "@/lib/api";

const MAX_PINS = 6;

interface PinnedMovementEditProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pinned: PinnedMovement[];
  accessToken: string;
  onSaved: (updated: PinnedMovement[]) => void;
}

export function PinnedMovementEdit({
  open,
  onOpenChange,
  pinned,
  accessToken,
  onSaved,
}: PinnedMovementEditProps) {
  const [localPinned, setLocalPinned] = useState<PinnedMovement[]>(() =>
    [...pinned].sort((a, b) => a.display_order - b.display_order),
  );
  const [saving, setSaving] = useState(false);

  // Reset local state whenever the dialog opens fresh
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setLocalPinned(
        [...pinned].sort((a, b) => a.display_order - b.display_order),
      );
    }
    onOpenChange(next);
  };

  const handleSelect = (m: Movement) => {
    if (localPinned.length >= MAX_PINS) return;
    if (localPinned.some((p) => p.movement_id === m.id)) return;
    setLocalPinned((prev) => [
      ...prev,
      {
        movement_id: m.id,
        movement_name: m.name,
        modality: m.modality,
        display_order: prev.length,
        personal_record: null,
      },
    ]);
  };

  const handleRemove = (movementId: string) => {
    setLocalPinned((prev) =>
      prev
        .filter((p) => p.movement_id !== movementId)
        .map((p, i) => ({ ...p, display_order: i })),
    );
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setLocalPinned((prev) => {
      const next = [...prev];
      const tmp = next[index - 1];
      next[index - 1] = next[index]!;
      next[index] = tmp!;
      return next.map((p, i) => ({ ...p, display_order: i }));
    });
  };

  const handleMoveDown = (index: number) => {
    setLocalPinned((prev) => {
      if (index === prev.length - 1) return prev;
      const next = [...prev];
      const tmp = next[index + 1];
      next[index + 1] = next[index]!;
      next[index] = tmp!;
      return next.map((p, i) => ({ ...p, display_order: i }));
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await api.profile.setPinnedMovements(
        accessToken,
        localPinned.map((p) => p.movement_id),
      );
      onSaved(result);
      onOpenChange(false);
    } catch {
      // Keep dialog open on error
    } finally {
      setSaving(false);
    }
  };

  const atMax = localPinned.length >= MAX_PINS;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-[#161b22] border-[#30363d] text-[#e6edf3] max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm text-[#8b949e]">
            $ git stash -- pinned
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Search */}
          <div>
            {atMax ? (
              <p className="text-xs text-[#8b949e] py-2">
                Max {MAX_PINS} movements pinned.
              </p>
            ) : (
              <MovementSearch
                accessToken={accessToken}
                onSelect={handleSelect}
              />
            )}
          </div>

          {/* List */}
          <div className="space-y-1">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#8b949e]">
              Pinned ({localPinned.length}/{MAX_PINS})
            </p>
            {localPinned.length === 0 && (
              <p className="text-sm text-[#8b949e] py-2">
                No movements pinned.
              </p>
            )}
            {localPinned.map((p, i) => (
              <div
                key={p.movement_id}
                className="flex items-center gap-2 rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-2"
              >
                {/* Up/Down controls */}
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(i)}
                    disabled={i === 0}
                    aria-label={`Move ${p.movement_name} up`}
                    className="min-h-[22px] min-w-[22px] text-[#8b949e] hover:text-[#e6edf3] disabled:opacity-30 disabled:cursor-not-allowed text-xs leading-none"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(i)}
                    disabled={i === localPinned.length - 1}
                    aria-label={`Move ${p.movement_name} down`}
                    className="min-h-[22px] min-w-[22px] text-[#8b949e] hover:text-[#e6edf3] disabled:opacity-30 disabled:cursor-not-allowed text-xs leading-none"
                  >
                    ▼
                  </button>
                </div>

                {/* Name */}
                <span className="flex-1 text-sm text-[#e6edf3] truncate">
                  {p.movement_name}
                </span>

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => handleRemove(p.movement_id)}
                  aria-label={`Remove ${p.movement_name}`}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#8b949e] hover:text-[#ff7b72] transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1 border-[#30363d] bg-transparent text-[#8b949e] hover:bg-[#21262d] hover:text-[#e6edf3]"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-[#238636] hover:bg-[#2ea043] text-white border-0"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
