import type { PlanDetail } from "@/lib/api/plans";

interface Props {
  generationTier: PlanDetail["generation_tier"];
  corrections: PlanDetail["corrections"];
}

/**
 * Small, non-blocking informational banner surfacing PlanDetail.generation_tier
 * and .corrections — both existed on the API response but were never rendered
 * anywhere in the frontend. Renders nothing for the common case (AI-generated,
 * no corrections), following the same honest, minimal notice pattern this app
 * already uses for injury-aware coach banners (see TodayPrescription).
 */
export function PlanGenerationNotice({ generationTier, corrections }: Props) {
  const isFallback = generationTier != null && generationTier !== "ai";
  const hasCorrections = corrections.length > 0;

  if (!isFallback && !hasCorrections) return null;

  return (
    <div
      data-testid="plan-generation-notice"
      className="flex items-start gap-2 rounded-lg bg-[rgba(210,153,34,0.15)] border border-[rgba(210,153,34,0.40)] px-4 py-3"
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
