"use client";

import type { Movement } from "@/lib/api";

const COMMON_IMPLEMENTS = [
  "Barbell",
  "Dumbbell",
  "Kettlebell",
  "Machine",
  "Cable",
  "Bodyweight",
];

/**
 * The shared `(implement, side)` scope selector (01 §9.1 — the Bible Domain 01
 * pattern). Sits directly above the History/Charts/Records content and re-scopes
 * all three to one implement + side. Its state lives in the URL query
 * (`?implement=&side=`) so it persists as the user moves between the three
 * path-segment tabs and is deep-linkable. Hidden on About (static metadata).
 *
 * Default is unscoped ("All") rather than the movement's typical implement:
 * `implement` is free text matched exactly server-side, so an "All" default
 * guarantees the user sees their logged data, with one tap to narrow.
 */
export function ImplementSideSelector({
  movement,
  implement,
  side,
  onChange,
}: {
  movement: Movement;
  implement: string | null;
  side: string | null;
  onChange: (next: { implement: string | null; side: string | null }) => void;
}) {
  const implementOptions = Array.from(
    new Set(
      [movement.implement, ...COMMON_IMPLEMENTS].filter(
        (x): x is string => !!x,
      ),
    ),
  );
  const showSide =
    movement.limb_style === "unilateral" ||
    movement.limb_style === "alternating";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-1.5">
        <span
          className="font-sans text-[11px] uppercase tracking-wide"
          style={{ color: "var(--muted)" }}
        >
          Implement
        </span>
        <select
          value={implement ?? ""}
          onChange={(e) =>
            onChange({ implement: e.target.value || null, side })
          }
          aria-label="Filter by implement"
          className="rounded-[6px] px-2 py-1 font-sans text-[12px]"
          style={selectStyle(implement != null)}
        >
          <option value="">All</option>
          {implementOptions.map((im) => (
            <option key={im} value={im}>
              {im}
            </option>
          ))}
        </select>
      </label>

      {showSide && (
        <label className="flex items-center gap-1.5">
          <span
            className="font-sans text-[11px] uppercase tracking-wide"
            style={{ color: "var(--muted)" }}
          >
            Side
          </span>
          <select
            value={side ?? ""}
            onChange={(e) =>
              onChange({ implement, side: e.target.value || null })
            }
            aria-label="Filter by side"
            className="rounded-[6px] px-2 py-1 font-sans text-[12px]"
            style={selectStyle(side != null)}
          >
            <option value="">All</option>
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </label>
      )}
    </div>
  );
}

function selectStyle(active: boolean) {
  return {
    background: active ? "var(--accent)" : "var(--surface)",
    color: active ? "var(--bg)" : "var(--text)",
    border: "1px solid var(--border)",
  } as const;
}
