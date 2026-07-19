import type { InjuryOut } from "@/lib/api/plans";

export type StatusTone = "red" | "amber" | "chronic";
/**
 * Icon key, deliberately a finer grain than `tone` — `active` (amber) and
 * `cleared_with_restrictions` share the amber token per 05 §2's spec, but an
 * identical icon on top of identical color would leave only the text label
 * to tell them apart. A distinct icon per status (independent of the shared
 * color) keeps the three-redundant-signals rule meaningful even where two
 * statuses intentionally share a tint.
 */
export type StatusIcon = "alert" | "shieldAlert" | "shieldCheck" | "lock";

export interface StatusMeta {
  tone: StatusTone;
  icon: StatusIcon;
  /** CSS custom-property value, e.g. "var(--red)". */
  color: string;
  label: string;
}

/**
 * Full-surface status tint + redundant text label (05 §2 — Bible §1.4: color
 * is never the only signal). `active` splits red/amber by severity: a
 * referral-required or high-pain (≥7) active injury reads as more urgent
 * (red) than a routine active injury (amber) — the persistent referral
 * ribbon adds a third, independent signal on top of this for the red case.
 */
export function injuryStatusMeta(injury: InjuryOut): StatusMeta {
  switch (injury.status) {
    case "active": {
      const severe = injury.requires_referral || injury.pain_level >= 7;
      return severe
        ? {
            tone: "red",
            icon: "alert",
            color: "var(--red)",
            label: "Active — filtering workouts.",
          }
        : {
            tone: "amber",
            icon: "shieldAlert",
            color: "var(--amber)",
            label: "Active — filtering workouts.",
          };
    }
    case "cleared_with_restrictions":
      return {
        tone: "amber",
        icon: "shieldCheck",
        color: "var(--amber)",
        label: "Cleared with restrictions.",
      };
    case "permanent":
      return {
        tone: "chronic",
        icon: "lock",
        color: "var(--chronic)",
        label: "Permanent — always filtered.",
      };
    case "resolved":
    default:
      return {
        tone: "chronic",
        icon: "lock",
        color: "var(--muted)",
        label: "Resolved.",
      };
  }
}

/** "reported 6 days ago" / "reported today" from the backend-computed staleness_days. */
export function stalenessLabel(injury: InjuryOut): string {
  const verb = injury.resolved_at ? "resolved" : "reported";
  const days = injury.staleness_days;
  if (days <= 0) return `${verb} today`;
  if (days === 1) return `${verb} 1 day ago`;
  return `${verb} ${days} days ago`;
}
