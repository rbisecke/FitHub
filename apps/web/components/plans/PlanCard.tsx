import Link from "next/link";
import type { PlanSummary } from "@/lib/api/plans";

function computeProgress(
  startDate: string,
  endDate: string,
  weeks: number,
): { progress: number; currentWeek: number } {
  const today = Date.now();
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const total = end - start;
  if (total <= 0) return { progress: 0, currentWeek: 1 };
  const elapsed = Math.max(0, today - start);
  const progress = Math.min(100, Math.round((elapsed / total) * 100));
  const currentWeek = Math.min(
    weeks,
    Math.max(1, Math.floor(elapsed / (7 * 24 * 60 * 60 * 1000)) + 1),
  );
  return { progress, currentWeek };
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface PlanCardProps {
  plan: PlanSummary;
}

export function PlanCard({ plan }: PlanCardProps) {
  const { progress, currentWeek } = computeProgress(
    plan.start_date,
    plan.end_date,
    plan.weeks,
  );
  const isActive = plan.status === "active";

  return (
    <Link
      href={`/plans/${plan.id}`}
      className="block bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 cursor-pointer hover:border-[var(--accent)] hover:-translate-y-0.5 transition-all duration-200"
      data-testid="plan-card"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-heading text-[16px] text-[var(--foreground)] leading-tight">
          {plan.title}
        </span>
        {isActive && (
          <span className="text-[10px] font-bold text-[var(--accent)] bg-[rgba(74,222,128,0.12)] border border-[rgba(74,222,128,0.3)] px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5">
            Active
          </span>
        )}
      </div>

      <div className="font-data text-[11px] text-[var(--muted)] mt-1">
        {plan.branch_name}
      </div>

      <div className="text-[12px] text-[var(--muted)] mt-1">
        {plan.weeks} weeks · {formatDate(plan.start_date)} →{" "}
        {formatDate(plan.end_date)}
      </div>

      <div className="mt-3.5">
        <div className="h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--accent)] rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="font-data text-[11.5px] text-[var(--muted)] mt-1.5 tabular-nums">
          Week {currentWeek} of {plan.weeks} · {progress}% complete
        </div>
      </div>

      <div className="flex items-center justify-between mt-3.5">
        <span className="text-[12px] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--muted)] px-2.5 py-0.5 rounded-full capitalize">
          {plan.goal.replace(/_/g, " ")}
        </span>
        <span
          className={`font-data text-[11px] px-2 py-0.5 rounded-full ${
            isActive
              ? "text-[var(--accent)] bg-[rgba(74,222,128,0.08)]"
              : "text-[var(--muted)]"
          }`}
        >
          {plan.status}
        </span>
      </div>
    </Link>
  );
}
