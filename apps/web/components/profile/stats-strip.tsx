import type { ProfileStats } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

const TILES: ReadonlyArray<{ key: keyof ProfileStats; label: string }> = [
  { key: "total_workouts", label: "Workouts" },
  { key: "total_prs", label: "PRs" },
  { key: "best_streak_weeks", label: "Best streak" },
  { key: "movements_tracked", label: "Movements tracked" },
];

/** Four-tile stats strip (08 §3). Real zeros for a new user, not em-dashes. */
export function StatsStrip({ stats }: { stats: ProfileStats | null }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {TILES.map(({ key, label }) => (
        <div
          key={key}
          className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4"
        >
          <span className="type-caption">{label}</span>
          {stats ? (
            <span className="type-num-hero text-[28px] leading-[32px]">
              {stats[key]}
            </span>
          ) : (
            <Skeleton className="h-8 w-12 rounded-sm" />
          )}
        </div>
      ))}
    </div>
  );
}
