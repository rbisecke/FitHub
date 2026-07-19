"use client";

import {
  warmupRamp,
  plateBreakdown,
  BAR_WEIGHT,
  type WeightUnit,
} from "@fithub/shared";
import { useMemo, useState } from "react";
import { SheetOverlay } from "./SheetOverlay";

/**
 * Warm-up / plate calculator (01 §2.7A). A read-only modal over active logging:
 * a warm-up ramp and per-side plate breakdown for a target weight. Consumes the
 * pure-math module from @fithub/shared (Effort 0); never writes a result.
 */
export function PlateCalculatorSheet({
  initialTarget,
  weightUnit,
  onClose,
}: {
  initialTarget: number;
  weightUnit: WeightUnit;
  onClose: () => void;
}) {
  const [target, setTarget] = useState(
    initialTarget > 0 ? String(initialTarget) : "",
  );
  const targetNum = Number(target) || 0;

  const ramp = useMemo(
    () => (targetNum > 0 ? warmupRamp(targetNum, weightUnit) : []),
    [targetNum, weightUnit],
  );
  const breakdown = useMemo(
    () => (targetNum > 0 ? plateBreakdown(targetNum, weightUnit) : null),
    [targetNum, weightUnit],
  );

  return (
    <SheetOverlay title="Warm-up & plates" onClose={onClose} maxHeight="70dvh">
      <label
        className="mb-1 block font-data text-[11px] uppercase tracking-wide"
        style={{ color: "var(--muted)" }}
      >
        Work set weight ({weightUnit})
      </label>
      <input
        inputMode="decimal"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        placeholder={String(BAR_WEIGHT[weightUnit])}
        aria-label="Work set weight"
        className="mb-4 w-full rounded-[8px] px-3 py-2 text-right font-mono tabular-nums text-[18px] outline-none"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--text)",
        }}
      />

      {ramp.length > 0 && (
        <div className="mb-4">
          <p
            className="mb-2 font-data text-[11px] uppercase tracking-wide"
            style={{ color: "var(--muted)" }}
          >
            Warm-up ramp
          </p>
          <div className="space-y-1">
            {ramp.map((step) => (
              <div
                key={step.label}
                className="flex items-center justify-between rounded-[6px] px-3 py-2"
                style={{ background: "var(--surface)" }}
              >
                <span
                  className="font-data text-[12px]"
                  style={{ color: "var(--muted)" }}
                >
                  {step.label}
                </span>
                <span
                  className="font-mono tabular-nums text-[14px]"
                  style={{ color: "var(--text)" }}
                >
                  {step.weight} {weightUnit} × {step.reps}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {breakdown && (
        <div>
          <p
            className="mb-2 font-data text-[11px] uppercase tracking-wide"
            style={{ color: "var(--muted)" }}
          >
            Per side of the bar ({breakdown.barWeight} {weightUnit} bar)
          </p>
          {breakdown.belowBar ? (
            <p
              className="font-mono text-[13px]"
              style={{ color: "var(--amber)" }}
            >
              Bar only — target is below bar weight
            </p>
          ) : breakdown.perSide.length === 0 ? (
            <p
              className="font-mono text-[13px]"
              style={{ color: "var(--text)" }}
            >
              Bar only
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {breakdown.perSide.map((p) => (
                <span
                  key={p.plate}
                  className="rounded-[6px] px-2.5 py-1.5 font-mono tabular-nums text-[13px]"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                >
                  {p.count} × {p.plate}
                </span>
              ))}
            </div>
          )}
          {!breakdown.exact && !breakdown.belowBar && (
            <p
              className="mt-2 font-data text-[11px]"
              style={{ color: "var(--amber)" }}
            >
              closest: {breakdown.achievedWeight} {weightUnit}
            </p>
          )}
        </div>
      )}
    </SheetOverlay>
  );
}
