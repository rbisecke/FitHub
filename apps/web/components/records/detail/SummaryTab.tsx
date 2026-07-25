"use client";

import { useState } from "react";
import type { E1RMPoint, PersonalRecord } from "@/lib/api";
import { formatWeight } from "@/lib/display";
import { formatAchievedDate, type WeightUnit } from "@/lib/records/prFormat";
import { InsufficientDataNote } from "@/components/records/detail/InsufficientDataNote";
import { VariantA } from "@/components/records/detail/VariantA";
import { VariantB } from "@/components/records/detail/VariantB";
import { VariantC } from "@/components/records/detail/VariantC";

export type SummaryVariant = "a" | "b" | "c";

// Plain, user-facing labels — these used to read as internal
// variant/experiment naming ("A · Deferred projection", "B · Single-scale
// cluster", "C · Fact vs. forecast") with no in-page explanation of what
// A/B/C meant. Each label now names what that composition actually shows:
// A leads with peak + trend and defers the projection behind a tap; B puts
// best/now/next on one shared scale; C splits a record (fact) block from a
// trajectory (forecast) block.
const VARIANT_LABEL: Record<SummaryVariant, string> = {
  a: "Trend",
  b: "Combined scale",
  c: "Actual vs. forecast",
};

/**
 * Summary tab (design-spec 04 Screen 2A-2C) — the three-value composition.
 * Open Decision #6 is "build all, do not pick one": a permanent, user-facing
 * variant switcher makes all three reachable from one screen, rather than
 * shipping only whichever was built last.
 */
export function SummaryTab({
  record,
  points,
  unit,
  initialVariant = "a",
  staleProjection = false,
}: {
  record: PersonalRecord;
  points: E1RMPoint[];
  unit: WeightUnit;
  initialVariant?: SummaryVariant;
  staleProjection?: boolean;
}) {
  const [variant, setVariant] = useState<SummaryVariant>(initialVariant);
  const hasTrend = record.current_e1rm_kg != null;

  return (
    <div className="flex flex-col gap-4">
      {/* `max-w-full overflow-x-auto` — a safety net, not the expected path:
          the three labels fit exactly at 375px with the current copy, but
          `w-fit` has no fallback if a label grows (longer locale string,
          browser text-zoom), so this lets the switcher scroll horizontally
          rather than clip or overflow the page if that ever happens. */}
      <div
        role="group"
        aria-label="Display style"
        className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-[8px] border border-[var(--border)] bg-[var(--card)] p-1"
      >
        {(["a", "b", "c"] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={variant === v}
            onClick={() => setVariant(v)}
            className="rounded-[6px] px-2 py-1 font-mono text-[11px] font-semibold transition-colors"
            style={
              variant === v
                ? {
                    background: "var(--accent)",
                    color: "var(--primary-foreground)",
                  }
                : {
                    background: "transparent",
                    color: "var(--muted-foreground)",
                  }
            }
          >
            {VARIANT_LABEL[v]}
          </button>
        ))}
      </div>

      {!hasTrend ? (
        <div className="flex flex-col gap-2">
          <p
            className="font-mono text-[40px] font-bold leading-none tabular-nums"
            style={{ color: "var(--purple)" }}
          >
            {formatWeight(record.best_1rm_kg, unit)}
          </p>
          <p
            className="font-sans text-[12px]"
            style={{ color: "var(--muted-foreground)" }}
          >
            all-time best · {formatAchievedDate(record.achieved_at)}
          </p>
          <InsufficientDataNote loggedCount={points.length} />
        </div>
      ) : variant === "a" ? (
        <VariantA
          record={record}
          points={points}
          unit={unit}
          staleProjection={staleProjection}
        />
      ) : variant === "b" ? (
        <VariantB
          record={record}
          unit={unit}
          staleProjection={staleProjection}
        />
      ) : (
        <VariantC
          record={record}
          points={points}
          unit={unit}
          staleProjection={staleProjection}
        />
      )}
    </div>
  );
}
