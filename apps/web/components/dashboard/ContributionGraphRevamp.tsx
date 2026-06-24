"use client";

import { useState, useMemo } from "react";
import * as motion from "motion/react-client";
import { useReducedMotion } from "motion/react";
import { CalendarHeatmap } from "@/components/ui/calendar-heatmap";
import { Button } from "@/components/ui/button";
import { graphWindow } from "@/lib/dashboard/graphWindow";
import type { WorkoutSummary } from "@/lib/api";

type ColourMode = "intensity" | "volume";

// 4 levels from low → high matching the GitHub green scale in globals.css
const VARIANT_CLASSNAMES = [
  "[&_.rdp-day_button]:bg-[#0e4429]", // level 1 — very low
  "[&_.rdp-day_button]:bg-[#006d32]", // level 2
  "[&_.rdp-day_button]:bg-[#26a641]", // level 3
  "[&_.rdp-day_button]:bg-[#39d353]", // level 4 — high
];

function avgIntensityLabel(workouts: WorkoutSummary[]): string {
  const vals = workouts
    .map((w) => w.perceived_load_au)
    .filter((v): v is number => v != null);
  if (vals.length === 0) return "—";
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  if (avg < 40) return "Low";
  if (avg <= 70) return "Moderate";
  if (avg <= 100) return "High";
  return "Very High";
}

interface ContributionGraphRevampProps {
  workouts: WorkoutSummary[];
}

export function ContributionGraphRevamp({
  workouts,
}: ContributionGraphRevampProps) {
  const prefersReducedMotion = useReducedMotion();
  const [mode, setMode] = useState<ColourMode>("intensity");

  const firstWorkoutDate = useMemo(() => {
    if (workouts.length === 0) return null;
    return new Date(workouts[workouts.length - 1]!.performed_at);
  }, [workouts]);

  const window = useMemo(
    () => graphWindow(workouts.length, firstWorkoutDate),
    [workouts.length, firstWorkoutDate],
  );

  const weightedDates = useMemo(() => {
    return workouts
      .filter((w) => new Date(w.performed_at) >= window.fromDate)
      .map((w) => ({
        date: new Date(w.performed_at),
        weight:
          mode === "intensity"
            ? w.perceived_load_au ?? 1
            : (w.duration_s ?? 60) / 60,
      }));
  }, [workouts, window.fromDate, mode]);

  const totalCount = workouts.length;
  const intensityLabel = avgIntensityLabel(workouts);
  const headerText = window.isAnchored
    ? "your training history"
    : `contributions · last ${window.numberOfMonths * 4} weeks`;

  if (totalCount < 3) {
    return (
      <motion.div
        className="rounded-lg border border-[--border] bg-[--surface] p-4 mb-6"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut", delay: 0.16 }}
      >
        <p className="font-mono text-xs text-[--muted] mb-3">{headerText}</p>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-[--muted] text-sm">
            Your training history will appear here.
          </p>
          <p className="font-mono text-xs text-[--muted] mt-1">
            $ git log --all
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="rounded-lg border border-[--border] bg-[--surface] p-4 mb-6"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut", delay: 0.16 }}
    >
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <p className="font-mono text-xs text-[--muted]">{headerText}</p>
        <div className="flex gap-1">
          <Button
            variant={mode === "intensity" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setMode("intensity")}
            aria-pressed={mode === "intensity"}
            className="h-6 px-2 text-[10px]"
          >
            Intensity
          </Button>
          <Button
            variant={mode === "volume" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setMode("volume")}
            aria-pressed={mode === "volume"}
            className="h-6 px-2 text-[10px]"
          >
            Volume
          </Button>
        </div>
      </div>

      <div
        data-testid="contribution-graph"
        className="overflow-x-auto"
        role="img"
        aria-label={`Training history: ${totalCount} workouts`}
      >
        <CalendarHeatmap
          weightedDates={weightedDates}
          variantClassnames={VARIANT_CLASSNAMES}
          numberOfMonths={window.numberOfMonths}
          startMonth={window.fromDate}
          endMonth={window.toDate}
          defaultMonth={window.fromDate}
          disableNavigation
          showOutsideDays={false}
          className="text-[--muted]"
        />
      </div>

      <p className="font-mono text-xs text-[--muted] mt-2">
        {totalCount} {totalCount === 1 ? "workout" : "workouts"} · Avg
        intensity: {intensityLabel}
      </p>
    </motion.div>
  );
}
