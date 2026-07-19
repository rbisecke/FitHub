import { Siren, TriangleAlert } from "lucide-react";
import type { InjurySummary } from "@/lib/injuryUnion";

/**
 * Multi-injury summary banner (05 §2, §4 — plan step 4.15). Tops the injury
 * list once 2+ active injuries exist. Referral-dominant state leads with
 * systemic-pause language instead of a movement count, because a referral
 * injury blocks every movement system-wide (05 §4) — an exact count would be
 * misleading busywork to compute client-side for that case.
 */
export function MultiInjurySummaryBanner({
  summary,
}: {
  summary: InjurySummary;
}) {
  const color = summary.referralDominant ? "var(--red)" : "var(--amber)";
  const Icon = summary.referralDominant ? Siren : TriangleAlert;

  return (
    <div
      role="status"
      className="flex items-center gap-2.5 rounded-[10px] px-4 py-3"
      style={{
        background: `color-mix(in srgb, ${color} 12%, var(--bg))`,
        border: `1px solid color-mix(in srgb, ${color} 45%, var(--border))`,
      }}
    >
      <Icon size={18} color={color} aria-hidden="true" className="shrink-0" />
      {summary.referralDominant ? (
        <p className="font-sans text-[13px] font-medium" style={{ color }}>
          Do not train — a professional referral is required before any workout
          can be filtered safely.
        </p>
      ) : (
        <p
          className="font-sans text-[13px] font-medium"
          style={{ color: "var(--text)" }}
        >
          <span
            className="font-mono tabular-nums font-semibold"
            style={{ color }}
          >
            {summary.activeCount}
          </span>{" "}
          active injuries blocking{" "}
          <span
            className="font-mono tabular-nums font-semibold"
            style={{ color }}
          >
            {summary.blockedMovementCount}
          </span>{" "}
          movements
        </p>
      )}
    </div>
  );
}
