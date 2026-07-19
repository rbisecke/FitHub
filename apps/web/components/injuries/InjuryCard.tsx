"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Siren,
} from "lucide-react";
import type { InjuryOut } from "@/lib/api/plans";
import { RegionGlyph } from "@/components/injuries/RegionGlyph";
import { regionLabel } from "@/components/injuries/RegionChipStrip";
import {
  injuryStatusMeta,
  stalenessLabel,
} from "@/components/injuries/injuryDisplay";

const STATUS_ICON = {
  alert: AlertTriangle,
  shieldAlert: ShieldAlert,
  shieldCheck: ShieldCheck,
  lock: Lock,
} as const;

function painTint(painLevel: number): string {
  if (painLevel >= 7) return "var(--red)";
  if (painLevel >= 4) return "var(--amber)";
  return "var(--muted)";
}

/**
 * Full-surface status-tinted injury card (05 §2 — Bible §1.4). The entire
 * card background carries the status tint, not just an icon or border, and
 * every status also repeats as an icon + text label so color is never the
 * sole signal.
 */
export function InjuryCard({
  injury,
  onOpen,
}: {
  injury: InjuryOut;
  onOpen: () => void;
}) {
  const [notesExpanded, setNotesExpanded] = useState(false);
  const meta = injuryStatusMeta(injury);
  const Icon = STATUS_ICON[meta.icon];
  const noteText = injury.restriction_notes || injury.notes || "";
  const truncated = noteText.length > 140 && !notesExpanded;

  return (
    <div
      className="w-full rounded-[10px]"
      style={{
        background: `color-mix(in srgb, ${meta.color} 12%, var(--bg))`,
        border: `1px solid color-mix(in srgb, ${meta.color} 45%, var(--border))`,
      }}
    >
      {injury.requires_referral && (
        <div
          className="flex items-center gap-1.5 rounded-t-[10px] px-4 py-1.5 font-sans text-[11px] font-semibold uppercase tracking-wide"
          style={{ background: "var(--red)", color: "var(--bg)" }}
        >
          <Siren size={13} aria-hidden="true" />
          Medical alert — clearance needed
        </div>
      )}

      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen();
          }
        }}
        aria-label={`Open ${regionLabel(injury.body_region)} injury details`}
        className="flex w-full min-h-11 cursor-pointer flex-col gap-2 rounded-b-[10px] px-4 py-3 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <RegionGlyph
              region={injury.body_region}
              size={22}
              tone={meta.color}
            />
            <span
              className="font-sans text-[15px] font-semibold"
              style={{ color: "var(--text)" }}
            >
              {regionLabel(injury.body_region)}
            </span>
          </div>
          <span
            className="shrink-0 font-mono tabular-nums text-[13px] font-semibold"
            style={{ color: painTint(injury.pain_level) }}
          >
            Pain {injury.pain_level}/10
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Icon size={14} color={meta.color} aria-hidden="true" />
          <span
            className="font-sans text-[12px] font-medium"
            style={{ color: meta.color }}
          >
            {meta.label}
          </span>
        </div>

        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono tabular-nums text-[11px]"
          style={{ color: "var(--muted)" }}
        >
          <span>{stalenessLabel(injury)}</span>
          {injury.mechanism && (
            <span
              className="rounded-full px-1.5 py-0.5 font-sans text-[10px] normal-case"
              style={{
                border: "1px solid var(--border)",
                color: "var(--muted)",
              }}
            >
              {injury.mechanism}
            </span>
          )}
        </div>

        {noteText && (
          <p
            className="font-sans text-[12px]"
            style={{ color: "var(--muted)" }}
          >
            {truncated ? `${noteText.slice(0, 140)}…` : noteText}
            {noteText.length > 140 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setNotesExpanded((v) => !v);
                }}
                aria-label={notesExpanded ? "Show less" : "Show more"}
                className="-my-2.5 ml-1 inline-block p-2.5 font-sans text-[11px] font-medium underline"
                style={{ color: "var(--accent)" }}
              >
                {notesExpanded ? "less" : "more"}
              </button>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
