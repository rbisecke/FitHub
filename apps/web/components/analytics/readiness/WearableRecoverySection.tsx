import { ChartDataTable } from "@/components/shared/chart-data-table";
import type { ReadinessResponse } from "@/lib/api";

// Keyed against the exact enum unions (not `Record<string, string>`) so a
// backend addition to either union fails typecheck here instead of silently
// falling through to a raw enum token on screen.
const TIER_COPY: Record<
  NonNullable<ReadinessResponse["confidence_tier"]>,
  string
> = {
  calibrating_14d: "still calibrating (14+ days needed)",
  low_14_28: "14–28 days of history",
  standard: "28+ days — full confidence",
};

const HRV_LABEL: Record<NonNullable<ReadinessResponse["hrv_type"]>, string> = {
  hrv_sdnn: "HRV (SDNN)",
  hrv_rmssd: "HRV (RMSSD)",
};

interface Props {
  data: ReadinessResponse;
}

/**
 * Screen 6 — Wearable Recovery detail (04 §Screen 6). Renders the
 * independently-computed wearable `recovery_score`/coverage/confidence only
 * — strain is a Screen 5 concern and is rendered by `ReadinessExpanded`
 * itself, not here. Not a standalone destination: rendered inside Screen
 * 5B's expanded view, below the composite contributors.
 */
export function WearableRecoverySection({ data }: Props) {
  const rowExists =
    data.coverage != null ||
    data.confidence_tier != null ||
    data.hrv_type != null;

  // No `derived_metrics` row for today at all — the whole section is absent,
  // not an empty shell (04 §Screen 6 States).
  if (!rowExists) return null;

  const coveragePct =
    data.coverage != null ? Math.round(data.coverage * 100) : null;
  const coverageOfFive =
    data.coverage != null ? Math.round(data.coverage * 5) : null;

  const tableRows: Array<Array<string | number>> = [
    [
      "Wearable recovery score",
      data.recovery_score != null
        ? `${Math.round(data.recovery_score * 100)}%`
        : "no wearable signals today",
    ],
    ["Coverage", coverageOfFive != null ? `${coverageOfFive}/5 signals` : "—"],
    [
      "Confidence tier",
      data.confidence_tier
        ? TIER_COPY[data.confidence_tier] ?? data.confidence_tier
        : "—",
    ],
    [
      "HRV type",
      data.hrv_type ? HRV_LABEL[data.hrv_type] ?? data.hrv_type : "—",
    ],
  ];

  return (
    <section
      className="border-t pt-4"
      style={{ borderColor: "var(--border)" }}
      aria-label="Wearable recovery"
      data-testid="wearable-recovery-section"
    >
      <h3 className="mb-2 font-mono text-[11px] tracking-[0.5px] text-[var(--muted)] uppercase">
        Wearable recovery
      </h3>

      {/* sr-only fallback for the coverage/confidence snapshot below (04 cross-cutting a11y rule). */}
      <ChartDataTable
        caption="Wearable recovery snapshot"
        columns={["Metric", "Value"]}
        rows={tableRows}
      />

      <div aria-hidden="true" className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-2xl font-bold tabular-nums text-[var(--text)]">
            {data.recovery_score != null
              ? Math.round(data.recovery_score * 100)
              : "—"}
          </span>
          {data.confidence_tier && (
            <span
              className="rounded border px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted)]"
              style={{ borderColor: "var(--border)" }}
            >
              {TIER_COPY[data.confidence_tier] ?? data.confidence_tier}
            </span>
          )}
        </div>

        {data.recovery_score == null && (
          <p className="text-sm text-[var(--muted)]">
            No wearable signals today.
          </p>
        )}

        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] text-[var(--muted)]">
            {coverageOfFive != null
              ? `${coverageOfFive}/5 signals`
              : "0/5 signals"}
          </span>
          {data.hrv_type && (
            <span className="font-mono text-[11px] text-[var(--muted)]">
              {HRV_LABEL[data.hrv_type] ?? data.hrv_type}
            </span>
          )}
        </div>

        <div
          className="h-1.5 w-full overflow-hidden rounded-full"
          style={{ background: "var(--border)" }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${coveragePct ?? 0}%`,
              background: "var(--accent)",
            }}
          />
        </div>
      </div>
    </section>
  );
}
