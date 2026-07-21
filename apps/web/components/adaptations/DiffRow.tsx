"use client";

import { formatLoad, formatSetsReps } from "@/lib/adaptationDiff";
import type { AdaptationItemChange } from "@/lib/api/plans";

type Tone = "red" | "green" | "context";

/**
 * One old/new (or context) row inside a session's diff (design spec §8.5).
 * Full-surface tint (Bible 1.4) always paired with a +/- gutter glyph
 * (accessibility rule — never color alone). Numeric columns are monospace
 * with tabular-nums so the delta reads instantly (§1.3).
 *
 * Mobile (<768px, §8.5A): the movement name sits on its own line and wraps
 * (never truncates); the numeric sets/reps/load segment stays on one line
 * and gets its own bounded horizontal-scroll container as a fallback if it
 * would overflow a 360-375px viewport, rather than breaking page layout.
 */
function Row({
  tone,
  glyph,
  movementName,
  setsReps,
  load,
  strikethrough,
}: {
  tone: Tone;
  glyph: "−" | "+" | null;
  movementName: string;
  setsReps: string | null;
  load: string | null;
  strikethrough?: boolean;
}) {
  const bg =
    tone === "red"
      ? "color-mix(in srgb, var(--red) 12%, var(--bg))"
      : tone === "green"
        ? "color-mix(in srgb, var(--green) 12%, var(--bg))"
        : "transparent";
  const glyphColor =
    tone === "red"
      ? "var(--red)"
      : tone === "green"
        ? "var(--green)"
        : "var(--muted)";

  return (
    <div
      className="flex flex-col gap-1 rounded px-2 py-1.5 md:flex-row md:items-center md:gap-3"
      style={{ background: bg }}
    >
      <span
        aria-hidden="true"
        className="w-4 shrink-0 font-mono text-sm font-bold tabular-nums"
        style={{ color: glyphColor }}
      >
        {glyph ?? ""}
      </span>
      <span
        className={`min-w-0 flex-1 font-sans text-[13px] break-words ${
          strikethrough ? "line-through" : ""
        }`}
        style={{ color: "var(--text)" }}
      >
        {movementName}
      </span>
      <div className="flex shrink-0 gap-3 overflow-x-auto whitespace-nowrap font-mono text-[13px] tabular-nums md:overflow-visible">
        {setsReps && <span style={{ color: "var(--text)" }}>{setsReps}</span>}
        {load && <span style={{ color: "var(--text)" }}>{load}</span>}
        {!setsReps && !load && <span style={{ color: "var(--muted)" }}>—</span>}
      </div>
    </div>
  );
}

export function DiffItemRows({ item }: { item: AdaptationItemChange }) {
  const isPureAdd =
    item.changed &&
    !item.removed &&
    item.old_sets == null &&
    item.old_reps == null &&
    item.old_load_pct_1rm == null &&
    item.old_load_kg == null;

  if (item.removed) {
    // No strikethrough here — reserved for the whole-session `skip` card
    // (§8.5's "removed file" case) so the treatment stays consistent: every
    // red row (removed item or old-value-of-a-change) reads the same way,
    // and strikethrough uniquely means "the entire session is gone."
    return (
      <Row
        tone="red"
        glyph="−"
        movementName={item.movement_name}
        setsReps={formatSetsReps(item.old_sets, item.old_reps)}
        load={formatLoad(item.old_load_pct_1rm, item.old_load_kg)}
      />
    );
  }

  if (isPureAdd) {
    return (
      <Row
        tone="green"
        glyph="+"
        movementName={item.movement_name}
        setsReps={formatSetsReps(item.new_sets, item.new_reps)}
        load={formatLoad(item.new_load_pct_1rm, item.new_load_kg)}
      />
    );
  }

  if (!item.changed) {
    return (
      <Row
        tone="context"
        glyph={null}
        movementName={item.movement_name}
        setsReps={formatSetsReps(item.old_sets, item.old_reps)}
        load={formatLoad(item.old_load_pct_1rm, item.old_load_kg)}
      />
    );
  }

  // Changed, with both an old and new side — one red row above one green
  // row, carrying EVERY changed field for this exercise (§8.5: never a
  // separate row pair per field).
  return (
    <div className="flex flex-col gap-0.5">
      <Row
        tone="red"
        glyph="−"
        movementName={item.movement_name}
        setsReps={formatSetsReps(item.old_sets, item.old_reps)}
        load={formatLoad(item.old_load_pct_1rm, item.old_load_kg)}
      />
      <Row
        tone="green"
        glyph="+"
        movementName={item.movement_name}
        setsReps={formatSetsReps(item.new_sets, item.new_reps)}
        load={formatLoad(item.new_load_pct_1rm, item.new_load_kg)}
      />
    </div>
  );
}

/** The new-green "Rest / Active Recovery" line an `add_rest` change inserts. */
export function AddRestRow() {
  return (
    <Row
      tone="green"
      glyph="+"
      movementName="Rest / Active Recovery"
      setsReps={null}
      load={null}
    />
  );
}
