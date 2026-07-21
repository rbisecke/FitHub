"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { PersonalRecord } from "@/lib/api";
import type { MovementGroup } from "@/lib/records/groupByMovement";
import { variantKey } from "@/lib/records/groupByMovement";
import {
  deltaKind,
  e1rmConfidenceQualifier,
  prHeroValue,
  trendColorVar,
  trendDirection,
  trendGlyph,
  variantLabel,
  type WeightUnit,
} from "@/lib/records/prFormat";
import { formatWeightDelta, relativeDate } from "@/lib/display";

function movementDetailHref(record: PersonalRecord): string {
  const qs = new URLSearchParams();
  if (record.implement) qs.set("implement", record.implement);
  if (record.side) qs.set("side", record.side);
  const query = qs.toString();
  return `/progress/records/${record.movement_id}${query ? `?${query}` : ""}`;
}

function DeltaChip({
  record,
  unit,
}: {
  record: PersonalRecord;
  unit: WeightUnit;
}) {
  const kind = deltaKind(record);
  if (kind === "none") return null;
  if (kind === "matched") {
    return (
      <span className="font-mono text-[11px]" style={{ color: "var(--muted)" }}>
        matched
      </span>
    );
  }
  return (
    <span
      className="font-mono text-[11px] font-semibold"
      style={{ color: "var(--green)" }}
    >
      +{formatWeightDelta(record.delta_kg!, unit)}
    </span>
  );
}

function TrendGlyphChip({ record }: { record: PersonalRecord }) {
  const direction = trendDirection(record);
  if (direction == null) return null;
  return (
    <span
      className="font-mono text-[11px]"
      style={{ color: trendColorVar(direction) }}
      aria-label={`Current trend ${direction} vs. best`}
    >
      {trendGlyph(direction)}
    </span>
  );
}

/** One variant's PR line — used both as the card headline and as an expanded
 * row for every other tracked variant of the same movement. */
function VariantLine({
  record,
  unit,
  showName,
  showVariantLabel,
}: {
  record: PersonalRecord;
  unit: WeightUnit;
  showName: boolean;
  showVariantLabel: boolean;
}) {
  const label = showVariantLabel ? variantLabel(record) : null;
  const qualifier = e1rmConfidenceQualifier(record, unit);

  return (
    <Link
      href={movementDetailHref(record)}
      className="block min-w-0 flex-1"
      aria-label={`View ${record.movement_name}${
        label ? ` (${label})` : ""
      } detail`}
    >
      {showName ? (
        <p
          className="truncate font-sans text-[13px]"
          style={{ color: "var(--text)" }}
        >
          {record.movement_name}
          {label && (
            <span
              className="ml-1.5 font-sans text-[11px]"
              style={{ color: "var(--muted)" }}
            >
              {label}
            </span>
          )}
        </p>
      ) : (
        // Expanded variant rows omit the repeated movement name (the card
        // header already shows it) but must still show which variant this
        // row is — otherwise every row in the expanded list looks identical.
        label && (
          <p
            className="font-sans text-[11px]"
            style={{ color: "var(--muted)" }}
          >
            {label}
          </p>
        )
      )}
      <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span
          className="font-mono text-[22px] font-bold tabular-nums"
          style={{ color: "var(--purple)" }}
        >
          {prHeroValue(record, unit)}
        </span>
        <TrendGlyphChip record={record} />
        <DeltaChip record={record} unit={unit} />
      </div>
      {qualifier && (
        <p
          className="mt-0.5 font-sans text-[11px]"
          style={{ color: "var(--muted)" }}
        >
          {qualifier}
        </p>
      )}
      <p
        className="mt-0.5 font-mono text-[11px]"
        style={{ color: "var(--muted)" }}
      >
        {relativeDate(record.achieved_at)}
        {record.is_stale && (
          <span
            className="ml-1.5 uppercase tracking-wide"
            style={{ color: "var(--muted)" }}
          >
            stale
          </span>
        )}
      </p>
    </Link>
  );
}

/**
 * PR card list item (design-spec 04 Screen 1, §3) — one card per
 * `movement_id`. A single-variant movement renders the headline with no
 * affix, no behavior change. A multi-variant movement shows its best
 * variant as the headline plus a "+N more variant(s)" affix that expands
 * in place to list every variant's own PR line (progressive disclosure,
 * same mechanism as the readiness score's tap-to-expand).
 */
export function RecordsPRCard({
  group,
  unit,
}: {
  group: MovementGroup;
  unit: WeightUnit;
}) {
  const [expanded, setExpanded] = useState(false);
  const { headline, variants } = group;
  const hasMultipleVariants = variants.length > 1;
  const extraCount = variants.length - 1;

  return (
    <li
      className="rounded-[10px] border p-4"
      style={{
        borderColor: "var(--border)",
        background: headline.is_stale
          ? "color-mix(in srgb, var(--surface) 60%, var(--bg))"
          : "var(--surface)",
        opacity: headline.is_stale ? 0.75 : 1,
      }}
      data-testid="pr-card"
    >
      <div className="flex items-start justify-between gap-3">
        <VariantLine
          record={headline}
          unit={unit}
          showName
          showVariantLabel={hasMultipleVariants}
        />
        {hasMultipleVariants && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={`${expanded ? "Collapse" : "Expand"} ${
              group.movementName
            } variants`}
            className="flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 font-sans text-[11px] font-medium transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--muted)" }}
          >
            +{extraCount} more variant{extraCount === 1 ? "" : "s"}
            <ChevronDown
              size={12}
              aria-hidden="true"
              style={{
                transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              }}
              className="transition-transform"
            />
          </button>
        )}
      </div>

      {expanded && hasMultipleVariants && (
        <ul
          className="mt-3 flex flex-col gap-3 border-t pt-3"
          style={{ borderColor: "var(--border)" }}
        >
          {variants.map((variant) => (
            <li
              key={variantKey(variant)}
              className="rounded-[8px] p-2"
              style={{
                background: variant.is_stale
                  ? "color-mix(in srgb, var(--surface) 40%, var(--bg))"
                  : "transparent",
                opacity: variant.is_stale ? 0.75 : 1,
              }}
            >
              <VariantLine
                record={variant}
                unit={unit}
                showName={false}
                showVariantLabel
              />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
