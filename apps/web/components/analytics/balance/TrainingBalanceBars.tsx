import { ChartDataTable } from "@/components/shared/chart-data-table";
import {
  categoryLabel,
  isZeroLoadBreakdown,
  sortByVolumePctDesc,
} from "@/lib/analytics/training-balance";
import type { TrainingBalanceResponse } from "@/lib/api";

interface Props {
  data: TrainingBalanceResponse;
}

/**
 * Screen 8 — Training Balance (04 §Screen 8). A ranked horizontal bar list,
 * NOT a pie/donut (the doc explicitly rejects that): one row per
 * `breakdown[].category`, sorted by `volume_pct` descending, each showing
 * category + proportional bar + `volume_pct` + raw `load_au`.
 *
 * Critical unit distinction (04 §Screen 8, nuance #7): this is
 * volume-load (`load_kg × reps`), a DIFFERENT unit than the perceived-load
 * (`load_au`) used on the Load Model / Volume Trend screens. Always labeled
 * explicitly so the two never sit unlabeled side by side.
 */
export function TrainingBalanceBars({ data }: Props) {
  const { breakdown, period_days } = data;

  if (breakdown.length === 0) {
    return (
      <div
        className="rounded-lg border p-8 text-center text-sm text-[var(--muted)]"
        style={{ borderColor: "var(--border)" }}
        data-testid="training-balance-empty"
      >
        No tagged training volume in the last {period_days} days. Movements need
        a muscle-group tag to appear in this breakdown.
      </div>
    );
  }

  if (isZeroLoadBreakdown(breakdown)) {
    return (
      <div
        className="rounded-lg border p-8 text-center text-sm text-[var(--muted)]"
        style={{ borderColor: "var(--border)" }}
        data-testid="training-balance-zero-load"
      >
        Tagged movements were logged in the last {period_days} days, but none
        recorded a load value — nothing to show a volume-load split for yet.
      </div>
    );
  }

  const sorted = sortByVolumePctDesc(breakdown);
  const maxPct = Math.max(...sorted.map((b) => b.volume_pct));

  const tableRows: Array<Array<string | number>> = sorted.map((b) => [
    categoryLabel(b.category),
    `${Math.round(b.volume_pct * 100)}%`,
    `${Math.round(b.load_au).toLocaleString()} kg·reps`,
  ]);

  return (
    <div className="flex flex-col gap-3">
      <p
        className="text-xs text-[var(--muted)]"
        data-testid="training-balance-unit-label"
      >
        Share of volume-load (kg × reps) by muscle group, last {period_days}{" "}
        days. This is a different unit than the perceived-load (AU) used on the
        Load Model and Volume Trend screens — the two aren&apos;t comparable.
      </p>

      {/*
        04 §Screen 8 asks for a "Based on {X}% of your logged volume"
        coverage caption. `GET /analytics/training-balance` computes
        volume_pct with untagged movements excluded from BOTH the numerator
        AND denominator (see get_training_balance's `tagged`/`total` CTEs in
        apps/api/app/repositories/analytics.py) and never returns an
        untagged/total figure, so an exact "{X}%" cannot be computed from
        this response — fabricating one would violate the no-fake-metrics
        rule. This qualitative caption states the same underlying risk
        (an untagged-heavy user sees a breakdown of only a slice of their
        real training) without inventing a number. Flagged in the effort
        report as a backend follow-up: expose total tagged+untagged
        volume-load so a real coverage percentage can replace this.
      */}
      <p
        className="text-xs text-[var(--muted)]"
        data-testid="training-balance-coverage-caption"
      >
        Movements without a muscle-group tag aren&apos;t counted in this
        breakdown — tag more movements for a fuller picture.
      </p>

      <ul className="flex flex-col gap-3" aria-hidden="true">
        {sorted.map((b) => {
          const pct = Math.round(b.volume_pct * 100);
          const barWidthPct = maxPct > 0 ? (b.volume_pct / maxPct) * 100 : 0;
          return (
            <li key={b.category} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-[var(--text)]">
                  {categoryLabel(b.category)}
                </span>
                <span className="font-mono text-xs tabular-nums text-[var(--muted)]">
                  {pct}% · {Math.round(b.load_au).toLocaleString()} kg·reps
                </span>
              </div>
              <div
                className="h-2.5 w-full overflow-hidden rounded-full"
                style={{ background: "var(--border)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${barWidthPct}%`,
                    background: "var(--accent)",
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <ChartDataTable
        caption="Training volume balance by muscle group"
        columns={[
          "Category",
          "Share of tagged volume",
          "Volume-load (kg × reps)",
        ]}
        rows={tableRows}
      />
    </div>
  );
}
