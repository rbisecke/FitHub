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
  const top = records.slice(0, 3);

  return (
    <div
      className={cn(
        "rounded-lg border border-[--border] bg-[--surface] p-4 space-y-2",
        className,
      )}
    >
      <p className="text-sm font-medium text-[--text]">
        Recent personal records
      </p>

      {top.length === 0 ? (
        <p className="text-xs text-[--muted]">
          No personal records yet. Log some heavy lifts to start tracking PRs.
        </p>
      ) : (
        <ul className="space-y-2">
          {top.map((pr) => (
            <li key={`${pr.movement_id}-${pr.achieved_at}`}>
              <Link
                href={`/history/${pr.workout_id}`}
                className="flex items-baseline justify-between gap-2 hover:bg-[--bg] rounded px-2 py-1 transition-colors group"
              >
                <span className="text-sm text-[--text] group-hover:text-[--accent] transition-colors truncate">
                  {pr.movement_name}
                </span>
                <span className="font-mono text-xs text-[--muted] flex-shrink-0">
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
  );
}
