import { WearableRecoverySection } from "@/components/analytics/readiness/WearableRecoverySection";
import {
  acwrZone,
  acwrZoneLabel,
  computeAcwrSubScore,
  computeSleepSubScore,
  computeTsbSubScore,
  dominantFactorSentence,
  highLoadTone,
  highLoadToneCopy,
  inferHasTrainingData,
  strainBand,
} from "@/lib/analytics/readiness-copy";
import type { ReadinessResponse } from "@/lib/api";

interface ContributorRowProps {
  label: string;
  present: boolean;
  subScore: number | null;
  rawLabel: string | null;
}

function ContributorRow({
  label,
  present,
  subScore,
  rawLabel,
}: ContributorRowProps) {
  // `subScore` is expected pre-clamped to [0, 1] by the caller — sleep's
  // sub-score is deliberately unclamped upstream (readiness-copy.ts), so
  // callers clamp once before passing it in here rather than this component
  // re-clamping on top of that.
  const pct = subScore != null ? subScore * 100 : 0;
  return (
    <li className="flex flex-col gap-1 py-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-[var(--text)]">{label}</span>
        <span className="font-mono text-xs tabular-nums text-[var(--muted)]">
          {present ? rawLabel : "no data"}
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full"
        style={{ background: "var(--border)" }}
        aria-hidden="true"
      >
        {present && (
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, background: "var(--accent)" }}
          />
        )}
      </div>
    </li>
  );
}

interface Props {
  data: ReadinessResponse;
}

/**
 * Screen 5B — Readiness expanded view (04 §Screen 5, reached by tapping the
 * arc). Shows named/scored contributors, the one-dominant-factor sentence,
 * and — below the contributors — the wearable recovery section (Screen 6).
 */
export function ReadinessExpanded({ data }: Props) {
  const hasTrainingData = inferHasTrainingData(data);
  const acwrSubScore = computeAcwrSubScore(data.acwr, hasTrainingData);
  const tsbSubScore = computeTsbSubScore(data.tsb, hasTrainingData);
  const sleepSubScore = computeSleepSubScore(data.sleep_avg);

  const sentence = dominantFactorSentence({
    acwrSubScore,
    acwr: data.acwr,
    tsbSubScore,
    tsb: data.tsb,
    sleepSubScore,
    sleepAvg: data.sleep_avg,
  });

  const zone = acwrZone(data.acwr);
  const strainInsufficientBaseline = data.strain_score == null;

  return (
    <div className="flex flex-col gap-5" data-testid="readiness-expanded">
      {data.label === "high_load" && (
        <div
          className="rounded-lg border p-3"
          style={{
            borderColor: "var(--amber)",
            background: "rgba(210,153,34,0.08)",
          }}
          data-testid="high-load-tone-banner"
        >
          <p className="text-sm font-medium text-[var(--text)]">
            {highLoadToneCopy(highLoadTone(data.score))}
          </p>
        </div>
      )}

      <p
        className="text-base font-medium text-[var(--text)]"
        data-testid="dominant-factor-sentence"
      >
        {sentence}
      </p>

      <section aria-label="Readiness contributors">
        <h3 className="mb-1 font-mono text-[11px] tracking-[0.5px] text-[var(--muted)] uppercase">
          Contributors
        </h3>
        <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
          <ContributorRow
            label="ACWR"
            present={acwrSubScore != null}
            subScore={acwrSubScore}
            rawLabel={
              data.acwr != null
                ? `${data.acwr.toFixed(2)} · ${acwrZoneLabel(zone)}`
                : "not enough history"
            }
          />
          <ContributorRow
            label="Form (TSB)"
            present={tsbSubScore != null}
            subScore={tsbSubScore}
            // tsbSubScore is null exactly when !hasTrainingData
            // (computeTsbSubScore), so this stays in sync with `present`
            // by construction rather than as two independently-tracked
            // conditions.
            rawLabel={tsbSubScore != null ? data.tsb.toFixed(1) : null}
          />
          <ContributorRow
            label="Sleep (1–7 scale)"
            present={sleepSubScore != null}
            subScore={
              sleepSubScore != null
                ? Math.min(1, Math.max(0, sleepSubScore))
                : null
            }
            rawLabel={
              data.sleep_avg != null ? `${data.sleep_avg.toFixed(1)}/7` : null
            }
          />
        </ul>
      </section>

      {data.strain_score != null && (
        <section aria-label="Strain" data-testid="strain-section">
          <h3 className="mb-1 font-mono text-[11px] tracking-[0.5px] text-[var(--muted)] uppercase">
            Strain
          </h3>
          <p className="font-mono text-2xl font-bold tabular-nums text-[var(--text)]">
            {Math.round(data.strain_score)}
          </p>
          <p className="text-sm text-[var(--muted)]">
            {strainBand(data.strain_score) === "typical"
              ? "Typical for you"
              : strainBand(data.strain_score) === "above"
                ? "Above typical for you"
                : "Well above typical for you"}
          </p>
        </section>
      )}

      {strainInsufficientBaseline && (
        <section aria-label="Strain" data-testid="strain-insufficient-baseline">
          <h3 className="mb-1 font-mono text-[11px] tracking-[0.5px] text-[var(--muted)] uppercase">
            Strain
          </h3>
          <p className="text-sm text-[var(--muted)]">
            Strain needs ~7 days of history to compare against.
          </p>
        </section>
      )}

      <WearableRecoverySection data={data} />
    </div>
  );
}
