"use client";

import Link from "next/link";
import { arcPath, fractionToAngle } from "@/lib/charts";
import {
  readinessVerdict,
  readinessArcStyle,
  strainCopy,
} from "@/lib/analytics/readiness-copy";
import type { ReadinessResponse } from "@/lib/api";

interface Props {
  data: ReadinessResponse;
  /** Push destination for the tap-to-expand affordance (04 §5B: full-screen push, not a modal). */
  href: string;
}

const SIZE = 200;
const CENTER = SIZE / 2;
const OUTER_R = 92;
const INNER_R = 78;

/**
 * Screen 5A — Readiness resting view (04-records-and-analytics.md §Screen 5).
 *
 * At rest this renders ONLY: the score arc (fill color IS the reading), the
 * plain-language verdict, a confidence chip, and — when present — the strain
 * number. No contributor list, no chart, no formulas (Bible 1.5). Tapping the
 * arc pushes to the full-screen expanded view (Screen 5B).
 */
export function ReadinessArc({ data, href }: Props) {
  const pct = Math.round(data.score * 100);
  const style = readinessArcStyle(data.label);
  const verdict = readinessVerdict(data.label);
  const colorValue = `var(${style.colorVar})`;

  return (
    <Link
      href={href}
      data-testid="readiness-arc-link"
      aria-label={`Readiness ${pct} out of 100. ${verdict}. Tap for details.`}
      className="flex flex-col items-center gap-3 rounded-xl p-4 outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
    >
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          aria-hidden="true"
        >
          <g transform={`translate(${CENTER}, ${CENTER})`}>
            {style.treatment === "filled" ? (
              <>
                <path
                  d={arcPath({
                    innerRadius: INNER_R,
                    outerRadius: OUTER_R,
                    startAngle: 0,
                    endAngle: 2 * Math.PI,
                  })}
                  fill="var(--border)"
                />
                <path
                  d={arcPath({
                    innerRadius: INNER_R,
                    outerRadius: OUTER_R,
                    startAngle: 0,
                    endAngle: fractionToAngle(data.score, 0, 2 * Math.PI),
                  })}
                  fill={colorValue}
                />
              </>
            ) : (
              // insufficient_data: distinct dashed neutral outline, never a
              // filled arc that could be misread as a real 50% (04 §5A).
              <circle
                r={(INNER_R + OUTER_R) / 2}
                fill="none"
                stroke={colorValue}
                strokeWidth={OUTER_R - INNER_R}
                strokeDasharray="6 8"
              />
            )}
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-[40px] leading-none font-bold text-[var(--text)] tabular-nums">
            {style.treatment === "dashed-outline" ? "—" : pct}
          </span>
        </div>
      </div>

      <p className="text-center text-base font-medium text-[var(--text)]">
        {verdict}
      </p>

      <div className="flex items-center gap-2">
        <span
          className="rounded-full border px-2 py-0.5 font-mono text-[11px] tabular-nums text-[var(--muted)]"
          style={{ borderColor: "var(--border)" }}
          data-testid="readiness-confidence-chip"
        >
          {data.factors_available}/3 signals
        </span>
      </div>

      {data.strain_score != null && (
        <p
          className="font-mono text-[13px] tabular-nums text-[var(--muted)]"
          data-testid="readiness-strain-line"
        >
          {strainCopy(data.strain_score)}
        </p>
      )}
    </Link>
  );
}
