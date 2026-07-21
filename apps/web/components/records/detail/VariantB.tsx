"use client";

import { formatWeight } from "@/lib/display";
import type { PersonalRecord } from "@/lib/api";
import type { WeightUnit } from "@/lib/records/prFormat";

const TRACK_WIDTH = 100; // percent

/**
 * Variant B — inline three-value cluster on one shared horizontal e1RM
 * scale (design-spec 04 Screen 2C-B, Garmin Fitness Age slider model).
 * Peak = filled `--purple` ("best"), trend/current = bold accent ("now"),
 * projection = HOLLOW `--purple` outline ("next · {weeks} wk") — the hollow
 * marker is a deliberate extension of the reserved earned-PR color for a
 * not-yet-earned target, always carrying its ETA label so it never reads
 * as an already-earned record.
 *
 * Crowding-mitigation thresholds (exact, per spec): |now - best| <= 2.5kg
 * collapses the two into one "at your best" marker; 2.5-5kg keeps both
 * markers but stacks their labels vertically; beyond 5kg they label inline.
 */
export function VariantB({
  record,
  unit,
  staleProjection = false,
}: {
  record: PersonalRecord;
  unit: WeightUnit;
  staleProjection?: boolean;
}) {
  const current = record.current_e1rm_kg;
  if (current == null) return null;

  const hasProjection =
    record.next_pr_kg != null && record.next_pr_weeks != null;

  const values = [
    record.best_1rm_kg,
    current,
    hasProjection ? record.next_pr_kg! : record.best_1rm_kg,
  ];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  const pad = Math.max(span * 0.5, 5);
  const floor = Math.max(0, min - pad);
  const ceiling = max + pad * 0.4;
  const scale = (v: number) => ((v - floor) / (ceiling - floor)) * TRACK_WIDTH;

  const gapNowBest = Math.abs(current - record.best_1rm_kg);
  const collapseNowBest = gapNowBest <= 2.5;
  const stackLabels = !collapseNowBest && gapNowBest <= 5;

  const bestPct = scale(record.best_1rm_kg);
  const nowPct = scale(current);
  const nextPct = hasProjection ? scale(record.next_pr_kg!) : null;

  // The spec's crowding thresholds only cover the now-vs-best pair, but a
  // near-term projection (a small milestone just above peak) can land just
  // as close to the (possibly-already-collapsed) now/best cluster, causing
  // its label to overlap theirs. Apply the same 5kg stacking threshold to
  // whichever of now/best the projection is nearest to, offsetting the
  // projection's label onto its own row rather than overlapping.
  const gapNextToNearest = hasProjection
    ? Math.min(
        Math.abs(record.next_pr_kg! - record.best_1rm_kg),
        Math.abs(record.next_pr_kg! - current),
      )
    : Infinity;
  const stackNext = hasProjection && gapNextToNearest <= 5;
  // Reserve extra vertical room for the deepest stacked row actually in use
  // (0 = no stacking, 1 = one extra row, 2 = the projection stacked below an
  // already-stacked now/best pair) so a deeply-stacked label never clips.
  const maxStackRow = stackNext ? (stackLabels ? 2 : 1) : stackLabels ? 1 : 0;

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative pt-6"
        style={{ height: `${64 + maxStackRow * 26}px` }}
      >
        <div
          className="absolute inset-x-0 top-8 h-1 rounded-full"
          style={{ background: "var(--border)" }}
        />

        {collapseNowBest ? (
          <Marker
            pct={(bestPct + nowPct) / 2}
            fill="var(--purple)"
            label="at your best"
            value={formatWeight(record.best_1rm_kg, unit)}
          />
        ) : (
          <>
            <Marker
              pct={bestPct}
              fill="var(--purple)"
              label="best"
              value={formatWeight(record.best_1rm_kg, unit)}
              stacked={stackLabels}
              stackRow={0}
            />
            <Marker
              pct={nowPct}
              fill="var(--accent)"
              label="now"
              value={formatWeight(current, unit)}
              stacked={stackLabels}
              stackRow={1}
            />
          </>
        )}

        {hasProjection && nextPct != null && (
          <div style={{ opacity: staleProjection ? 0.45 : 1 }}>
            <Marker
              pct={nextPct}
              fill="none"
              outline="var(--purple)"
              label={`next · ${record.next_pr_weeks} wk${
                staleProjection ? " · stale" : ""
              }`}
              value={formatWeight(record.next_pr_kg!, unit)}
              stacked={stackNext}
              stackRow={stackLabels ? 2 : 1}
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span
          className="font-mono text-[10px] tabular-nums"
          style={{ color: "var(--muted-foreground)" }}
        >
          {formatWeight(floor, unit)}
        </span>
        <span
          className="font-mono text-[10px] tabular-nums"
          style={{ color: "var(--muted-foreground)" }}
        >
          {formatWeight(ceiling, unit)}
        </span>
      </div>

      <p
        className="font-sans text-[11px]"
        style={{ color: "var(--muted-foreground)" }}
      >
        Filled = earned. Hollow = projected, not yet earned.
      </p>
    </div>
  );
}

function Marker({
  pct,
  fill,
  outline,
  label,
  value,
  stacked,
  stackRow,
}: {
  pct: number;
  fill: string;
  outline?: string;
  label: string;
  value: string;
  stacked?: boolean;
  stackRow?: number;
}) {
  return (
    <div
      className="absolute top-6 flex flex-col items-center"
      style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
    >
      <div
        className="h-3.5 w-3.5 rounded-full"
        style={{
          background: fill,
          border: outline ? `2px solid ${outline}` : "2px solid transparent",
        }}
        aria-hidden="true"
      />
      <div
        className="mt-1 flex flex-col items-center whitespace-nowrap"
        style={
          stacked && stackRow ? { marginTop: `${stackRow * 26}px` } : undefined
        }
      >
        <span
          className="font-mono text-[11px] font-semibold tabular-nums"
          style={{ color: "var(--foreground)" }}
        >
          {value}
        </span>
        <span
          className="font-sans text-[10px]"
          style={{ color: "var(--muted-foreground)" }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
