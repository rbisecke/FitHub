"use client";

import {
  dimensionBand,
  type WellnessDimension,
} from "@/components/wellness/hooperIndex";

const STOPS = [1, 2, 3, 4, 5, 6, 7] as const;
const TOKEN: Record<"green" | "amber" | "red", string> = {
  green: "var(--green)",
  amber: "var(--amber)",
  red: "var(--red)",
};

/**
 * Discrete tap-along 7-stop control (05 §3) — a dedicated custom component,
 * NOT a restyled `<input type="range">`, matching the pain-track requirement
 * used elsewhere in this domain. Each stop is an independent ≥44px touch
 * target; the currently selected stop is filled with its band color, unselected
 * stops stay outline-only so the band color never appears as a gradient/fill
 * trick that could be misread as continuous.
 */
export function DiscreteStopControl({
  dimension,
  label,
  anchorLow,
  anchorHigh,
  value,
  touched,
  onChange,
  disabled,
  reversedHint,
}: {
  dimension: WellnessDimension;
  label: string;
  anchorLow: string;
  anchorHigh: string;
  value: number;
  touched: boolean;
  onChange: (value: number) => void;
  disabled?: boolean;
  /** Shown next to the label for the one dimension that runs opposite the rest. */
  reversedHint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span
          className="font-sans text-[12px] font-semibold"
          style={{ color: "var(--text)" }}
        >
          {label}
        </span>
        {reversedHint && (
          <span
            className="rounded-full px-1.5 py-0.5 font-sans text-[10px] font-medium"
            style={{
              background: "var(--surface)",
              color: "var(--accent)",
              border: "1px solid var(--border)",
            }}
          >
            {reversedHint}
          </span>
        )}
      </div>
      {/* Anchors render on their own row, not beside the buttons — 7 fixed
          44px touch targets (7*44 + 6*4px gaps = 332px) plus two w-14 side
          labels don't fit inside a 375px card (16px padding each side), so
          the button row gets the full content width and the anchors sit
          beneath it instead. */}
      <div
        className="flex justify-between gap-1"
        role="group"
        aria-label={label}
      >
        {STOPS.map((n) => {
          const selected = value === n;
          const band = dimensionBand(dimension, n);
          const color = TOKEN[band];
          return (
            <button
              key={n}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              aria-label={`${label} ${n} of 7`}
              onClick={() => onChange(n)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] font-mono tabular-nums text-[13px] font-semibold transition-colors"
              style={{
                background: selected
                  ? touched
                    ? color
                    : "var(--surface)"
                  : "var(--bg)",
                border: `1.5px solid ${selected ? color : "var(--border)"}`,
                color:
                  selected && touched
                    ? "var(--bg)"
                    : selected
                      ? "var(--muted)"
                      : "var(--muted)",
                opacity: disabled ? 0.6 : 1,
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between">
        <span
          className="font-sans text-[10px]"
          style={{ color: "var(--muted)" }}
        >
          {anchorLow}
        </span>
        <span
          className="font-sans text-[10px]"
          style={{ color: "var(--muted)" }}
        >
          {anchorHigh}
        </span>
      </div>
    </div>
  );
}
