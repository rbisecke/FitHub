import type { PlanDetail } from "@/lib/api/plans";

interface Props {
  generationTier: PlanDetail["generation_tier"];
  corrections: PlanDetail["corrections"];
  /** True whenever the plan was generated without a supplied `current_1rm_kg`
   * for the target lift (02 §11) — one-rm-peak only. Surfaced in this same
   * banner region per the design spec's "estimated percentages" honesty note. */
  estimatedPercentages?: boolean;
}

/**
 * Non-blocking generation-honesty banners (02 §3, §11) — fallback-tier
 * disclosure, verbatim correction list, and the one-rm-peak "estimated
 * percentages" note. All three share one collapsible, dismissible,
 * amber-caution surface directly under the plan header (02 §4/§5 layout
 * item 2). Renders nothing for the common case (AI-generated, no
 * corrections, a real 1RM supplied).
 */
export function PlanGenerationNotice({
  generationTier,
  corrections,
  estimatedPercentages = false,
}: Props) {
  const isFallback = generationTier != null && generationTier !== "ai";
  const hasCorrections = corrections.length > 0;

  if (!isFallback && !hasCorrections && !estimatedPercentages) return null;

  return (
    <div
      data-testid="plan-generation-notice"
      role="status"
      className="flex items-start gap-2 rounded-lg px-4 py-3"
      style={{
        background: "color-mix(in srgb, var(--amber) 15%, transparent)",
        border: "1px solid color-mix(in srgb, var(--amber) 40%, transparent)",
      }}
    >
      <span className="font-data text-[11px] text-[var(--amber)] mt-[1px]">
        $
      </span>
      <div className="flex flex-col gap-1">
        {isFallback && (
          <p className="font-data text-[12px] text-[var(--amber)] m-0">
            This plan was generated using a fallback method — some
            personalization may be reduced.
          </p>
        )}
        {estimatedPercentages && (
          <p className="font-data text-[12px] text-[var(--amber)] m-0">
            No 1RM was on file for the target lift — working loads are estimated
            percentages, not derived from a known max.
          </p>
        )}
        {hasCorrections && (
          <ul className="flex flex-col gap-0.5 m-0 pl-0 list-none">
            {corrections.map((message, i) => (
              <li
                key={`${i}-${message}`}
                className="font-data text-[11px] text-[var(--muted)]"
              >
                · {message}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
