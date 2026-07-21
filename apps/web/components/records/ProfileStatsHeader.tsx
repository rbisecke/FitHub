/**
 * Profile-stats header (design-spec 04 Screen 1, §1). Two distinct mono
 * counters, deliberately never merged into one number: a movement can be
 * tracked (logged with a qualifying set) yet contribute more than one PR
 * once it has multiple tracked variants, so `total_prs` (variant rows) and
 * `movements_tracked` (distinct movements) are genuinely different counts.
 */
export function ProfileStatsHeader({
  totalPrs,
  movementsTracked,
}: {
  totalPrs: number;
  movementsTracked: number;
}) {
  return (
    <div className="flex gap-8">
      <div>
        <p
          className="font-mono text-[32px] font-bold leading-none tabular-nums"
          style={{ color: "var(--text)" }}
          data-testid="total-prs"
        >
          {totalPrs}
        </p>
        <p
          className="mt-1 font-sans text-[12px]"
          style={{ color: "var(--muted)" }}
        >
          PRs
        </p>
      </div>
      <div>
        <p
          className="font-mono text-[32px] font-bold leading-none tabular-nums"
          style={{ color: "var(--text)" }}
          data-testid="movements-tracked"
        >
          {movementsTracked}
        </p>
        <p
          className="mt-1 font-sans text-[12px]"
          style={{ color: "var(--muted)" }}
        >
          Movements tracked
        </p>
      </div>
    </div>
  );
}
