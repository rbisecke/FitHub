"use client";

import type { DraftEntry, DraftSet } from "./types";
import { SetTable } from "./SetTable";
import { CardioConversionChip } from "./CardioConversionChip";

/**
 * One movement entry (01 §2.4): name (implement baked in), attribute chips, an
 * Rx'd/Scaled toggle (§2.7, §2.12), the previous/PR context line (§2.4/§2.11 —
 * loading / error-retry / genuine no-previous are distinct), and the set table.
 */

interface Props {
  entry: DraftEntry;
  weightUnit: string;
  onSetChange: (setId: string, field: keyof DraftSet, value: string) => void;
  onToggleComplete: (setId: string) => void;
  onCopyPrevious: (setId: string, setIndex: number) => void;
  onAddSet: () => void;
  onOpenCalculator: (setId: string) => void;
  onRemove: () => void;
  onSetScaled: (scaled: boolean) => void;
  onRetryContext: () => void;
}

function ContextLine({
  entry,
  weightUnit,
  onRetry,
}: {
  entry: DraftEntry;
  weightUnit: string;
  onRetry: () => void;
}) {
  const base = "font-mono text-[12px]";
  if (entry.contextState === "loading") {
    return (
      <span className={base} style={{ color: "var(--muted)" }}>
        Loading previous…
      </span>
    );
  }
  if (entry.contextState === "error") {
    return (
      <button
        type="button"
        onClick={onRetry}
        className={base}
        style={{ color: "var(--red)" }}
      >
        Couldn&apos;t load previous — retry
      </button>
    );
  }
  const last = entry.previous[0];
  const prev =
    last?.load != null && last?.reps != null
      ? `${last.load}${weightUnit} × ${last.reps}`
      : null;
  const pr =
    entry.bestE1rmKg != null
      ? `${entry.bestE1rmKg.toFixed(1)}${weightUnit}`
      : null;
  if (!prev && !pr) {
    return (
      <span className={base} style={{ color: "var(--muted)" }}>
        First time logging this
      </span>
    );
  }
  return (
    <span className={base} style={{ color: "var(--muted)" }}>
      {prev && <>Prev {prev}</>}
      {prev && pr && " · "}
      {pr && (
        <>
          PR <span style={{ color: "var(--purple)" }}>{pr}</span>
        </>
      )}
    </span>
  );
}

export function MovementEntryCard({
  entry,
  weightUnit,
  onSetChange,
  onToggleComplete,
  onCopyPrevious,
  onAddSet,
  onOpenCalculator,
  onRemove,
  onSetScaled,
  onRetryContext,
}: Props) {
  const displayName = entry.implement
    ? `${entry.movement.name} (${entry.implement})`
    : entry.movement.name;

  return (
    <div
      className="rounded-[10px] p-4"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }}
      data-testid="movement-entry"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="font-data text-[14px] leading-none"
            style={{ color: "var(--border)" }}
          >
            ⠿
          </span>
          <span
            className="font-sans text-[15px] font-semibold"
            style={{ color: "var(--text)" }}
          >
            {displayName}
          </span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${displayName}`}
          className="flex h-8 w-8 items-center justify-center font-data text-[16px]"
          style={{ color: "var(--muted)" }}
        >
          ⋯
        </button>
      </div>

      <div className="mb-2 flex items-center justify-between gap-2">
        <ContextLine
          entry={entry}
          weightUnit={weightUnit}
          onRetry={onRetryContext}
        />
        {/* Rx'd / Scaled toggle (§2.7) */}
        <div
          className="flex overflow-hidden rounded-[6px]"
          style={{ border: "1px solid var(--border)" }}
          role="group"
          aria-label="Rx'd or Scaled"
        >
          {(["Rx'd", "Scaled"] as const).map((label, i) => {
            const active = (i === 1) === entry.scaled;
            return (
              <button
                key={label}
                type="button"
                onClick={() => onSetScaled(i === 1)}
                aria-pressed={active}
                className="px-2.5 py-1 font-data text-[10px] uppercase tracking-wide"
                style={{
                  background: active ? "var(--accent)" : "transparent",
                  color: active ? "#fff" : "var(--muted)",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Substitute-cardio chip (§11): only on mono_structural running-equivalent
          entries. The chip self-hides when the name isn't running-equivalent. */}
      {entry.movement.modality === "mono_structural" && (
        <div className="mb-2">
          <CardioConversionChip movementName={entry.movement.name} />
        </div>
      )}

      <SetTable
        entry={entry}
        weightUnit={weightUnit}
        onSetChange={onSetChange}
        onToggleComplete={onToggleComplete}
        onCopyPrevious={onCopyPrevious}
        onAddSet={onAddSet}
        onOpenCalculator={onOpenCalculator}
      />
    </div>
  );
}
