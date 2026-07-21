"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { E1RMPoint, PersonalRecord } from "@/lib/api";
import { formatWeight } from "@/lib/display";
import {
  formatAchievedDate,
  noProjectionNote,
  trendColorVar,
  trendDirection,
  trendGlyph,
  type WeightUnit,
} from "@/lib/records/prFormat";
import { MovementTrendChart } from "@/components/records/detail/MovementTrendChart";

/**
 * Variant A — primary-number + secondary-label, projection on expand
 * (design-spec 04 Screen 2C-A, Happy Scale "Latest vs. Trend" model). At
 * rest: two numbers only — peak (hero, `--purple`) and trend (smaller,
 * co-labeled "current trend"). The projection is a single quiet tappable
 * line that expands the trend chart into projection mode.
 */
export function VariantA({
  record,
  points,
  unit,
  staleProjection = false,
}: {
  record: PersonalRecord;
  points: E1RMPoint[];
  unit: WeightUnit;
  staleProjection?: boolean;
}) {
  const [projectionExpanded, setProjectionExpanded] = useState(false);
  const direction = trendDirection(record);
  const hasProjection =
    record.next_pr_kg != null && record.next_pr_weeks != null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p
          className="font-mono text-[44px] font-bold leading-none tabular-nums"
          style={{ color: "var(--purple)" }}
        >
          {formatWeight(record.best_1rm_kg, unit)}
        </p>
        <p
          className="mt-1 font-sans text-[12px]"
          style={{ color: "var(--muted-foreground)" }}
        >
          all-time best · {formatAchievedDate(record.achieved_at)}
        </p>
      </div>

      {record.current_e1rm_kg != null && direction != null && (
        <div>
          <div className="flex items-baseline gap-2">
            <span
              className="font-mono text-[22px] font-semibold tabular-nums"
              style={{
                color: "var(--foreground)",
                opacity: staleProjection ? 0.6 : 1,
              }}
            >
              {formatWeight(record.current_e1rm_kg, unit)}
            </span>
            <span
              className="font-mono text-[16px]"
              style={{
                color: trendColorVar(direction),
                opacity: staleProjection ? 0.6 : 1,
              }}
              aria-hidden="true"
            >
              {trendGlyph(direction)}
            </span>
          </div>
          <p
            className="mt-0.5 font-sans text-[12px]"
            style={{ color: "var(--muted-foreground)" }}
          >
            current trend
            {staleProjection &&
              " — a rough extrapolation across a long gap since your last set"}
          </p>
        </div>
      )}

      {hasProjection && (
        <button
          type="button"
          onClick={() => setProjectionExpanded((v) => !v)}
          aria-expanded={projectionExpanded}
          className="flex w-fit items-center gap-1 rounded-[6px] border font-mono text-[13px] transition-colors"
          style={{
            color: "var(--muted-foreground)",
            borderColor: "var(--border)",
            opacity: staleProjection ? 0.55 : 1,
            padding: "4px 8px",
          }}
        >
          Next PR: {formatWeight(record.next_pr_kg!, unit)} in ~
          {record.next_pr_weeks} wk
          {staleProjection ? " (stale)" : ""}
          <ChevronDown
            size={14}
            aria-hidden="true"
            style={{
              transform: projectionExpanded ? "rotate(180deg)" : "rotate(0deg)",
            }}
            className="transition-transform"
          />
        </button>
      )}

      {record.current_e1rm_kg != null && !hasProjection && (
        <p
          className="font-sans text-[12px]"
          style={{ color: "var(--muted-foreground)" }}
        >
          {noProjectionNote(direction)}
        </p>
      )}

      {record.current_e1rm_kg != null && (
        <MovementTrendChart
          points={points}
          record={record}
          unit={unit}
          showProjection={projectionExpanded}
          staleProjection={staleProjection}
        />
      )}
    </div>
  );
}
