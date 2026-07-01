"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { PersonalRecord } from "@/lib/api";

interface Props {
  records: PersonalRecord[];
  className?: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function PRSummaryStrip({ records, className }: Props) {
  const top = records.slice(0, 5);
  const topDesktop = records.slice(0, 3);

  return (
    <>
      {/* Mobile: horizontal scroll card strip */}
      <div
        className={cn(
          "md:hidden bg-[var(--card)] border border-[var(--border)] rounded-[14px] p-[15px]",
          className,
        )}
      >
        <p className="font-bold text-[13px] text-[var(--foreground)] mb-[12px]">
          Recent PRs
        </p>
        {top.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">
            No personal records yet. Log some heavy lifts.
          </p>
        ) : (
          <div
            className="flex gap-[9px] overflow-x-auto"
            style={{ scrollbarWidth: "none" }}
          >
            {top.map((pr, i) => (
              <Link
                key={`${pr.movement_id}-${pr.achieved_at}`}
                href={`/history/${pr.workout_id}`}
                className="flex-shrink-0 rounded-[11px] p-[12px]"
                style={{
                  minWidth: 120,
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  className="font-data text-[9px] font-bold"
                  style={{ color: "var(--gold)" }}
                >
                  v{records.length - i}.0
                </div>
                <div className="font-semibold text-[12px] mt-[8px] leading-tight line-clamp-2">
                  {pr.movement_name}
                </div>
                <div
                  className="font-heading text-[17px] mt-[2px]"
                  style={{ color: "var(--gold)" }}
                >
                  {Number(pr.best_1rm_kg).toFixed(1)} kg
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Desktop: list format */}
      <div
        className={cn(
          "hidden md:block bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 space-y-2",
          className,
        )}
      >
        <div>
          <p className="text-[15px] font-bold text-[var(--foreground)]">
            Recent PRs
          </p>
          <p className="text-[12px] text-[var(--muted-foreground)]">
            latest tagged releases
          </p>
        </div>

        {topDesktop.length === 0 ? (
          <p className="text-xs text-[--muted]">
            No personal records yet. Log some heavy lifts to start tracking PRs.
          </p>
        ) : (
          <ul className="space-y-2">
            {topDesktop.map((pr) => (
              <li key={`${pr.movement_id}-${pr.achieved_at}`}>
                <Link
                  href={`/history/${pr.workout_id}`}
                  className="flex items-baseline justify-between gap-2 hover:bg-[--bg] rounded px-2 py-1 transition-colors group"
                >
                  <span className="text-sm text-[--text] group-hover:text-[--accent] transition-colors truncate">
                    {pr.movement_name}
                  </span>
                  <span className="font-data text-xs text-[var(--gold)] flex-shrink-0">
                    {Number(pr.best_1rm_kg).toFixed(1)} kg ·{" "}
                    {formatDate(pr.achieved_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="pt-1 border-t border-[--border]">
          <span
            className="text-xs text-[--muted]"
            title="Personal records page coming soon"
          >
            See all personal records →
          </span>
        </div>
      </div>
    </>
  );
}
