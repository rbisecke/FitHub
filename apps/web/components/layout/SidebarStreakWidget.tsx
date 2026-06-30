"use client";

interface Props {
  streak: number;
}

export function SidebarStreakWidget({ streak }: Props) {
  return (
    <div className="border-t border-[var(--border)] px-4 py-3.5 flex items-center gap-2.5">
      <span
        className="text-[22px] flex-shrink-0"
        style={{ opacity: streak > 0 ? 1 : 0.5 }}
        aria-hidden
      >
        🔥
      </span>
      <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
        <div className="font-bold text-[13.5px] text-[var(--text)]">
          {streak > 0 ? `${streak} day streak` : "No streak yet"}
        </div>
        <div className="text-[11px] text-[var(--muted)] mt-0.5">
          {streak > 0 ? "keep the chain alive" : "start your streak today"}
        </div>
      </div>
      {streak > 0 && (
        <span className="font-heading text-[26px] text-[var(--hot)] group-data-[collapsible=icon]:hidden leading-none">
          {streak}
        </span>
      )}
    </div>
  );
}
