"use client";

interface Props {
  streak: number;
  longest?: number;
}

export function SidebarStreakWidget({ streak, longest = streak }: Props) {
  if (streak === 0) return null;

  const pct = Math.min(
    Math.round((streak / Math.max(longest, streak)) * 100),
    100,
  );
  const daysToLongest = longest > streak ? longest - streak : 0;

  return (
    <div className="px-3 py-3 border-t border-[var(--border)] group-data-[collapsible=icon]:hidden">
      <div className="text-[10px] text-[var(--muted)] font-data uppercase tracking-wider mb-1">
        Current streak
      </div>
      <div className="font-data text-[20px] font-bold text-[var(--hot)] mb-1.5">
        🔥 {streak} days
      </div>
      <div className="h-[5px] bg-[var(--surface-2)] rounded-full overflow-hidden mb-1.5">
        <div
          className="h-full rounded-full bg-[var(--hot)] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      {daysToLongest > 0 && (
        <div className="font-data text-[10.5px] text-[var(--muted)]">
          {daysToLongest} day{daysToLongest > 1 ? "s" : ""} to longest (
          {longest})
        </div>
      )}
    </div>
  );
}
