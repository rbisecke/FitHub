import { formatUsd } from "@/lib/admin/cost-format";

interface Props {
  projectedMonthEndUsd: number;
  budgetUsd: number;
}

/**
 * Hero: projected month-end vs. budget (`08` §7, item 1). One oversized
 * figure, the budget ceiling, and a quiet/danger status badge. Over-budget
 * flips the whole card to a full-surface danger fill (Bible §1.4) — the
 * only state signal on this screen with that treatment.
 *
 * The day-of-month / days-in-month readout on the right balances the card
 * (frontend-architect critique: the badge alone left a large empty region)
 * and makes the "straight-line" projection method concrete — it's exactly
 * the divisor the disclaimer below describes.
 */
export function CostHero({ projectedMonthEndUsd, budgetUsd }: Props) {
  const overBudget = projectedMonthEndUsd > budgetUsd;

  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();

  return (
    <div
      className={
        overBudget
          ? "rounded-lg border border-[var(--red)] bg-[var(--red)]/10 p-6"
          : "rounded-lg border border-[var(--border)] bg-[var(--bg)] p-6"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="type-caption text-[var(--muted-strong)]">
            Projected month-end (straight-line)
          </p>
          <p className="mt-1 font-mono text-5xl font-bold tabular-nums text-[var(--text)]">
            {formatUsd(projectedMonthEndUsd)}
          </p>
          <p className="mt-1 font-mono text-sm text-[var(--muted-strong)]">
            of {formatUsd(budgetUsd)} budget
          </p>
        </div>

        <div className="flex flex-col items-end justify-between gap-6 self-stretch">
          <span
            className={
              overBudget
                ? "rounded-full border border-[var(--red)] bg-[var(--red)] px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wide text-white"
                : "rounded-full border border-[var(--green)]/40 bg-[var(--green)]/10 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wide text-[var(--green)]"
            }
          >
            {overBudget ? "Over budget" : "Under budget"}
          </span>
          <p className="font-mono text-xs tabular-nums text-[var(--muted-strong)]">
            Day {dayOfMonth} of {daysInMonth}
          </p>
        </div>
      </div>

      <p className="mt-5 max-w-md border-t border-[var(--border)] pt-3 font-mono text-[11px] leading-relaxed text-[var(--muted)]">
        Projection is a naive estimate — cost-to-date ÷ day-of-month ×
        days-in-month, not day-of-week weighted. This dashboard reports usage
        only; it cannot limit or stop spend.
      </p>
    </div>
  );
}
