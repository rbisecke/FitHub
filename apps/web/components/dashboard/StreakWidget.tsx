"use client";

import { useEffect } from "react";
import * as motion from "motion/react-client";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { checkAndFireMilestoneToast } from "@/lib/pr-celebrations";
import type { StreakResult } from "@/lib/dashboard/streakCalc";

interface StreakWidgetProps {
  streak: StreakResult;
}

export function StreakWidget({ streak }: StreakWidgetProps) {
  const prefersReducedMotion = useReducedMotion();
  const { currentStreak, personalBest, atRisk, isComeback } = streak;

  useEffect(() => {
    checkAndFireMilestoneToast(currentStreak);
  }, [currentStreak]);

  const borderClass = atRisk ? "border-[--amber]" : "border-[--border]";

  return (
    <motion.div
      aria-label={`Current streak: ${currentStreak} weeks. Personal best: ${personalBest} weeks.`}
      className={cn("rounded-lg border bg-[--surface] p-4", borderClass)}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
      animate={
        atRisk && !prefersReducedMotion
          ? {
              borderColor: ["var(--amber)", "var(--border)", "var(--amber)"],
              opacity: 1,
              y: 0,
            }
          : { opacity: 1, y: 0 }
      }
      transition={
        atRisk && !prefersReducedMotion
          ? {
              borderColor: { duration: 2, repeat: Infinity, ease: "easeInOut" },
              opacity: { duration: 0.2 },
              y: { duration: 0.2 },
            }
          : { duration: 0.2, ease: "easeOut", delay: 0.04 }
      }
    >
      <p className="font-mono text-xs text-[--muted] mb-1">streak</p>

      {isComeback && currentStreak === 0 ? (
        <>
          <p className="text-sm text-[--text]">Back in the repo.</p>
          <p className="font-mono text-xs text-[--muted] mt-1">
            Best: {personalBest} {personalBest === 1 ? "week" : "weeks"}
          </p>
        </>
      ) : currentStreak === 0 ? (
        <>
          <p className="text-sm text-[--muted]">Start your streak.</p>
          <p className="font-mono text-xs text-[--muted] mt-1">$ git commit</p>
        </>
      ) : (
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold font-mono text-[--accent]">
              {currentStreak}
            </span>
            <span className="text-sm text-[--muted]">
              {currentStreak === 1 ? "week" : "weeks"}
            </span>
          </div>
          <p className="font-mono text-xs text-[--muted] mt-1">
            PB: {personalBest} {personalBest === 1 ? "week" : "weeks"}
          </p>
          {atRisk && (
            <p className="text-xs text-[--amber] mt-2">
              {streak.frequencyTarget - streak.thisWeekCount} more session
              {streak.frequencyTarget - streak.thisWeekCount !== 1
                ? "s"
                : ""}{" "}
              to keep it going
            </p>
          )}
        </>
      )}
    </motion.div>
  );
}
