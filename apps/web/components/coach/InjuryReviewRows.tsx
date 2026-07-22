"use client";

import { useState } from "react";
import { Check, ChevronDown, ShieldAlert, TriangleAlert } from "lucide-react";
import {
  RegionChipStrip,
  regionLabel,
} from "@/components/injuries/RegionChipStrip";
import { formatLabel } from "@/lib/display";

/**
 * Shared "MUST SUBSTITUTE (n)" / "SAFE AS-IS (n)" section heading, used by
 * both review screens so the count styling (full monospace, §0.4) and
 * label treatment stay identical.
 */
export function ResultGroupHeading({
  label,
  count,
  level = 2,
}: {
  label: string;
  count: number;
  /** 2 on the modify-workout screen (its only heading below the h1); 3 on
   * the WOD checker, which already has an h2 ("Check a WOD") above it. */
  level?: 2 | 3;
}) {
  const Tag = level === 3 ? "h3" : "h2";
  return (
    <Tag
      className="font-sans text-[13px] font-semibold uppercase tracking-wide"
      style={{ color: "var(--muted)" }}
    >
      {label} <span className="font-mono tabular-nums">({count})</span>
    </Tag>
  );
}

/**
 * Shared full-surface state-tinted rows for the injury engine's two
 * deterministic review surfaces (03 §11 modify-workout results, §12
 * standalone WOD checker) — same amber/green/red scheme Domain 05 already
 * uses for `ContraindicationBadge`, but read-only here: there is no swap
 * action on either screen, so a flagged row expands inline in place
 * (passive reveal, no sheet, no modal) rather than opening
 * `ContraindicationRevealSheet`.
 */
export function SubstituteRow({
  movementName,
  drivenBy,
  substitutions,
}: {
  movementName: string;
  drivenBy: string[];
  substitutions: string[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-[8px] px-3 py-2"
      style={{
        background: "color-mix(in srgb, var(--amber) 12%, var(--bg))",
        border: "1px solid color-mix(in srgb, var(--amber) 45%, var(--border))",
      }}
    >
      {/*
       * No "Modify" action-styled pill here (reverted after design review):
       * this screen is read-only with no swap action, so a colored,
       * button-shaped badge misleadingly implied a control that applies a
       * substitution. The warning icon + a plain rotating chevron instead
       * read as "flagged, tap to see why" — a disclosure, not a control.
       */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`${formatLabel(movementName)} — flagged, view details`}
        className="flex min-h-11 w-full items-center justify-between gap-2 text-left"
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <TriangleAlert
            size={14}
            aria-hidden="true"
            className="shrink-0"
            style={{ color: "var(--amber)" }}
          />
          <span
            className="min-w-0 flex-1 truncate font-sans text-[13px]"
            style={{ color: "var(--text)" }}
          >
            {formatLabel(movementName)}
          </span>
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className="shrink-0"
          style={{
            color: "var(--muted)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 150ms ease",
          }}
        />
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-3">
          <div>
            <p
              className="mb-1.5 font-sans text-[11px] font-medium uppercase tracking-wide"
              style={{ color: "var(--muted)" }}
            >
              Flagged by
            </p>
            {/*
             * Two separate active injuries in the same region (e.g. a
             * second "knee" report before the first resolves) both
             * contribute that region to `driven_by` server-side — dedupe
             * here so the chip strip never shows the same region twice.
             */}
            <RegionChipStrip regions={Array.from(new Set(drivenBy))} />
          </div>
          <div>
            <p
              className="mb-1.5 font-sans text-[11px] font-medium uppercase tracking-wide"
              style={{ color: "var(--muted)" }}
            >
              Substitutions{" "}
              <span className="font-mono tabular-nums">
                ({substitutions.length})
              </span>
            </p>
            {substitutions.length === 0 ? (
              <p
                className="font-sans text-[13px]"
                style={{ color: "var(--muted)" }}
              >
                No substitute — ask your coach.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {substitutions.map((sub, i) => (
                  <li
                    key={`${sub}-${i}`}
                    className="rounded-[6px] px-2.5 py-1.5 font-sans text-[13px]"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      color: "var(--text)",
                    }}
                  >
                    {sub}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function SafeRow({ movementName }: { movementName: string }) {
  return (
    <div
      className="flex min-h-11 items-center justify-between gap-2 rounded-[8px] px-3 py-2"
      style={{
        background: "color-mix(in srgb, var(--green) 10%, var(--bg))",
        border: "1px solid color-mix(in srgb, var(--green) 35%, var(--border))",
      }}
    >
      <span
        className="min-w-0 flex-1 truncate font-sans text-[13px]"
        style={{ color: "var(--text)" }}
      >
        {formatLabel(movementName)}
      </span>
      <span
        className="flex shrink-0 items-center gap-1 font-sans text-[11px] font-semibold"
        style={{ color: "var(--green)" }}
      >
        <Check size={12} aria-hidden="true" />
        Safe
      </span>
    </div>
  );
}

/**
 * The one hard-stop `--red` use on either screen (03 §11/§12) — ordinary
 * substitution rows above stay `--amber`; this banner is reserved strictly
 * for `any_referral_required`.
 */
export function ReferralBanner({ regions }: { regions: string[] }) {
  // Two separate referral-flagged injuries in the same region (§11 note
  // above) would otherwise repeat that region's name in the banner text.
  const deduped = Array.from(new Set(regions));
  return (
    <div
      role="alert"
      className="flex flex-col gap-1.5 rounded-[10px] px-4 py-3"
      style={{
        background: "color-mix(in srgb, var(--red) 16%, var(--bg))",
        border: "1px solid var(--red)",
      }}
    >
      <span
        className="flex items-center gap-2 font-sans text-[13px] font-semibold"
        style={{ color: "var(--red)" }}
      >
        <ShieldAlert size={16} aria-hidden="true" />
        Professional referral recommended
      </span>
      <p className="font-sans text-[13px]" style={{ color: "var(--text)" }}>
        Get clearance before continuing — flagged region
        {deduped.length === 1 ? "" : "s"}:{" "}
        {deduped.map((r) => regionLabel(r)).join(", ")}.
      </p>
    </div>
  );
}
