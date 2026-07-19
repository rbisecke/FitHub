import type { Result } from "@/lib/api";
import { formatWeight } from "@/lib/display";
import {
  formatResultValue,
  scaledQualifier,
  type DisplayUnits,
} from "@/lib/units";

/**
 * One committed `Result` rendered as a read row (01 §5, §6). Shared by the
 * history-feed lazy-expand list and the workout-detail result list so both
 * render a result the same way: movement name (implement baked into the display
 * name, §2.4), the type-appropriate value, variant chips, per-result RPE/RIR,
 * the `| Scaled` qualifier (§5.5), an optional read-only e1RM, and — when the
 * caller marks it — a `--purple` PR badge (never color alone, §2.11).
 */
export function ResultLine({
  result,
  units,
  isPr = false,
  showE1rm = false,
}: {
  result: Result;
  units: DisplayUnits;
  /** Caller decides PR marking — feed uses the snapshot, detail the strict rule. */
  isPr?: boolean;
  showE1rm?: boolean;
}) {
  const name = displayName(result);
  const value = formatResultValue(result, units);
  const scaled = scaledQualifier(result.scaled);
  const chips = variantChips(result);
  const e1rm =
    showE1rm && result.estimated_1rm_kg
      ? Number(result.estimated_1rm_kg)
      : null;

  return (
    <div
      className="flex flex-col gap-1 py-2"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span
          className="font-sans text-[13px] font-medium"
          style={{ color: "var(--text)" }}
        >
          {name}
        </span>
        <span className="flex shrink-0 items-baseline gap-2">
          <span
            className="font-mono tabular-nums text-[13px]"
            style={{ color: "var(--text)" }}
          >
            {value}
          </span>
          {scaled && (
            <span
              className="font-sans text-[11px]"
              style={{ color: "var(--muted)" }}
            >
              | {scaled}
            </span>
          )}
          {isPr && (
            <span
              className="rounded-[4px] px-1 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wide"
              style={{
                color: "var(--purple)",
                border: "1px solid var(--purple)",
              }}
            >
              PR
            </span>
          )}
        </span>
      </div>
      {(chips.length > 0 ||
        e1rm != null ||
        result.rpe != null ||
        result.rir != null) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((c) => (
            <span
              key={c}
              className="rounded-[4px] px-1.5 py-0.5 font-sans text-[10px]"
              style={{ background: "var(--surface)", color: "var(--muted)" }}
            >
              {c}
            </span>
          ))}
          {result.rpe != null && (
            <span
              className="font-mono text-[10px]"
              style={{ color: "var(--muted)" }}
            >
              RPE {result.rpe}
            </span>
          )}
          {result.rir != null && (
            <span
              className="font-mono text-[10px]"
              style={{ color: "var(--muted)" }}
            >
              RIR {result.rir}
            </span>
          )}
          {e1rm != null && (
            <span
              className="font-mono text-[10px]"
              style={{ color: "var(--muted)" }}
            >
              e1RM {formatWeight(e1rm, units.weight)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** Movement name with implement baked into the display name (§2.4). */
function displayName(result: Result): string {
  const base = result.movement_name?.trim() || "Movement";
  if (
    result.implement &&
    !base.toLowerCase().includes(result.implement.toLowerCase())
  ) {
    return `${base} (${result.implement})`;
  }
  return base;
}

/** Compact chips for side / tempo / modifier (`variant_annotation`) — §6. */
function variantChips(result: Result): string[] {
  const chips: string[] = [];
  if (result.side && result.side !== "both") chips.push(result.side);
  if (result.tempo) chips.push(`tempo ${result.tempo}`);
  if (result.variant_annotation) chips.push(result.variant_annotation);
  return chips;
}
