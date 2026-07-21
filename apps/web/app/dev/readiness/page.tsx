import { ForcedTheme } from "@/components/shared/forced-theme";
import { ReadinessArc } from "@/components/analytics/readiness/ReadinessArc";
import { ReadinessExpanded } from "@/components/analytics/readiness/ReadinessExpanded";
import type { ReadinessResponse } from "@/lib/api";

interface Scenario {
  label: string;
  data: ReadinessResponse;
}

const SCENARIOS: Scenario[] = [
  {
    label: "optimal",
    data: {
      score: 0.85,
      label: "optimal",
      acwr: 1.05,
      tsb: 8,
      sleep_avg: 6.2,
      factors_available: 3,
      recovery_score: 0.82,
      coverage: 1,
      confidence_tier: "standard",
      hrv_type: "hrv_sdnn",
      strain_score: 95,
    },
  },
  {
    label: "fresh",
    data: {
      score: 0.68,
      label: "fresh",
      acwr: 1.1,
      tsb: 4,
      sleep_avg: 5.5,
      factors_available: 3,
      recovery_score: 0.7,
      coverage: 0.8,
      confidence_tier: "low_14_28",
      hrv_type: "hrv_rmssd",
      strain_score: 130,
    },
  },
  {
    label:
      'high_load — moderate band (score >= 0.55, tsb <= 0) — "carrying load"',
    data: {
      score: 0.6,
      label: "high_load",
      acwr: 1.35,
      tsb: -3,
      sleep_avg: 4.5,
      factors_available: 3,
      recovery_score: 0.55,
      coverage: 0.6,
      confidence_tier: "calibrating_14d",
      hrv_type: "hrv_sdnn",
      strain_score: 165,
    },
  },
  {
    label: 'high_load — severe band (score < 0.35) — "deeply fatigued"',
    data: {
      score: 0.22,
      label: "high_load",
      acwr: 1.7,
      tsb: -18,
      sleep_avg: 2.5,
      factors_available: 3,
      recovery_score: 0.2,
      coverage: 1,
      confidence_tier: "standard",
      hrv_type: "hrv_sdnn",
      strain_score: 60,
    },
  },
  {
    label: "fatigued (score in [0.35, 0.55))",
    data: {
      score: 0.4,
      label: "fatigued",
      acwr: 1.2,
      tsb: -8,
      sleep_avg: 3.0,
      factors_available: 3,
      recovery_score: null,
      coverage: null,
      confidence_tier: null,
      hrv_type: null,
      strain_score: null,
    },
  },
  {
    label:
      "insufficient_data — hard fallback (score=0.5 must NOT look like a computed 50%)",
    data: {
      score: 0.5,
      label: "insufficient_data",
      acwr: null,
      tsb: 0,
      sleep_avg: null,
      factors_available: 0,
      recovery_score: null,
      coverage: null,
      confidence_tier: null,
      hrv_type: null,
      strain_score: null,
    },
  },
  {
    label:
      "wearable present but composite in fallback (independent computation)",
    data: {
      score: 0.5,
      label: "insufficient_data",
      acwr: null,
      tsb: 0,
      sleep_avg: null,
      factors_available: 0,
      recovery_score: 0.74,
      coverage: 1,
      confidence_tier: "standard",
      hrv_type: "hrv_sdnn",
      strain_score: 105,
    },
  },
  {
    label: "training data present but ACWR null (TSB alone carries the score)",
    data: {
      score: 0.65,
      label: "fresh",
      acwr: null,
      tsb: 6,
      sleep_avg: 5.0,
      factors_available: 2,
      recovery_score: null,
      coverage: null,
      confidence_tier: null,
      hrv_type: null,
      strain_score: null,
    },
  },
  {
    label:
      "strain: well above typical (z-band approximation, see readiness-copy.ts gap note)",
    data: {
      score: 0.78,
      label: "optimal",
      acwr: 1.0,
      tsb: 5,
      sleep_avg: 6.0,
      factors_available: 3,
      recovery_score: 0.75,
      coverage: 1,
      confidence_tier: "standard",
      hrv_type: "hrv_sdnn",
      strain_score: 190,
    },
  },
  {
    label:
      "strain: insufficient baseline (< 7 distinct days) — distinct treatment, no raw number",
    data: {
      score: 0.72,
      label: "fresh",
      acwr: 1.0,
      tsb: 5,
      sleep_avg: 6.0,
      factors_available: 3,
      recovery_score: 0.7,
      coverage: 0.8,
      confidence_tier: "low_14_28",
      hrv_type: "hrv_sdnn",
      strain_score: null,
    },
  },
  {
    label:
      "wearable row exists but all 5 signals absent (recovery_score null, coverage 0/5)",
    data: {
      score: 0.6,
      label: "fresh",
      acwr: 1.0,
      tsb: 5,
      sleep_avg: null,
      factors_available: 2,
      recovery_score: null,
      coverage: 0,
      confidence_tier: "calibrating_14d",
      hrv_type: null,
      strain_score: null,
    },
  },
  {
    label: "no wearable row at all — Screen 6 section entirely absent",
    data: {
      score: 0.55,
      label: "fresh",
      acwr: 1.0,
      tsb: 2,
      sleep_avg: 4.0,
      factors_available: 2,
      recovery_score: null,
      coverage: null,
      confidence_tier: null,
      hrv_type: null,
      strain_score: null,
    },
  },
];

/**
 * Dev-only preview harness for Screen 5 (Readiness) / Screen 6 (Wearable
 * Recovery), 04-records-and-analytics.md. Several states here (hard
 * insufficient-data fallback, wearable-vs-composite divergence, ACWR-null,
 * strain-insufficient-baseline) can't be reliably reproduced through real
 * auth + seeded data, so this mirrors the `app/dev/injuries-list` pattern:
 * production components fed mock `ReadinessResponse` payloads directly, no
 * server fetch, no auth. Not part of the shipping app.
 */
export default function DevReadinessPreview() {
  return (
    <ForcedTheme
      theme="dark"
      className="min-h-svh bg-background text-foreground"
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-12 px-5 py-8">
        {SCENARIOS.map((s) => (
          <section key={s.label} className="flex flex-col gap-4">
            <p
              className="font-mono text-[11px] tracking-wide uppercase"
              style={{ color: "var(--muted)" }}
            >
              {s.label}
            </p>
            <div className="flex justify-center">
              <ReadinessArc data={s.data} href="#" />
            </div>
            <div
              className="rounded-lg border p-4"
              style={{ borderColor: "var(--border)" }}
            >
              <ReadinessExpanded data={s.data} />
            </div>
          </section>
        ))}
      </div>
    </ForcedTheme>
  );
}
