"use client";

import { Snowflake } from "lucide-react";
import { FlameGlyph } from "@/components/gamification/FlameGlyph";
import type { StreakState } from "@/lib/api";

interface Props {
  streak: StreakState | null;
}

/**
 * Compact sidebar streak summary — renders exclusively from the canonical
 * server-computed `StreakState` (Domain 07 §D). Previously this widget took a
 * bare `streak: number` derived client-side via the now-superseded
 * `streakCalc` (days-based grace-week model); the whole point of this
 * domain's consolidation mandate is one streak value, computed server-side,
 * shown everywhere — including here.
 */
export function SidebarStreakWidget({ streak }: Props) {
  if (!streak || streak.current_streak === 0) return null;

  const { current_streak, personal_best, freezes_remaining } = streak;
  const pct =
    personal_best > 0
      ? Math.min(Math.round((current_streak / personal_best) * 100), 100)
      : 100;

  return (
    <div className="px-3 py-3 border-t border-[var(--border)] group-data-[collapsible=icon]:hidden">
      <div className="text-[10px] text-[var(--muted)] font-mono uppercase tracking-wider mb-1">
        Current streak
      </div>
      <div className="flex items-center gap-1.5 font-mono text-[20px] font-bold tabular-nums text-[var(--flame)] mb-1.5">
        <FlameGlyph className="h-4 w-4 shrink-0" />
        {current_streak} {current_streak === 1 ? "week" : "weeks"}
      </div>
      <div className="h-[5px] bg-[var(--surface-2)] rounded-full overflow-hidden mb-1.5">
        <div
          className="h-full rounded-full bg-[var(--flame)] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between font-mono text-[10.5px] text-[var(--muted)]">
        <span>Best: {personal_best}</span>
        <span
          className="inline-flex items-center gap-0.5 text-[var(--frost)]"
          title={`${freezes_remaining} of 2 streak freezes held`}
        >
          <Snowflake className="h-2.5 w-2.5" aria-hidden="true" />
          {freezes_remaining}
        </span>
      </div>
    </div>
  );
}
