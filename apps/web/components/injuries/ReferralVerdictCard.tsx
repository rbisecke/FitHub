import { isHighPain } from "./painLevel";

/**
 * Referral verdict card (05 §1.3) — full-surface `--red` panel when
 * `requires_referral` fires. The API doesn't return *why* it fired (no
 * reason field on `InjuryOut`), so the explanation falls back to the one
 * piece of data the client does have (the submitted pain level) and a
 * generic explanation otherwise.
 */
export function ReferralVerdictCard({ painLevel }: { painLevel: number }) {
  const reason = isHighPain(painLevel)
    ? `Pain level ${painLevel}/10 alone is enough to recommend a check.`
    : "This report indicates you should see a professional before continuing to train.";

  return (
    <div
      role="alert"
      className="rounded-[12px] p-4"
      style={{ background: "var(--red)", color: "var(--bg)" }}
      data-testid="referral-verdict-card"
    >
      <div className="mb-1 flex items-center gap-2">
        <span aria-hidden="true" className="text-[20px] leading-none">
          ⚠
        </span>
        <p className="font-sans text-[16px] font-bold">
          See a professional before training
        </p>
      </div>
      <p className="mb-3 font-sans text-[13px]">{reason}</p>
      <p className="font-sans text-[13px] font-medium">
        While this is flagged, training is paused across all movements until you
        have clearance.
      </p>
    </div>
  );
}
