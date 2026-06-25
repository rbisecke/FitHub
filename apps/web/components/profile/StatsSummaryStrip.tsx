import type { ProfileStats } from "@/lib/api";

interface CellProps {
  value: string;
  label: string;
  ariaLabel: string;
}

function StatCell({ value, label, ariaLabel }: CellProps) {
  return (
    <div
      className="flex flex-col items-center rounded-md bg-[#161b22] p-3 text-center"
      aria-label={ariaLabel}
    >
      <span className="font-mono text-lg font-bold text-[#58a6ff]">
        {value}
      </span>
      <span className="font-mono text-[10px] text-[#8b949e] uppercase tracking-wider mt-0.5">
        {label}
      </span>
    </div>
  );
}

interface Props {
  stats: ProfileStats;
}

export function StatsSummaryStrip({ stats }: Props) {
  const streak =
    stats.best_streak_weeks === 1
      ? "1 wk"
      : stats.best_streak_weeks > 0
        ? `${stats.best_streak_weeks} wks`
        : "—";

  return (
    <div className="grid grid-cols-4 gap-2">
      <StatCell
        value={stats.total_workouts > 0 ? String(stats.total_workouts) : "—"}
        label="WKTs"
        ariaLabel={`${stats.total_workouts} workouts logged`}
      />
      <StatCell
        value={stats.total_prs > 0 ? String(stats.total_prs) : "—"}
        label="PRs"
        ariaLabel={`${stats.total_prs} personal records`}
      />
      <StatCell
        value={streak}
        label="Streak"
        ariaLabel={`${stats.best_streak_weeks} week best streak`}
      />
      <StatCell
        value={
          stats.movements_tracked > 0 ? String(stats.movements_tracked) : "—"
        }
        label="Mvts"
        ariaLabel={`${stats.movements_tracked} movements tracked`}
      />
    </div>
  );
}
