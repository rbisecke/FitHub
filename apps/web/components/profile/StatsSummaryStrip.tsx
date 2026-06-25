import type { ProfileStats } from "@/lib/api";
import { StatCard } from "@/components/ui/stat-card";

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
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <StatCard
        label="Workouts"
        value={stats.total_workouts > 0 ? String(stats.total_workouts) : "—"}
        ariaLabel={`${stats.total_workouts} workouts logged`}
      />
      <StatCard
        label="PRs"
        value={stats.total_prs > 0 ? String(stats.total_prs) : "—"}
        ariaLabel={`${stats.total_prs} personal records`}
      />
      <StatCard
        label="Best streak"
        value={streak}
        ariaLabel={`${stats.best_streak_weeks} week best streak`}
      />
      <StatCard
        label="Movements"
        value={
          stats.movements_tracked > 0 ? String(stats.movements_tracked) : "—"
        }
        ariaLabel={`${stats.movements_tracked} movements tracked`}
      />
    </div>
  );
}
