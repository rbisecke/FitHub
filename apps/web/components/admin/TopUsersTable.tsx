import type { AdminUserCostRow } from "@/lib/api";
import { formatCount, formatPercent, formatUsd } from "@/lib/admin/cost-format";

interface Props {
  users: AdminUserCostRow[];
}

/**
 * Per-user cost — a sorted label/bar/value list, explicitly NOT a pie+table
 * (`08` §7, item 5; style-feedback rec 7). Bar width is proportional to each
 * user's SHARE OF TOTAL cost (not the top user's cost) so the bar always
 * visually agrees with the percent printed beside it — an earlier version
 * scaled bars to the max value, which made e.g. a 33% user's bar read as
 * "basically all the spend" (frontend-architect critique).
 */
export function TopUsersTable({ users }: Props) {
  if (users.length === 0) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg)] text-center font-mono text-sm text-[var(--muted)]">
        No LLM activity in this window.
      </div>
    );
  }

  const totalCost = users.reduce((sum, u) => sum + u.cost_30d_usd, 0);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)]">
      <div className="border-b border-[var(--border)] px-5 py-4">
        <h2 className="type-h3 text-[var(--text)]">Per-user cost</h2>
        <p className="type-caption mt-0.5 text-[var(--muted)]">
          By cost · last 30 days
        </p>
      </div>

      <div className="flex items-center gap-3 px-5 pt-4 font-mono text-[10.5px] uppercase tracking-wide text-[var(--muted-strong)]">
        <span className="w-32 flex-shrink-0">User</span>
        <span className="flex-1">Cost share</span>
        <span className="w-14 flex-shrink-0 text-right">%</span>
        <span className="w-20 flex-shrink-0 text-right">Interactions</span>
        <span className="w-20 flex-shrink-0 text-right">Cost (30d)</span>
      </div>

      <ul className="flex flex-col gap-3 p-5">
        {users.map((user) => {
          const hasName = user.display_name != null || user.email != null;
          const displayName =
            user.display_name ??
            user.email ??
            `user-${user.user_id.slice(0, 8)}`;
          const sharePct = totalCost > 0 ? user.cost_30d_usd / totalCost : 0;
          const barPct = sharePct * 100;
          return (
            <li key={user.user_id} className="flex items-center gap-3">
              <span
                className={
                  hasName
                    ? "w-32 flex-shrink-0 truncate font-sans text-sm text-[var(--text)]"
                    : "w-32 flex-shrink-0 truncate font-sans text-sm text-[var(--muted)] italic"
                }
                title={displayName}
              >
                {displayName}
              </span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
                <span
                  className="block h-full rounded-full bg-[var(--accent)]"
                  style={{ width: `${Math.max(barPct, 1.5)}%` }}
                />
              </span>
              <span className="w-14 flex-shrink-0 text-right font-mono text-xs tabular-nums text-[var(--muted)]">
                {formatPercent(sharePct)}
              </span>
              <span className="w-20 flex-shrink-0 text-right font-mono text-xs tabular-nums text-[var(--muted)]">
                {formatCount(user.interactions_30d)}
              </span>
              <span className="w-20 flex-shrink-0 text-right font-mono text-sm font-semibold tabular-nums text-[var(--text)]">
                {formatUsd(user.cost_30d_usd)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
