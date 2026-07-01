import Link from "next/link";
import type { PlanSummary } from "@/lib/api/plans";

function computeProgress(
  startDate: string,
  endDate: string,
  weeks: number,
): { progress: number; weeksElapsed: number } {
  const today = Date.now();
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const total = end - start;
  if (total <= 0) return { progress: 0, weeksElapsed: 0 };
  const elapsed = Math.max(0, today - start);
  const progress = Math.min(100, Math.round((elapsed / total) * 100));
  const weeksElapsed = Math.min(
    weeks,
    Math.max(0, Math.floor(elapsed / (7 * 24 * 60 * 60 * 1000))),
  );
  return { progress, weeksElapsed };
}

function relativeStart(startDate: string): string {
  const start = new Date(startDate).getTime();
  const days = Math.round((Date.now() - start) / (24 * 60 * 60 * 1000));
  if (days < 7) return `started ${days}d ago`;
  const weeks = Math.round(days / 7);
  return `started ${weeks}w ago`;
}

interface PlanCardProps {
  plan: PlanSummary;
}

export function PlanCard({ plan }: PlanCardProps) {
  const { progress, weeksElapsed } = computeProgress(
    plan.start_date,
    plan.end_date,
    plan.weeks,
  );
  const isActive = plan.status === "active";
  const weeksRemaining = plan.weeks - weeksElapsed;
  const gapText =
    weeksRemaining > 0 ? `${weeksRemaining}w remaining` : "Final week";

  return (
    <Link
      href={`/plans/${plan.id}`}
      className="flex flex-col bg-[var(--card)] border border-[var(--border)] rounded-[14px] p-[18px] cursor-pointer hover:border-[var(--accent)] transition-colors duration-150 font-data"
      data-testid="plan-card"
    >
      {/* Row 1: branch name + status badge */}
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-[11.5px] truncate"
          style={{ color: "var(--purple)" }}
        >
          ⎇ {plan.branch_name}
        </span>
        {isActive && (
          <span className="flex-shrink-0 text-[10px] font-bold text-[var(--accent)] bg-[rgba(74,222,128,0.12)] border border-[rgba(74,222,128,0.35)] px-[9px] py-[2px] rounded-full">
            active
          </span>
        )}
      </div>

      {/* Row 2: plan title */}
      <div className="font-bold text-[16px] text-[var(--foreground)] mt-[11px]">
        {plan.title}
      </div>

      {/* Row 3: duration + relative start */}
      <div className="text-[11.5px] text-[var(--muted)] mt-1">
        {plan.weeks} weeks · {relativeStart(plan.start_date)}
      </div>

      {/* Row 4: progress bar */}
      <div className="mt-[15px]">
        <div className="h-[7px] bg-[var(--surface-2)] rounded-[4px] overflow-hidden">
          <div
            className="h-full rounded-[4px] bg-[var(--accent)] transition-all"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        {/* Row 5: gap text + percentage */}
        <div className="flex items-center justify-between gap-2 mt-[9px]">
          <span className="text-[11px] text-[var(--muted)]">{gapText}</span>
          <span
            className="text-[12px] font-bold"
            style={{ color: "var(--accent)" }}
          >
            {progress}%
          </span>
        </div>
      </div>
    </Link>
  );
}
