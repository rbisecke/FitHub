"use client";

import { useEffect, useState } from "react";
import { Snowflake } from "lucide-react";
import { createApiClient } from "@/lib/api/client";
import type { StreakState } from "@/lib/api";
import { ContributionGraph } from "@/components/dashboard/ContributionGraph";
import { Skeleton } from "@/components/ui/skeleton";

const MILESTONES = [4, 8, 12, 26, 52];

function nextMilestone(currentStreak: number): number | null {
  return MILESTONES.find((m) => m > currentStreak) ?? null;
}

/**
 * `/progress/streak` — the streak-detail route (07 §D "Streak-detail screen
 * composition"). Single column, top to bottom, on every viewport: the
 * contribution graph, a streak-freeze explainer card, a personal-best
 * callout. None of these three benefit from a multi-column layout even on
 * desktop, so there's no responsive branch here.
 */
export function StreakDetailScreen({ accessToken }: { accessToken: string }) {
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

  const freezesRemaining = streak?.freezes_remaining ?? 0;
  const personalBest = streak?.personal_best ?? 0;
  const currentStreak = streak?.current_streak ?? 0;
  const upcoming = nextMilestone(currentStreak);
  const streakLoadFailed = streak === null;

  return (
    // max-w-4xl (not the Today page's max-w-2xl) — the contribution graph's
    // natural width (742px grid + 26px day-label gutter + card padding) needs
    // ~800px to render without horizontal scroll on desktop; a narrower
    // column forces scroll even above the 768px mobile breakpoint and fights
    // the graph's own "pin most-recent-week right" auto-scroll (07 §G).
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-5 py-6">
      <h1 className="font-mono text-lg font-bold text-[var(--text)]">
        $ git log --graph --all
      </h1>

      <ContributionGraph
        accessToken={accessToken}
        freezeConsumedThisWeek={streak?.freeze_consumed_this_week ?? false}
      />

      {/* Streak-freeze explainer card (07 §E) — count held, cap, how earned.
          No shop, no currency: freezes are earned only. */}
      <div
        className="rounded-lg border p-4"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="mb-2 flex items-center gap-2">
          <Snowflake
            className="h-4 w-4"
            style={{ color: "var(--frost)" }}
            aria-hidden="true"
          />
          <h2 className="font-sans text-sm font-semibold text-[var(--text)]">
            Streak freeze
          </h2>
        </div>
        {streak === undefined ? (
          <Skeleton className="h-4 w-40" />
        ) : streakLoadFailed ? (
          <p className="font-sans text-xs text-[var(--muted)]">
            Couldn&apos;t load your freeze count right now.
          </p>
        ) : (
          <>
            <p className="font-mono text-sm tabular-nums text-[var(--frost)]">
              {freezesRemaining} / 2 held
            </p>
            <p className="mt-2 font-sans text-xs text-[var(--muted)]">
              A streak freeze automatically covers one week you miss, so a
              single off week doesn&apos;t break your streak. You can hold up to
              2 at once.
            </p>
            <p className="mt-1 font-sans text-xs text-[var(--muted)]">
              {upcoming
                ? `Earned at 4, 8, 12, 26, and 52-week milestones — next at ${upcoming} weeks.`
                : "Earned at 4, 8, 12, 26, and 52-week milestones."}
            </p>
          </>
        )}
      </div>

      {/* Personal-best callout (07 §H reference — surfaced quietly here, not
          just at the moment a streak breaks). */}
      <div
        className="rounded-lg border p-4 text-center"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <p className="font-mono text-xs text-[var(--muted)]">Personal best</p>
        {streak === undefined ? (
          <Skeleton className="mx-auto mt-1 h-8 w-16" />
        ) : streakLoadFailed ? (
          <p className="mt-1 font-sans text-xs text-[var(--muted)]">
            Couldn&apos;t load this right now.
          </p>
        ) : (
          <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-[var(--text)]">
            {personalBest} {personalBest === 1 ? "week" : "weeks"}
          </p>
        )}
      </div>
    </div>
  );
}
