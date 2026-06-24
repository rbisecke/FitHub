"use client";

import { cn } from "@/lib/utils";
import type { DailyLoadPoint } from "@/lib/api";
import { ACWRZone } from "@/components/analytics/ACWRZone";
import { MetricGlossaryPopover } from "@/components/analytics/MetricGlossaryPopover";

type MetricKey = "ctl" | "atl" | "tsb";

interface TrainingSummaryHeroProps {
  ctlNow: number;
  atlNow: number;
  tsbNow: number;
  acwrNow: number | null;
  acwrZone: string;
  isCalibrating: boolean;
  series: DailyLoadPoint[];
  className?: string;
}

function buildSummaryNarrative(
  tsb: number,
  acwrZone: string,
  ctl: number,
): string {
  const fitnessWord =
    ctl >= 40 ? "strong" : ctl >= 25 ? "building" : "developing";
  const freshness =
    tsb > 10
      ? "fresh"
      : tsb > 0
        ? "recovering well"
        : tsb > -10
          ? "carrying some fatigue"
          : "fatigued";
  const load =
    acwrZone === "sweet_spot"
      ? "right in the optimal load zone"
      : acwrZone === "undertraining"
        ? "with room to push harder"
        : acwrZone === "caution"
          ? "on the edge of high load — watch recovery"
          : acwrZone === "overreaching"
            ? "carrying high load — ease up this week"
            : "still building your baseline";
  return `Your fitness base is ${fitnessWord}, you're ${freshness}, and ${load}.`;
}

function getCtlTrend(
  ctl: number,
  series: DailyLoadPoint[],
): { arrow: string; word: string } {
  if (series.length < 14) return { arrow: "→", word: "Stable" };
  const twoWeeksAgo = series[Math.max(0, series.length - 14)];
  const diff = ctl - (twoWeeksAgo?.ctl ?? ctl);
  if (diff > 2) return { arrow: "↑", word: "Rising" };
  if (diff < 0) return { arrow: "↓", word: "Declining" };
  return { arrow: "→", word: "Stable" };
}

function getAtlLevel(atl: number): string {
  if (atl < 15) return "Low";
  if (atl <= 25) return "Moderate";
  return "High";
}

function getTsbState(tsb: number): { word: string; className: string } {
  if (tsb > 10) return { word: "Peaked", className: "text-[--green]" };
  if (tsb > 0) return { word: "Good", className: "text-[--green]" };
  if (tsb >= -1) return { word: "Neutral", className: "text-[--muted]" };
  if (tsb >= -10) return { word: "Tired", className: "text-[--amber]" };
  return { word: "Fatigued", className: "text-[--red]" };
}

const METRIC_LABELS: Record<MetricKey, string> = {
  ctl: "CTL (Fitness)",
  atl: "ATL (Fatigue)",
  tsb: "TSB (Form)",
};

function MetricInfoTrigger({ metric }: { metric: MetricKey }) {
  return (
    <MetricGlossaryPopover
      defaultMetric={metric}
      triggerAriaLabel={`Learn more about ${METRIC_LABELS[metric]}`}
      triggerContent={
        <span
          aria-hidden="true"
          className="font-mono text-[9px] text-[--muted] hover:text-[--text] transition-colors"
        >
          ⓘ
        </span>
      }
      triggerClassName="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full"
    />
  );
}

export function TrainingSummaryHero({
  ctlNow,
  atlNow,
  tsbNow,
  acwrNow,
  acwrZone,
  isCalibrating,
  series,
  className,
}: TrainingSummaryHeroProps) {
  if (isCalibrating) {
    return (
      <div
        className={cn(
          "rounded-lg border border-[--border] bg-[--surface] p-4",
          className,
        )}
      >
        <p className="text-sm text-[--muted]">
          Still building your baseline — log more sessions to see your fitness
          trends.
        </p>
      </div>
    );
  }

  const summary = buildSummaryNarrative(tsbNow, acwrZone, ctlNow);
  const ctlTrend = getCtlTrend(ctlNow, series);
  const atlLevel = getAtlLevel(atlNow);
  const tsbState = getTsbState(tsbNow);

  return (
    <div
      className={cn(
        "rounded-lg border border-[--border] bg-[--surface] p-4 space-y-4",
        className,
      )}
    >
      <p className="text-base text-[--text]">{summary}</p>

      <div
        className="grid grid-cols-3 gap-2 sm:gap-3"
        role="group"
        aria-label="Training metrics"
      >
        {/* Fitness (CTL) */}
        <div className="rounded-md border border-[--border] bg-[--bg] p-2 sm:p-3 text-center">
          <p className="text-sm font-medium text-[--text]">Fitness</p>
          <p className="mt-1 text-base sm:text-xl font-semibold text-[--text] leading-tight">
            {ctlTrend.arrow} {ctlTrend.word}
          </p>
          <p className="font-mono text-[10px] text-[--muted] flex items-center justify-center gap-0.5 mt-1">
            CTL {ctlNow.toFixed(1)}
            <MetricInfoTrigger metric="ctl" />
          </p>
        </div>

        {/* Fatigue (ATL) */}
        <div className="rounded-md border border-[--border] bg-[--bg] p-2 sm:p-3 text-center">
          <p className="text-sm font-medium text-[--text]">Fatigue</p>
          <p className="mt-1 text-base sm:text-xl font-semibold text-[--text] leading-tight">
            {atlLevel}
          </p>
          <p className="font-mono text-[10px] text-[--muted] flex items-center justify-center gap-0.5 mt-1">
            ATL {atlNow.toFixed(1)}
            <MetricInfoTrigger metric="atl" />
          </p>
        </div>

        {/* Form (TSB) */}
        <div className="rounded-md border border-[--border] bg-[--bg] p-2 sm:p-3 text-center">
          <p className="text-sm font-medium text-[--text]">Form</p>
          <p
            className={cn(
              "mt-1 text-base sm:text-xl font-semibold leading-tight",
              tsbState.className,
            )}
          >
            {tsbState.word}
          </p>
          <p className="font-mono text-[10px] text-[--muted] flex items-center justify-center gap-0.5 mt-1">
            TSB {tsbNow > 0 ? "+" : ""}
            {tsbNow.toFixed(1)}
            <MetricInfoTrigger metric="tsb" />
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <ACWRZone zone={acwrZone} acwr={acwrNow} />
        <MetricGlossaryPopover
          triggerContent={
            <>
              <span aria-hidden="true" className="font-mono text-[9px]">
                ⓘ
              </span>
              What do these mean?
            </>
          }
          triggerClassName="text-xs text-[--muted] hover:text-[--text] transition-colors flex items-center gap-1"
          triggerAriaLabel="Learn more about training metrics"
        />
      </div>
    </div>
  );
}
