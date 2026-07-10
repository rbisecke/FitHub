"use client";

import { ArrowLeftRight } from "lucide-react";
import type { PlannedItemOut } from "@/lib/api/plans";
import { SetLogger } from "./SetLogger";

interface ExerciseCardProps {
  item: PlannedItemOut;
  exerciseIndex: number;
  totalExercises: number;
  setIndex: number;
  lastLoggedKg: number | null;
  onLogSet: (kg: number | null, reps: number, rpe?: number) => void;
  onSwap: () => void;
  onSkip: () => void;
}

export function ExerciseCard({
  item,
  exerciseIndex,
  totalExercises,
  setIndex,
  lastLoggedKg,
  onLogSet,
  onSwap,
  onSkip,
}: ExerciseCardProps) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 flex flex-col gap-4">
      {/* Exercise header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          {/* Git decorator */}
          <p className="font-data text-[11px] text-[var(--accent)]">
            $ set --current
          </p>

          {/* Exercise name */}
          <h2
            className="font-heading text-[var(--text)] leading-tight"
            style={{ fontSize: "clamp(28px, 8vw, 38px)" }}
          >
            {item.movement_name}
          </h2>

          {/* Counter */}
          <p className="font-sans text-[12px] text-[var(--muted)]">
            exercise{" "}
            <span className="font-data tabular-nums text-[var(--text)]">
              {exerciseIndex + 1}
            </span>{" "}
            of{" "}
            <span className="font-data tabular-nums text-[var(--text)]">
              {totalExercises}
            </span>
          </p>
        </div>

        {/* Swap button */}
        <button
          onClick={onSwap}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] shrink-0"
          aria-label="Swap this exercise with a substitute"
        >
          <ArrowLeftRight className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      {/* Divider */}
      <div className="h-px bg-[var(--border)]" />

      {/* Set logger */}
      <SetLogger
        setIndex={setIndex}
        totalSets={item.sets ?? 1}
        lastLoggedKg={lastLoggedKg}
        prescribedKg={item.load_kg}
        prescribedReps={item.reps}
        onLog={onLogSet}
      />

      {/* Skip link */}
      <button
        onClick={onSkip}
        className="self-start font-sans text-[12px] text-[var(--muted)] hover:text-[var(--text)] transition-colors min-h-[44px] flex items-center"
        aria-label="Skip this exercise"
      >
        skip exercise →
      </button>
    </div>
  );
}
