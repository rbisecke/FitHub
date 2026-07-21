"use client";

import type { E1RMPoint, PersonalRecord } from "@/lib/api";
import { formatWeight, formatWeightDelta } from "@/lib/display";
import {
  deltaKind,
  formatAchievedDate,
  noProjectionNote,
  prHeroValue,
  prSourceExpression,
  trendDirection,
  type WeightUnit,
} from "@/lib/records/prFormat";
import { MovementTrendChart } from "@/components/records/detail/MovementTrendChart";

/**
 * Variant C — two visually distinct zones (design-spec 04 Screen 2C-C):
 * Zone 1 "Record" is a celebratory, static/historical fact block; Zone 2
 * "Trajectory" is a quieter, separate forecast block. The chart's projected
 * segment renders solid-to-dashed (not two same-weight lines), fusing a
 * retrospective record block and a prospective trajectory block that no
 * single source app shows together.
 */
export function VariantC({
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
  const sourceExpr = prSourceExpression(record, unit);
  const kind = deltaKind(record);

  return (
    <div className="flex flex-col gap-4">
      {/* Zone 1 — Record (fact) */}
      <div
        className="rounded-[10px] border px-4 py-4"
        style={{
          borderColor: "var(--purple)",
          background: "color-mix(in srgb, var(--purple) 8%, transparent)",
        }}
      >
        <p
          className="font-sans text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: "var(--purple)" }}
        >
          Record
        </p>
        <p
          className="mt-1 font-mono text-[40px] font-bold leading-none tabular-nums"
          style={{ color: "var(--purple)" }}
        >
          {prHeroValue(record, unit)}
        </p>
        <p
          className="mt-1 font-sans text-[12px]"
          style={{ color: "var(--muted-foreground)" }}
        >
          {formatAchievedDate(record.achieved_at)}
          {sourceExpr ? ` · ${sourceExpr}` : ""}
        </p>
        {kind !== "none" && (
          <p
            className="mt-1 font-mono text-[12px] font-semibold"
            style={{
              color:
                kind === "gain" ? "var(--green)" : "var(--muted-foreground)",
            }}
          >
            {kind === "gain"
              ? `+${formatWeightDelta(
                  record.delta_kg!,
                  unit,
                )} vs. previous best`
              : "matched previous best"}
          </p>
        )}
      </div>

      {/* Zone 2 — Trajectory (forecast) */}
      {record.current_e1rm_kg != null && (
        <div
          className="rounded-[10px] border px-4 py-4"
          style={{ borderColor: "var(--border)", background: "var(--card)" }}
        >
          <p
            className="font-sans text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: "var(--muted-foreground)" }}
          >
            Trajectory
          </p>
          <p
            className="mt-1 font-mono text-[22px] font-semibold tabular-nums"
            style={{
              color: "var(--foreground)",
              opacity: staleProjection ? 0.6 : 1,
            }}
          >
            {formatWeight(record.current_e1rm_kg, unit)}
          </p>
          <p
            className="mb-3 font-sans text-[12px]"
            style={{ color: "var(--muted-foreground)" }}
          >
            current trend
            {staleProjection &&
              " — a rough extrapolation across a long gap since your last set"}
          </p>
          <MovementTrendChart
            points={points}
            record={record}
            unit={unit}
            showProjection
            staleProjection={staleProjection}
          />
          {record.next_pr_kg == null && (
            <p
              className="mt-2 font-sans text-[12px]"
              style={{ color: "var(--muted-foreground)" }}
            >
              {noProjectionNote(trendDirection(record))}
            </p>
          )}
          <p
            className="mt-2 font-sans text-[11px]"
            style={{ color: "var(--muted-foreground)" }}
          >
            Solid = logged. Dashed = projected, not yet earned.
          </p>
        </div>
      )}
    </div>
  );
}
