import { ForcedTheme } from "@/components/shared/forced-theme";
import { InjuryListScreen } from "@/components/injuries/InjuryListScreen";
import type { InjuryOut } from "@/lib/api/plans";

const now = "2026-07-19T12:00:00Z";

const EMPTY: InjuryOut[] = [];

const POPULATED: InjuryOut[] = [
  {
    id: "1",
    user_id: "dev",
    body_region: "knee",
    pain_level: 8,
    mechanism: "acute",
    notes: "Felt a pop landing a box jump.",
    active: true,
    status: "active",
    requires_referral: true,
    substitutions: [],
    contraindicated: ["back_squat", "pistol_squat", "box_jump", "running"],
    reported_at: now,
    resolved_at: null,
    cleared_at: null,
    restriction_notes: null,
    staleness_days: 0,
  },
  {
    id: "2",
    user_id: "dev",
    body_region: "lower_back",
    pain_level: 4,
    mechanism: "overuse",
    notes: "Tight after deadlifts, no acute injury.",
    active: true,
    status: "active",
    requires_referral: false,
    substitutions: ["goblet_squat", "kettlebell_swing"],
    contraindicated: ["deadlift", "good_morning", "sumo_deadlift_high_pull"],
    reported_at: now,
    resolved_at: null,
    cleared_at: null,
    restriction_notes: null,
    staleness_days: 6,
  },
  {
    id: "3",
    user_id: "dev",
    body_region: "shoulder",
    pain_level: 3,
    mechanism: "overuse",
    notes: null,
    active: true,
    status: "cleared_with_restrictions",
    requires_referral: false,
    substitutions: ["landmine_press"],
    contraindicated: ["handstand_pushup", "overhead_squat", "snatch"],
    reported_at: now,
    resolved_at: null,
    cleared_at: now,
    restriction_notes: "No overhead loading. Air squats and rowing OK.",
    staleness_days: 12,
  },
  {
    id: "4",
    user_id: "dev",
    body_region: "achilles",
    pain_level: 2,
    mechanism: "overuse",
    notes: null,
    active: true,
    status: "permanent",
    requires_referral: false,
    substitutions: ["row_erg", "bike_erg"],
    contraindicated: ["running", "double_under", "box_jump", "rope_climb"],
    reported_at: now,
    resolved_at: null,
    cleared_at: null,
    restriction_notes: "No running or jumping impact, ever.",
    staleness_days: 214,
  },
];

/**
 * Dev-only preview (Effort 4, 05 §2). Renders the production InjuryListScreen
 * with mock data — bypasses the real `/injuries` route's server-side auth
 * redirect, same pattern as `dev/workout-detail`. Two sections: the empty
 * state, and a populated list covering every status incl. a referral-flagged
 * active injury (triggers the multi-injury banner's red systemic-pause
 * framing) and a permanent/chronic injury (the reserved --chronic token).
 * Not part of the shipping app.
 */
export default function DevInjuriesListPreview() {
  return (
    <ForcedTheme
      theme="light"
      className="min-h-svh bg-background text-foreground"
    >
      <div className="flex flex-col gap-10 py-6">
        <section>
          <p
            className="mb-2 px-4 font-mono text-[11px] uppercase tracking-wide"
            style={{ color: "var(--muted)" }}
          >
            Empty state
          </p>
          <InjuryListScreen
            token="dev-preview-token"
            initialInjuries={EMPTY}
            initialLoadFailed={false}
            wodCheckHref="/injuries/wod-check"
          />
        </section>

        <section>
          <p
            className="mb-2 px-4 font-mono text-[11px] uppercase tracking-wide"
            style={{ color: "var(--muted)" }}
          >
            Populated — mixed statuses, referral-flagged, multi-injury banner
          </p>
          <InjuryListScreen
            token="dev-preview-token"
            initialInjuries={POPULATED}
            initialLoadFailed={false}
            wodCheckHref="/injuries/wod-check"
          />
        </section>
      </div>
    </ForcedTheme>
  );
}
