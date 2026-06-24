"use client";

import { useMemo } from "react";
import * as motion from "motion/react-client";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import type { WorkoutSummary } from "@/lib/api";

const DAYS = [
  { key: 1, label: "Mon" },
  { key: 2, label: "Tue" },
  { key: 3, label: "Wed" },
  { key: 4, label: "Thu" },
  { key: 5, label: "Fri" },
  { key: 6, label: "Sat" },
  { key: 0, label: "Sun" },
] as const;

interface WeekMiniGraphProps {
  workouts: WorkoutSummary[];
}

export function WeekMiniGraph({ workouts }: WeekMiniGraphProps) {
  const prefersReducedMotion = useReducedMotion();

  const { loggedDays, todayDayOfWeek } = useMemo(() => {
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

    return { loggedDays: logged, todayDayOfWeek: dayOfWeek };
  }, [workouts]);

  return (
    <motion.div
      role="group"
      aria-label="Workouts logged this week"
      className="rounded-lg border border-[--border] bg-[--surface] p-4"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut", delay: 0.08 }}
    >
      <p className="font-mono text-xs text-[--muted] mb-3">this week</p>
      <div className="flex items-center justify-between gap-1">
        {DAYS.map(({ key, label }) => {
          const logged = loggedDays.has(key);
          const isToday = key === todayDayOfWeek;
          return (
            <div key={key} className="flex flex-col items-center gap-1.5">
              <div
                aria-label={`${label}: ${logged ? "logged" : "not logged"}`}
                className={cn(
                  "w-5 h-5 rounded-full transition-colors",
                  logged ? "bg-[--green]" : "bg-[--border]",
                  isToday &&
                    "ring-1 ring-[--accent] ring-offset-1 ring-offset-[--surface]",
                )}
              />
              <span className="font-mono text-[9px] text-[--muted]">
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
