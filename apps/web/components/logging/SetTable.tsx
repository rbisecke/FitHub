"use client";

import { useReducedMotion } from "motion/react";
import { Calculator } from "lucide-react";
import type { DraftEntry, DraftSet, SetTableVariant } from "./types";
import {
  columnsFor,
  isMultiSet,
  previousValueFor,
  type ColumnDef,
} from "./resultColumns";

/**
 * The set-entry table (01 §2.7). ONE component, two variants driven by a single
 * `variant` flag over shared data/logic — this is the deliberate OPEN DECISION
 * (§2.7) the human resolves by comparing both at true 375px:
 *
 *   Variant A — Hevy ghosted-inline previous value (previous shown as ghost
 *     placeholder inside the input; "⟲" copies the whole previous set).
 *   Variant B — Strong literal separate "Previous" column (a discrete cell per
 *     row; "No Previous" for first-ever; tap the cell to copy).
 *
 * Both: completed set fills the whole row green (Bible 1.4); a PR row swaps the
 * set-number for a --purple medal and tints the row --purple (§2.11); checkmark
 * and calculator hit areas clear 44px (§2.8, §2.7A).
 */

interface Props {
  entry: DraftEntry;
  variant: SetTableVariant;
  weightUnit: string;
  onSetChange: (setId: string, field: keyof DraftSet, value: string) => void;
  onToggleComplete: (setId: string) => void;
  onCopyPrevious: (setId: string, setIndex: number) => void;
  onAddSet: () => void;
  onOpenCalculator: (setId: string) => void;
}

function ghostSummary(
  entry: DraftEntry,
  setIndex: number,
  cols: ColumnDef[],
): string {
  const prev = entry.previous[setIndex];
  const parts = cols
    .map((c) => previousValueFor(prev, c))
    .filter((v): v is string => v != null);
  if (parts.length === 0) return "";
  return parts.join(" × ");
}

export function SetTable({
  entry,
  variant,
  weightUnit,
  onSetChange,
  onToggleComplete,
  onCopyPrevious,
  onAddSet,
  onOpenCalculator,
}: Props) {
  const prefersReducedMotion = useReducedMotion();
  const cols = columnsFor(entry.resultType, weightUnit);
  const showAddSet = isMultiSet(entry.resultType);
  const showCalc = entry.resultType === "weight";
  const rowTransition = prefersReducedMotion
    ? "none"
    : "background-color 200ms cubic-bezier(0.2,0,0,1)";

  return (
    <div data-testid={`set-table-variant-${variant}`}>
      {/* Header labels */}
      <div
        className="flex items-center gap-1 px-1 pb-1 font-data text-[10px] uppercase tracking-wide"
        style={{ color: "var(--muted)" }}
      >
        <span className="w-5 shrink-0 text-center">Set</span>
        {variant === "B" && <span className="w-[58px] shrink-0">Prev</span>}
        {cols.map((c) => (
          <span key={c.key} className="min-w-[3.25rem] flex-1 text-right">
            {c.label}
          </span>
        ))}
        <span className="w-8 shrink-0 text-right">RPE</span>
        <span className="w-11 shrink-0 text-center">✓</span>
      </div>

      {entry.sets.map((set, i) => {
        const rowBg = set.completed
          ? "color-mix(in srgb, var(--green) 24%, var(--surface))"
          : set.isPr
            ? "color-mix(in srgb, var(--purple) 16%, var(--surface))"
            : "transparent";
        const ghost = ghostSummary(entry, i, cols);
        return (
          <div
            key={set.id}
            data-testid="set-row"
            className="flex items-center gap-1 rounded-[6px] px-1 py-1"
            style={{
              background: rowBg,
              // A PR keeps a --purple marker even after the row fills green on
              // completion, so the achievement isn't lost at the moment it lands.
              borderLeft: `2px solid ${
                set.isPr ? "var(--purple)" : "transparent"
              }`,
              transition: rowTransition,
            }}
          >
            {/* Set number / PR medal slot */}
            <span
              className="w-5 shrink-0 text-center font-mono tabular-nums text-[13px]"
              style={{ color: set.isPr ? "var(--purple)" : "var(--muted)" }}
              aria-label={set.isPr ? "Personal record set" : `Set ${i + 1}`}
            >
              {set.isPr ? "★" : i + 1}
            </span>

            {/* Variant B: dedicated Previous cell. `truncate` (not a bare
                overflow-hidden) so a long value ellipsizes deliberately instead
                of hard-clipping mid-glyph — the width is still sized for the
                common case ("62.5 × 8"), truncation is a graceful fallback for
                outliers (3-digit weight + 2-digit reps), not the normal path. */}
            {variant === "B" && (
              <button
                type="button"
                onClick={() => onCopyPrevious(set.id, i)}
                disabled={!ghost}
                title={ghost || undefined}
                className="w-[58px] shrink-0 truncate text-left font-mono tabular-nums text-[10px] leading-tight disabled:cursor-default"
                style={{ color: ghost ? "var(--muted)" : "var(--border)" }}
                aria-label={
                  ghost ? `Copy previous ${ghost}` : "No previous value"
                }
              >
                {ghost || "No Prev"}
              </button>
            )}

            {/* Editable input columns */}
            {cols.map((c) => {
              const ghostForCol =
                variant === "A" ? previousValueFor(entry.previous[i], c) : null;
              const hasCalc = showCalc && c.key === "load";
              return (
                <div key={c.key} className="relative flex-1">
                  <input
                    inputMode={c.mode}
                    value={set[c.key]}
                    onChange={(e) => onSetChange(set.id, c.key, e.target.value)}
                    placeholder={ghostForCol ?? c.placeholder}
                    aria-label={`Set ${i + 1} ${c.label}`}
                    className={`w-full rounded-[6px] py-1.5 text-right font-mono tabular-nums text-[14px] outline-none focus:ring-1 ${
                      hasCalc ? "pl-5 pr-1" : "px-1"
                    }`}
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                    }}
                  />
                  {/* Calculator affordance inside the load cell's left edge, so it
                      can't be clipped by the card edge (§2.7A). */}
                  {hasCalc && (
                    <button
                      type="button"
                      onClick={() => onOpenCalculator(set.id)}
                      aria-label="Open plate calculator"
                      className="absolute left-0 top-1/2 flex h-11 w-4 -translate-y-1/2 items-center justify-center"
                      style={{ color: "var(--muted)" }}
                    >
                      <Calculator
                        size={12}
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                    </button>
                  )}
                </div>
              );
            })}

            {/* RPE */}
            <input
              inputMode="decimal"
              value={set.rpe}
              onChange={(e) => onSetChange(set.id, "rpe", e.target.value)}
              placeholder="–"
              aria-label={`Set ${i + 1} RPE`}
              className="h-11 w-8 shrink-0 rounded-[6px] px-1 text-center font-mono tabular-nums text-[12px] outline-none"
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
                color: "var(--muted)",
              }}
            />

            {/* Completion checkmark — ≥44px hit area (§2.8) */}
            <button
              type="button"
              onClick={() => onToggleComplete(set.id)}
              aria-label={
                set.completed
                  ? `Mark set ${i + 1} incomplete`
                  : `Complete set ${i + 1}`
              }
              aria-pressed={set.completed}
              className="flex h-11 w-11 shrink-0 items-center justify-center"
            >
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-bold"
                style={{
                  background: set.completed ? "var(--green)" : "transparent",
                  border: `1.5px solid ${
                    set.completed ? "var(--green)" : "var(--border)"
                  }`,
                  color: set.completed ? "#fff" : "var(--muted)",
                  transition: prefersReducedMotion
                    ? "none"
                    : "background-color 120ms, border-color 120ms",
                }}
              >
                ✓
              </span>
            </button>
          </div>
        );
      })}

      {/* Variant A per-row copy-previous / add set */}
      {showAddSet && (
        <div className="mt-1 flex items-center gap-2 px-1">
          {variant === "A" && entry.previous.length > 0 && (
            <button
              type="button"
              onClick={() =>
                onCopyPrevious(
                  entry.sets[entry.sets.length - 1]?.id ?? "",
                  entry.sets.length - 1,
                )
              }
              className="font-data text-[11px]"
              style={{ color: "var(--muted)" }}
              aria-label="Copy previous values into the last set"
            >
              ⟲ copy previous
            </button>
          )}
          <button
            type="button"
            onClick={onAddSet}
            className="ml-auto rounded-[6px] px-3 py-1.5 font-data text-[12px]"
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              color: "var(--accent)",
            }}
          >
            + Add Set
          </button>
        </div>
      )}
    </div>
  );
}
