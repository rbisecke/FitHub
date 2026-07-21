import type { MovementHistoryEntry } from "@/lib/api";
import { formatWeight } from "@/lib/display";
import { formatAchievedDate, type WeightUnit } from "@/lib/records/prFormat";

/**
 * History tab (design-spec 04 Screen 2E) — full set log, newest -> oldest.
 * PR rows get a full-surface `--purple` tint + ribbon glyph (Bible 1.4);
 * since ties are all flagged, more than one row can carry the fill at once.
 * The column is labeled "PR when logged" (not live-recomputed truth,
 * functional §1.5) since `is_pr` is set once at creation and never
 * recalculated after edits/deletes.
 *
 * `workout_id` is part of the row data but isn't rendered as an outbound
 * link here: the shipped workout-detail route is keyed by a cosmetic
 * short_hash, not this raw id, and resolving up to 200 rows' hashes would
 * mean 200 extra requests — out of scope for this pass.
 */
export function HistoryTab({
  entries,
  unit,
}: {
  entries: MovementHistoryEntry[];
  unit: WeightUnit;
}) {
  if (entries.length === 0) {
    return (
      <p
        className="font-sans text-[13px]"
        style={{ color: "var(--muted-foreground)" }}
      >
        No sets logged yet for this movement.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" data-testid="history-table">
        <caption className="sr-only">
          Full logged-set history, PR when logged column marks {"‘"}was a PR at
          the time it was logged{"’"}
        </caption>
        <thead>
          <tr>
            {["Date", "Load", "Est. 1RM", "Notes"].map((h) => (
              <th
                key={h}
                scope="col"
                className="border-b border-[var(--border)] pb-2 pr-4 text-left font-sans text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: "var(--muted-foreground)" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((row, i) => (
            // `MovementHistoryEntry` carries no per-set id (backend gap — a
            // workout with two identical-looking sets logged the same day is
            // otherwise indistinguishable). Index is a last-resort tiebreaker
            // appended after every real field, not the key on its own — this
            // is a static, never-reordered list, so it's safe here (same
            // pattern as `ChartDataTable`'s row-index key).
            <tr
              key={`${row.workout_id}-${row.date}-${row.load_kg}-${row.reps}-${row.estimated_1rm_kg}-${i}`}
              style={
                row.is_pr
                  ? {
                      background:
                        "color-mix(in srgb, var(--purple) 10%, transparent)",
                    }
                  : undefined
              }
            >
              <td
                className="border-b border-[var(--border)] py-2 pr-4 font-mono text-[12px] tabular-nums"
                style={{ color: "var(--muted-foreground)" }}
              >
                {formatAchievedDate(row.date)}
              </td>
              <td
                className="border-b border-[var(--border)] py-2 pr-4 font-mono text-[12px] tabular-nums"
                style={{ color: "var(--foreground)" }}
              >
                {row.load_kg != null ? formatWeight(row.load_kg, unit) : "—"}
                {row.reps != null ? ` x ${row.reps}` : ""}
              </td>
              <td
                className="border-b border-[var(--border)] py-2 pr-4 font-mono text-[12px] font-semibold tabular-nums"
                style={{
                  color: row.is_pr ? "var(--purple)" : "var(--foreground)",
                }}
              >
                {formatWeight(row.estimated_1rm_kg, unit)}
                {row.is_pr && (
                  <span
                    className="ml-1.5 font-sans text-[9px] font-bold uppercase tracking-wide"
                    style={{ color: "var(--purple)" }}
                    aria-label="PR when logged"
                  >
                    PR
                  </span>
                )}
              </td>
              <td
                className="border-b border-[var(--border)] py-2 font-sans text-[11.5px]"
                style={{ color: "var(--muted-foreground)" }}
              >
                {row.notes ?? ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p
        className="mt-2 font-sans text-[10.5px]"
        style={{ color: "var(--muted-foreground)" }}
      >
        &quot;PR&quot; marks a set that was a personal record when logged —
        edits or deletions since then aren&apos;t retroactively recomputed.
      </p>
    </div>
  );
}
