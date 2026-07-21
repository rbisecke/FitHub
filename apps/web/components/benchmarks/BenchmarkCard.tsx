"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { parseLocalDate } from "@/lib/units";
import { BenchmarkSparkline } from "@/components/benchmarks/BenchmarkSparkline";
import type { BenchmarkEntry } from "@/lib/api";

function formatFullDate(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * One named-benchmark card (design-spec 04 Screen 3). Handles the three
 * distinct attempt-count states precisely:
 *   - single attempt: "first attempt" label, no sparkline, no improvement chip
 *   - multiple attempts, no improvement: sparkline shown (proves multiple
 *     attempts exist), but no "first attempt" label and no improvement chip —
 *     must render distinctly from the single-attempt case even though both
 *     have an empty `improvement_display`.
 *   - multiple attempts, real improvement: sparkline + improvement chip.
 */
export function BenchmarkCard({ entry }: { entry: BenchmarkEntry }) {
  const [expanded, setExpanded] = useState(false);
  const isSingleAttempt = entry.attempts.length === 1;
  const hasImprovement = entry.improvement_display !== "";

  const newestFirst = [...entry.attempts].reverse();

  return (
    <li className="rounded-[10px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-label={`${expanded ? "Collapse" : "Expand"} ${
          entry.name
        } attempt history`}
        disabled={isSingleAttempt}
        className="w-full text-left px-4 py-3 disabled:cursor-default"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-sans text-[14px] font-medium text-[var(--text)]">
              {entry.name}
            </p>
            {isSingleAttempt ? (
              <p className="font-mono text-[11px] text-[var(--muted)] mt-0.5">
                first attempt
              </p>
            ) : hasImprovement ? (
              <p className="font-mono text-[11px] text-[var(--green)] mt-0.5">
                {entry.improvement_display}
              </p>
            ) : (
              <p className="font-mono text-[11px] text-[var(--muted)] mt-0.5">
                {entry.attempts.length} attempts logged
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-[20px] font-bold text-[var(--purple)] tabular-nums">
              {entry.pr_display}
            </span>
            {!isSingleAttempt && (
              <ChevronDown
                size={16}
                aria-hidden="true"
                className="text-[var(--muted)] transition-transform"
                style={{
                  transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            )}
          </div>
        </div>
      </button>

      {/* Outside the button: a <table> (the sparkline's sr-only data-table
          fallback) is flow content and isn't valid inside a <button>, which
          only permits phrasing content — nesting it there would let the
          browser's parser silently close the button early, desyncing the
          live DOM from React's tree. */}
      {!isSingleAttempt && (
        <div className="px-4 pb-3">
          <BenchmarkSparkline attempts={entry.attempts} name={entry.name} />
        </div>
      )}

      {expanded && !isSingleAttempt && (
        <ul className="border-t border-[var(--border)] divide-y divide-[var(--border)]">
          {newestFirst.map((attempt) => (
            <li
              key={`${entry.name}-${attempt.date}-${attempt.result_seconds}`}
              className="px-4 py-2 flex items-center justify-between"
            >
              <span className="font-sans text-[12px] text-[var(--muted)]">
                {formatFullDate(attempt.date)}
              </span>
              <span className="font-mono text-[13px] text-[var(--text)] tabular-nums">
                {attempt.result_display}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
