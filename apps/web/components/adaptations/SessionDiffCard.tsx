"use client";

import { ChevronDown } from "lucide-react";
import { relativeDate } from "@/lib/display";
import {
  sessionMagnitudeLabel,
  sessionMagnitudeVisual,
} from "@/lib/adaptationDiff";
import type { AdaptationSessionDiff } from "@/lib/api/plans";
import { AddRestRow, DiffItemRows } from "./DiffRow";

/**
 * GitKraken-style magnitude gauge (§8.3) — a static diverging bar, not a
 * slider: a thin track with a center zero-point, filled with small
 * rectangular (never rounded-pill/thumb) segments growing left (red,
 * reductions) or right (green, additions) from center. `swap_session` gets
 * a neutral accent fill since it's neither a reduction nor an addition.
 */
function MagnitudeMiniBar({ diff }: { diff: AdaptationSessionDiff }) {
  const { direction, fraction } = sessionMagnitudeVisual(diff);
  const color =
    direction === "negative"
      ? "var(--red)"
      : direction === "positive"
        ? "var(--green)"
        : "var(--accent)";
  const halfWidthPct = fraction * 50;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div
        className="relative h-1.5 w-16 shrink-0 rounded-sm"
        style={{ background: "var(--border)" }}
        aria-hidden="true"
      >
        {/* Center zero-point tick */}
        <div
          className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2"
          style={{ background: "var(--muted)" }}
        />
        {direction === "negative" ? (
          <div
            className="absolute inset-y-0 right-1/2 rounded-l-sm"
            style={{ width: `${halfWidthPct}%`, background: color }}
          />
        ) : (
          <div
            className="absolute inset-y-0 left-1/2 rounded-r-sm"
            style={{ width: `${halfWidthPct}%`, background: color }}
          />
        )}
      </div>
      <span
        className="truncate font-mono text-[11px] tabular-nums"
        style={{ color }}
      >
        {sessionMagnitudeLabel(diff)}
      </span>
    </div>
  );
}

export function SessionDiffCard({
  diff,
  viewed,
  onToggleViewed,
  readOnly = false,
}: {
  diff: AdaptationSessionDiff;
  viewed: boolean;
  onToggleViewed: (sessionId: string) => void;
  /**
   * Read-only mode (design spec §9): renders an already-applied diff with no
   * Viewed checklist and no collapse — the manual-revision composer's result
   * is a done deal, not a pending decision to review.
   */
  readOnly?: boolean;
}) {
  const isSkip = diff.change === "skip";
  const expanded = readOnly || !viewed;
  const dateLabel = diff.scheduled_date
    ? relativeDate(diff.scheduled_date)
    : null;

  return (
    <div
      data-testid="session-diff-card"
      className="rounded-lg border"
      style={{
        borderColor: isSkip
          ? "color-mix(in srgb, var(--red) 45%, var(--border))"
          : "var(--border)",
        background: isSkip
          ? "color-mix(in srgb, var(--red) 6%, var(--bg))"
          : "var(--surface)",
      }}
    >
      {/* Header — "file path" row: title+date, magnitude bar, Viewed checkbox, chevron. */}
      <div className="flex flex-col gap-2 p-3 md:flex-row md:items-center md:justify-between md:gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 items-baseline gap-2">
            <span
              className={`truncate font-sans text-[14px] font-semibold ${
                isSkip ? "line-through" : ""
              }`}
              style={{ color: "var(--text)" }}
            >
              {diff.session_title}
            </span>
            {dateLabel && (
              <span
                className="shrink-0 font-mono text-[11px] tabular-nums"
                style={{ color: "var(--muted)" }}
              >
                {dateLabel}
              </span>
            )}
          </div>
          {/* Mobile: mini-bar moves under the title (§8.5A). Desktop: beside it (below). */}
          <div className="md:hidden">
            <MagnitudeMiniBar diff={diff} />
          </div>
        </div>

        <div className="hidden shrink-0 md:block">
          <MagnitudeMiniBar diff={diff} />
        </div>

        {!readOnly && (
          <div className="flex shrink-0 items-center gap-1">
            <label className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 px-2">
              <input
                type="checkbox"
                checked={viewed}
                onChange={() => onToggleViewed(diff.session_id)}
                aria-label={`Mark ${diff.session_title} as viewed`}
                className="size-4 accent-[var(--green)]"
              />
              <span
                className="font-mono text-[11px]"
                style={{ color: viewed ? "var(--green)" : "var(--muted)" }}
              >
                viewed
              </span>
            </label>
            {isSkip ? null : (
              <span
                className="flex min-h-11 min-w-11 shrink-0 items-center justify-center"
                aria-hidden="true"
              >
                <ChevronDown
                  size={16}
                  className="transition-transform"
                  style={{
                    color: "var(--muted)",
                    transform: viewed ? "rotate(-90deg)" : "rotate(0deg)",
                  }}
                />
              </span>
            )}
          </div>
        )}
      </div>

      {/* Body — collapses once viewed (§8.4), like GitHub. Always expanded in read-only mode. */}
      {expanded && !isSkip && (
        <div
          className="flex flex-col gap-1 border-t px-3 py-3"
          style={{ borderColor: "var(--border)" }}
        >
          {diff.notes && (
            <p
              className="mb-1 font-sans text-[12px] italic"
              style={{ color: "var(--muted)" }}
            >
              {diff.notes}
            </p>
          )}
          {(diff.item_changes ?? []).map((item) => (
            <DiffItemRows
              key={
                item.item_id ??
                `${diff.session_id}-${item.item_order}-${item.movement_name}`
              }
              item={item}
            />
          ))}
          {diff.change === "add_rest" && <AddRestRow />}
          {(diff.item_changes ?? []).length === 0 &&
            diff.change !== "add_rest" && (
              <p
                className="font-mono text-[12px]"
                style={{ color: "var(--muted)" }}
              >
                No per-exercise detail on this change.
              </p>
            )}
        </div>
      )}

      {expanded && isSkip && (
        <div
          className="border-t px-3 py-3"
          style={{ borderColor: "var(--border)" }}
        >
          <p className="font-mono text-[12px]" style={{ color: "var(--red)" }}>
            − entire session removed from the plan
          </p>
          {diff.notes && (
            <p
              className="mt-1 font-sans text-[12px] italic"
              style={{ color: "var(--muted)" }}
            >
              {diff.notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
