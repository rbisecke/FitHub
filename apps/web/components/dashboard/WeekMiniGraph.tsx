"use client";

import { useMemo } from "react";
import * as motion from "motion/react-client";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import type { WorkoutSummary } from "@/lib/api";
import { fadeUpProps } from "@/lib/motion";

const DAYS = [
  { key: 1, label: "M", full: "Mon" },
  { key: 2, label: "T", full: "Tue" },
  { key: 3, label: "W", full: "Wed" },
  { key: 4, label: "T", full: "Thu" },
  { key: 5, label: "F", full: "Fri" },
  { key: 6, label: "S", full: "Sat" },
  { key: 0, label: "S", full: "Sun" },
] as const;

interface WeekMiniGraphProps {
  workouts: WorkoutSummary[];
  frequencyTarget?: number;
}

export function WeekMiniGraph({
  workouts,
  frequencyTarget = 3,
}: WeekMiniGraphProps) {
  const prefersReducedMotion = useReducedMotion();

  const { loggedDays, todayDayOfWeek, thisWeekCount } = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon…

    // Monday of the current ISO week
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const logged = new Set<number>();
    for (const w of workouts) {
      const d = new Date(w.performed_at);
      if (d >= monday && d <= sunday) {
        logged.add(d.getDay());
      }
    }

    return {
      loggedDays: logged,
      todayDayOfWeek: dayOfWeek,
      thisWeekCount: logged.size,
    };
  }, [workouts]);

  return (
    <motion.div
      role="group"
      aria-label="Workouts logged this week"
      className="rounded-lg border border-[--border] bg-[--surface] p-4"
      {...fadeUpProps(prefersReducedMotion, 0.08)}
    >
      <p className="font-mono text-xs text-[--muted] mb-3">this week</p>
      <div
        role="img"
        aria-label={`This week: ${thisWeekCount} of ${frequencyTarget} sessions logged`}
        className="flex items-end justify-between overflow-hidden"
      >
        {DAYS.map(({ key, label }) => {
          const logged = loggedDays.has(key);
          const isToday = key === todayDayOfWeek;
          const shouldPulse =
            isToday &&
            !logged &&
            thisWeekCount < frequencyTarget &&
            !prefersReducedMotion;

          return (
            <div key={key} className="flex flex-col items-center gap-1">
              {shouldPulse ? (
                <motion.div
                  aria-hidden="true"
                  className="w-4 h-4 rounded-full bg-transparent border border-[--muted]/40 ring-1 ring-[--accent] ring-offset-1 ring-offset-[--surface]"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{
                    duration: 1.8,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              ) : (
                <div
                  aria-hidden="true"
                  className={cn(
                    "w-4 h-4 rounded-full transition-colors",
                    logged
                      ? "bg-[--green]"
                      : "bg-transparent border border-[--muted]/40",
                    isToday &&
                      "ring-1 ring-[--accent] ring-offset-1 ring-offset-[--surface]",
                  )}
                />
              )}
              <span className="font-mono text-[9px] text-[--muted-strong]">
                {label}
              </span>
            </div>
          );
        })}
      </div>
      <p className="font-mono text-xs mt-3 tabular-nums text-[--muted]">
        <span
          className={
            thisWeekCount >= frequencyTarget
              ? "text-[--green]"
              : "text-[--text]"
          }
        >
          {thisWeekCount}/{frequencyTarget}
        </span>{" "}
        sessions
      </p>
    </motion.div>
  );
}
