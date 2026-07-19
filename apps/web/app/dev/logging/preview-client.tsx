"use client";

import { useState } from "react";
import type { Movement } from "@/lib/api";
import { MovementEntryCard } from "@/components/logging/MovementEntryCard";
import type { DraftEntry, DraftSet } from "@/components/logging/types";
import { emptySet } from "@/components/logging/types";
import type { SetTableVariant } from "@/components/logging/types";

/**
 * Dev-only preview (Effort 3, 01 §2.7). Renders the SAME MovementEntryCard/SetTable
 * used in production with realistic example data so both set-table variants can be
 * screenshotted and compared at true 375px — the open decision the human resolves.
 * Not part of the shipping app.
 */

const MOVEMENT: Movement = {
  id: "demo",
  name: "Bench Press",
  slug: "bench-press",
  base_movement: "Bench Press",
  modality: "strength",
  start_position: null,
  catch_position: null,
  pause_position: null,
  tempo: null,
  execution_style: null,
  movement_pattern: "push_horizontal",
  limb_style: "bilateral",
  implement: "Barbell",
  default_result_types: ["weight"],
  default_result_type: "weight",
  is_official: true,
  created_by: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function set(
  load: string,
  reps: string,
  opts: Partial<DraftSet> = {},
): DraftSet {
  return { ...emptySet(), load, reps, ...opts };
}

function demoEntry(): DraftEntry {
  return {
    id: "demo-entry",
    movement: MOVEMENT,
    resultType: "weight",
    implement: "Barbell",
    side: null,
    note: "",
    scaled: false,
    sets: [
      set("60", "8", { completed: true }),
      set("62.5", "5", { completed: true, isPr: true }),
      set("62.5", ""),
    ],
    previous: [
      { load: 60, reps: 8 },
      { load: 62.5, reps: 6 },
      { load: 62.5, reps: 5 },
    ],
    bestE1rmKg: 72.5,
    contextState: "loaded",
  };
}

export function LoggingPreviewClient() {
  const [entryA, setEntryA] = useState<DraftEntry>(demoEntry());
  const [entryB, setEntryB] = useState<DraftEntry>(demoEntry());

  const makeHandlers = (
    setEntry: React.Dispatch<React.SetStateAction<DraftEntry>>,
  ) => ({
    onSetChange: (setId: string, field: keyof DraftSet, value: string) =>
      setEntry((e) => ({
        ...e,
        sets: e.sets.map((s) =>
          s.id === setId ? { ...s, [field]: value } : s,
        ),
      })),
    onToggleComplete: (setId: string) =>
      setEntry((e) => ({
        ...e,
        sets: e.sets.map((s) =>
          s.id === setId ? { ...s, completed: !s.completed } : s,
        ),
      })),
    onCopyPrevious: () => {},
    onAddSet: () => setEntry((e) => ({ ...e, sets: [...e.sets, emptySet()] })),
    onOpenCalculator: () => {},
    onRemove: () => {},
    onSetScaled: (scaled: boolean) => setEntry((e) => ({ ...e, scaled })),
    onRetryContext: () => {},
  });

  const panel = (
    variant: SetTableVariant,
    entry: DraftEntry,
    setEntry: React.Dispatch<React.SetStateAction<DraftEntry>>,
    caption: string,
  ) => (
    <div className="flex-1">
      <p
        className="mb-2 font-data text-[12px] font-semibold"
        style={{ color: "var(--text)" }}
      >
        Variant {variant} — {caption}
      </p>
      <MovementEntryCard
        entry={entry}
        variant={variant}
        weightUnit="kg"
        {...makeHandlers(setEntry)}
      />
    </div>
  );

  return (
    <div
      data-theme="light"
      className="min-h-svh p-4"
      style={{ background: "var(--bg)" }}
    >
      <h1
        className="mb-1 font-sans text-[18px] font-bold"
        style={{ color: "var(--text)" }}
      >
        Set table — Variant A vs B (01 §2.7)
      </h1>
      <p
        className="mb-6 font-sans text-[13px]"
        style={{ color: "var(--muted)" }}
      >
        The open decision: Hevy ghosted-inline previous (A) vs Strong separate
        Previous column (B). Compare at 375px.
      </p>
      <div className="flex flex-col gap-6 md:flex-row">
        {panel("A", entryA, setEntryA, "ghosted-inline previous")}
        {panel("B", entryB, setEntryB, "separate Previous column")}
      </div>
    </div>
  );
}
