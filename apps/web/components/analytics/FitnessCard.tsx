"use client";

import {
  getAtlLevel,
  getCtlTrend,
  getTsbState,
} from "@/lib/analytics/load-trend";
import type { DailyLoadPoint } from "@/lib/api";

interface Props {
  ctl: number;
  atl: number;
  tsb: number;
  series?: DailyLoadPoint[];
  isCalibrating?: boolean;
}

export function FitnessCard({
  ctl,
  atl,
  tsb,
  series = [],
  isCalibrating = false,
}: Props) {
  const ctlTrend = getCtlTrend(ctl, series);
  const atlLevel = getAtlLevel(atl);
  const tsbState = getTsbState(tsb);

  return (
    <div
      data-testid="fitness-card"
      className="rounded-lg border border-[--border] bg-[--surface] p-4"
    >
      <p className="text-sm font-medium text-[--muted] mb-3">
        Training metrics
      </p>

      {isCalibrating ? (
        <div className="py-4 text-center space-y-1">
          <p className="text-sm text-[--muted]">Still building your baseline</p>
          <p className="font-mono text-xs text-[--muted]/60">
            Log more sessions to see fitness trends
          </p>
        </div>
      ) : (
        <div
          className="grid grid-cols-3 gap-4"
          role="group"
          aria-label="Training metrics"
        >
          <div className="text-center">
            <p className="text-sm font-medium text-[--text]">Fitness</p>
            <p className="mt-1 text-xl font-semibold text-[--text]">
              {ctlTrend.arrow} {ctlTrend.word}
            </p>
            <p className="font-mono text-xs text-[--muted]">
              CTL {ctl.toFixed(1)}
            </p>
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-[--text]">Fatigue</p>
            <p className="mt-1 text-xl font-semibold text-[--text]">
              {atlLevel}
            </p>
            <p className="font-mono text-xs text-[--muted]">
              ATL {atl.toFixed(1)}
            </p>
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-[--text]">Form</p>
            <p className={`mt-1 text-xl font-semibold ${tsbState.className}`}>
              {tsbState.word}
            </p>
            <p className="font-mono text-xs text-[--muted]">
              TSB {tsb > 0 ? "+" : ""}
              {tsb.toFixed(1)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
