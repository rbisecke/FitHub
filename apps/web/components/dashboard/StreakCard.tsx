"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Snowflake } from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import { MotionProvider } from "@/components/shared/motion-provider";
import { createApiClient } from "@/lib/api/client";
import type { StreakState } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { FlameGlyph } from "@/components/gamification/FlameGlyph";

const RING_RADIUS = 42;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/** Single-metric progress ring: `thisWeekCount / frequencyTarget` (07 §D — the
 * Bible explicitly rules out Apple's three-ring overlay in favor of one ring,
 * one metric). */
function WeekProgressRing({
  fraction,
  color,
  reducedMotion,
}: {
  fraction: number;
  color: string;
  reducedMotion: boolean;
}) {
  const clamped = Math.max(0, Math.min(1, fraction));
  const targetOffset = RING_CIRCUMFERENCE * (1 - clamped);

  return (
    <svg width="100" height="100" viewBox="0 0 100 100" aria-hidden="true">
      <circle
        cx="50"
        cy="50"
        r={RING_RADIUS}
        fill="none"
        stroke="var(--border)"
        strokeWidth="6"
      />
      <m.circle
        cx="50"
        cy="50"
        r={RING_RADIUS}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={RING_CIRCUMFERENCE}
        transform="rotate(-90 50 50)"
        initial={
          reducedMotion ? false : { strokeDashoffset: RING_CIRCUMFERENCE }
        }
        animate={{ strokeDashoffset: targetOffset }}
        transition={
          reducedMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 180, damping: 20 }
        }
      />
    </svg>
  );
}

interface StreakCardProps {
  accessToken: string;
}

/**
 * The canonical streak display (07 §D) — the single most emotionally-loaded
 * glanceable object in the app. Renders exclusively from the server-computed
 * `StreakState` object; no client-side recomputation (that's the whole point
 * of this domain's consolidation mandate — killing the old disagreeing
 * `streakCalc` / `best_streak_weeks`-only / greeting-header calculations).
 *
 * Non-critical surface: a fetch failure omits the card rather than blocking
 * the rest of the Today page (mirrors `ReadinessSection`'s convention).
 */
export function StreakCard({ accessToken }: StreakCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const [streak, setStreak] = useState<StreakState | null | undefined>(
    undefined,
  );

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const client = createApiClient(accessToken);

    client.profile
      .getStreak({ signal: controller.signal })
      .then((res) => {
        if (!cancelled) setStreak(res);
      })
      .catch(() => {
        if (cancelled || controller.signal.aborted) return;
        setStreak(null);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [accessToken]);

  if (streak === null) return null; // non-critical — fails silently, like readiness

  if (streak === undefined) {
    return (
      <div
        className="rounded-lg border p-6"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="flex items-center gap-4">
          <Skeleton className="h-[100px] w-[100px] rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </div>
    );
  }

  const {
    current_streak,
    personal_best,
    this_week_count,
    frequency_target,
    at_risk,
    is_comeback,
    freezes_remaining,
  } = streak;

  const isNewUser =
    current_streak === 0 &&
    personal_best === 0 &&
    this_week_count === 0 &&
    !is_comeback;

  // Not returned directly by the API — inferred client-side. `is_comeback`
  // covers the ≥14-day-absence case; this covers the other way a streak can
  // sit at 0: two consecutive missed weeks with no freeze left to bridge them,
  // while the user is still actively training (recently active, just broke
  // the streak). Distinguished from `isNewUser` by having a personal best to
  // surface.
  const isBrokenNoFreeze =
    current_streak === 0 && !is_comeback && personal_best > 0;

  const remaining = Math.max(0, frequency_target - this_week_count);
  const weekFraction =
    frequency_target > 0 ? this_week_count / frequency_target : 0;

  const flameColor = isBrokenNoFreeze ? "var(--muted)" : "var(--flame)"; // neutral/ember when broken — never red (07 §D)

  return (
    <Link
      href="/progress/streak"
      aria-label={`Current streak: ${current_streak} weeks. Personal best: ${personal_best} weeks. View streak detail.`}
      className={cn(
        "block rounded-lg border p-6 transition-colors",
        at_risk
          ? "border-[var(--amber)] bg-[var(--amber)]/10"
          : "border-[var(--border)] bg-[var(--surface)]",
      )}
    >
      <p className="mb-3 font-mono text-xs text-[var(--muted)]">streak</p>

      {isNewUser ? (
        <div>
          <p className="font-sans text-sm text-[var(--text)]">
            Initial commit — your training repo is live
          </p>
          <p className="mt-2 font-mono text-xs text-[var(--muted)]">
            $ git log --all (empty)
          </p>
        </div>
      ) : is_comeback ? (
        <div>
          <p className="font-sans text-base font-medium text-[var(--text)]">
            Welcome back — let&apos;s start a new streak
          </p>
          <p className="mt-2 font-mono text-xs text-[var(--muted)]">
            Best: {personal_best} {personal_best === 1 ? "week" : "weeks"}
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-5">
          <div className="relative flex h-[100px] w-[100px] shrink-0 items-center justify-center">
            <MotionProvider>
              <WeekProgressRing
                fraction={weekFraction}
                color="var(--accent)"
                reducedMotion={!!prefersReducedMotion}
              />
            </MotionProvider>
            <span
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ color: flameColor }}
              aria-hidden="true"
            >
              <FlameGlyph className="h-9 w-9" />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span
                className="font-mono text-5xl font-bold tabular-nums"
                style={{ color: flameColor }}
              >
                {current_streak}
              </span>
              <span className="font-sans text-sm text-[var(--muted)]">
                week streak
              </span>
            </div>

            {isBrokenNoFreeze ? (
              <p className="mt-1 font-sans text-sm font-medium text-[var(--text)]">
                Longest streak: {personal_best}{" "}
                {personal_best === 1 ? "week" : "weeks"}
              </p>
            ) : (
              <p className="mt-1 font-mono text-xs text-[var(--muted)]">
                Best: {personal_best} {personal_best === 1 ? "week" : "weeks"}
              </p>
            )}

            <div className="mt-2 flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[11px] tabular-nums"
                style={{
                  borderColor: "var(--frost)",
                  color: "var(--frost)",
                  opacity: freezes_remaining === 0 ? 0.5 : 1,
                }}
                title={`${freezes_remaining} of 2 streak freezes held`}
              >
                <Snowflake className="h-3 w-3" aria-hidden="true" />
                {freezes_remaining}
              </span>
            </div>

            <p
              aria-live="polite"
              className="mt-2 min-h-[1rem] font-sans text-xs text-[var(--amber)]"
            >
              {at_risk
                ? `${remaining} more session${
                    remaining === 1 ? "" : "s"
                  } this week to keep your ${current_streak}-week streak`
                : ""}
              {at_risk && freezes_remaining === 0
                ? " — no freezes left, this one counts"
                : ""}
            </p>
          </div>
        </div>
      )}
    </Link>
  );
}
