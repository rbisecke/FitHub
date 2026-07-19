import Link from "next/link";
import type { WorkoutSummary } from "@/lib/api";
import { relativeDate } from "@/lib/display";
import { localDateKey } from "@/lib/units";

/**
 * Compact, non-expandable milestone card for a `git tag` log (01 §5.1, §6).
 *
 * Tag logs are single-PR-attempt records whose title bakes in the result
 * (built by the tag flow, §4), so the card needs no lazy result fetch — it shows
 * the title (which carries the value), a tag glyph, `short_hash`, and date on one
 * line, visually distinct from the full-workout summary cards so the two log
 * types read differently at a glance. The whole card links to the detail view.
 */
export function TagMilestoneCard({ workout }: { workout: WorkoutSummary }) {
  return (
    <Link
      href={`/workouts/${workout.short_hash}`}
      className="flex items-center gap-3 rounded-[10px] px-4 py-3"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--purple)",
      }}
    >
      <span
        className="font-data text-[15px]"
        style={{ color: "var(--purple)" }}
        aria-hidden
      >
        ⌖
      </span>
      <span className="min-w-0 flex-1">
        <span
          className="block truncate font-sans text-[13px] font-semibold"
          style={{ color: "var(--text)" }}
        >
          {workout.title || "Milestone"}
        </span>
        <span
          className="font-mono text-[11px]"
          style={{ color: "var(--muted)" }}
        >
          tag · {relativeDate(localDateKey(workout.performed_at))}
        </span>
      </span>
      <span
        className="shrink-0 font-mono text-[11px]"
        style={{ color: "var(--muted)" }}
      >
        {workout.short_hash}
      </span>
    </Link>
  );
}
