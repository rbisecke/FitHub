"use client";

import { useState, useMemo, useCallback } from "react";
import * as motion from "motion/react-client";
import { useReducedMotion } from "motion/react";
import { CalendarHeatmap } from "@/components/ui/calendar-heatmap";
import { Button } from "@/components/ui/button";
import { graphWindow } from "@/lib/dashboard/graphWindow";
import { aggregateByDay } from "@/lib/dashboard/contributionTitle";
import type { WorkoutSummary } from "@/lib/api";

type ColourMode = "intensity" | "volume";

// 4 levels low → high using --heatmap-* CSS variables. With !bg these win over
// the cell's --heatmap-0 base (see HEATMAP_CLASSNAMES), colouring workout days.
const VARIANT_CLASSNAMES = [
  "!bg-[var(--heatmap-1)]", // level 1 — low
  "!bg-[var(--heatmap-2)]", // level 2 — moderate
  "!bg-[var(--heatmap-3)]", // level 3 — hard
  "!bg-[var(--heatmap-4)]", // level 4 — peak
];

// Shared cell styling. `bg-[var(--heatmap-0)]` gives every cell a faint base so the
// full grid ("ghost grid") is always visible; workout days override via the variants.
const HEATMAP_CLASSNAMES = {
  day: "h-5 w-5 text-center text-[0px] p-0 relative rounded-sm overflow-hidden bg-[var(--heatmap-0)]",
  today: "ring-1 ring-[--accent] ring-offset-1 ring-offset-[--surface]",
  weekday: "text-[--muted]/50 font-mono text-[9px] w-5",
  caption_label: "font-mono text-[10px] text-[--muted] tracking-wide",
  nav: "hidden",
};

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

  // Per-day aggregation so the cell tooltip carries magnitude (not colour-only).
  const dayInfo = useMemo(() => aggregateByDay(weightedDates), [weightedDates]);

  const unit = mode === "intensity" ? "load" : "min";
  const dayTitle = useCallback(
    (date: Date): string => {
      const label = date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      const info = dayInfo.get(date.toDateString());
      if (!info) return `${label} · no workout`;
      const noun = info.count === 1 ? "workout" : "workouts";
      return `${label} · ${info.count} ${noun} · ${unit} ${Math.round(
        info.sum,
      )}`;
    },
    [dayInfo, unit],
  );

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
        {/* Ghost grid — the shape of the contribution graph, waiting to be filled. */}
        <div className="overflow-x-auto opacity-50" aria-hidden="true">
          <CalendarHeatmap
            weightedDates={[]}
            variantClassnames={VARIANT_CLASSNAMES}
            numberOfMonths={window.numberOfMonths}
            defaultMonth={window.fromDate}
            disableNavigation
            showOutsideDays={false}
            className="text-[--muted]"
            classNames={HEATMAP_CLASSNAMES}
          />
        </div>
        <div className="text-center mt-3">
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
      className="rounded-lg border border-[--border] p-4 mb-6"
      // Subtle green glow behind the hero — depth + achievement cue (kept low-opacity).
      style={{
        background:
          "radial-gradient(110% 70% at 50% -10%, rgba(63,185,80,0.08), transparent 60%), var(--surface)",
      }}
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
          dayTitle={dayTitle}
          variantClassnames={VARIANT_CLASSNAMES}
          numberOfMonths={window.numberOfMonths}
          defaultMonth={window.fromDate}
          disableNavigation
          showOutsideDays={false}
          className="text-[--muted]"
          classNames={HEATMAP_CLASSNAMES}
        />
      </div>

      <p className="font-mono text-xs text-[--muted] mt-2">
        {totalCount} {totalCount === 1 ? "workout" : "workouts"} · Avg
        intensity: {intensityLabel}
      </p>
    </motion.div>
  );
}
