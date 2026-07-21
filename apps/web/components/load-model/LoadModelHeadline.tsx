import { Info } from "lucide-react";
import { MetricGlossaryPopover } from "@/components/analytics/MetricGlossaryPopover";
import {
  computeTrendDirection,
  trendColorClass,
  trendGlyph,
} from "@/lib/analytics/load-chart-helpers";
import type { DailyLoadPoint } from "@/lib/api";

interface HeadlineMetric {
  key: "ctl" | "atl" | "tsb";
  label: string;
  value: number;
  ariaLabel: string;
}

/**
 * Headline number row (design-spec 04 Screen 4): CTL ("Fitness"), ATL
 * ("Fatigue"), TSB ("Form"), each big/bold with a trend glyph. Per the
 * cross-cutting rule, only an "up" trend gets the accent/green color — down
 * or flat is always neutral, `--red` is reserved for the ACWR danger band,
 * not ordinary fitness ups and downs. Each number carries a "why" info
 * affordance (reusing the shared metric-glossary popover, which already
 * renders plain-language definitions with formulas collapsed behind a
 * "Show formula" disclosure) rather than showing raw formulas at rest.
 */
export function LoadModelHeadline({
  ctlNow,
  atlNow,
  tsbNow,
  series,
}: {
  ctlNow: number;
  atlNow: number;
  tsbNow: number;
  series: DailyLoadPoint[];
}) {
  const metrics: HeadlineMetric[] = [
    {
      key: "ctl",
      label: "Fitness",
      value: ctlNow,
      ariaLabel: "Learn what Fitness (CTL) means",
    },
    {
      key: "atl",
      label: "Fatigue",
      value: atlNow,
      ariaLabel: "Learn what Fatigue (ATL) means",
    },
    {
      key: "tsb",
      label: "Form",
      value: tsbNow,
      ariaLabel: "Learn what Form (TSB) means",
    },
  ];

  return (
    <div
      className="grid grid-cols-3 gap-3 rounded-[10px] border border-[var(--border)] bg-[var(--card)] p-4"
      role="group"
      aria-label="Training load headline metrics"
    >
      {metrics.map((m) => {
        const direction = computeTrendDirection(m.value, series, m.key);
        const signed =
          m.key === "tsb"
            ? `${m.value > 0 ? "+" : ""}${m.value.toFixed(1)}`
            : m.value.toFixed(1);
        return (
          <div key={m.key} className="text-center">
            <div className="flex items-center justify-center gap-1">
              <p className="font-sans text-[12px] font-medium text-[var(--muted-foreground)]">
                {m.label}
              </p>
              <MetricGlossaryPopover
                triggerContent={
                  <Info
                    size={12}
                    aria-hidden="true"
                    className="text-[var(--muted-foreground)]"
                  />
                }
                triggerAriaLabel={m.ariaLabel}
              />
            </div>
            <p className="font-mono text-[24px] font-bold text-[var(--foreground)] tabular-nums leading-tight">
              {signed}
              <span
                className={`ml-1 text-[16px] ${trendColorClass(direction)}`}
                aria-hidden="true"
              >
                {trendGlyph(direction)}
              </span>
            </p>
          </div>
        );
      })}
    </div>
  );
}
