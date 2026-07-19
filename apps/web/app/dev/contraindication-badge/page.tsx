"use client";

import { ForcedTheme } from "@/components/shared/forced-theme";
import { ContraindicationBadge } from "@/components/injuries/ContraindicationBadge";
import { ReferralPausePanel } from "@/components/injuries/ReferralPausePanel";

const MOCK_ROWS: {
  movement: string;
  flagged: boolean;
  drivenBy: string[];
  substitutions: string[];
}[] = [
  { movement: "Air Squat", flagged: false, drivenBy: [], substitutions: [] },
  { movement: "Pull-up", flagged: false, drivenBy: [], substitutions: [] },
  {
    movement: "Back Squat",
    flagged: true,
    drivenBy: ["knee"],
    substitutions: ["Goblet Squat", "Box Squat", "Leg Press"],
  },
  {
    movement: "Overhead Squat",
    flagged: true,
    drivenBy: ["shoulder", "wrist"],
    substitutions: ["Front Squat", "Goblet Squat"],
  },
  {
    movement: "Rope Climb",
    flagged: true,
    drivenBy: ["forearm"],
    substitutions: [],
  },
  { movement: "Row (Erg)", flagged: false, drivenBy: [], substitutions: [] },
];

/**
 * Dev-only preview (05 §5.1, plan step 4.19). Mock session movement rows —
 * some safe, some flagged (incl. one with no substitutions), plus the
 * session-level referral-pause state — since the real session-execution
 * screen (Domain 02) doesn't exist yet to embed `ContraindicationBadge` and
 * `ReferralPausePanel` into. Not part of the shipping app.
 */
export default function DevContraindicationBadgePreview() {
  return (
    <ForcedTheme
      theme="light"
      className="min-h-svh bg-background text-foreground"
    >
      <div className="mx-auto flex max-w-[560px] flex-col gap-6 px-4 py-8">
        <section>
          <p
            className="mb-2 font-mono text-[11px] uppercase tracking-wide"
            style={{ color: "var(--muted)" }}
          >
            Session movement rows
          </p>
          <div className="flex flex-col gap-2">
            {MOCK_ROWS.map((row) => (
              <ContraindicationBadge
                key={row.movement}
                movementName={row.movement}
                flagged={row.flagged}
                drivenBy={row.drivenBy}
                substitutions={row.substitutions}
                onSwap={(sub) => alert(`Swap in: ${sub}`)}
              />
            ))}
          </div>
        </section>

        <section>
          <p
            className="mb-2 font-mono text-[11px] uppercase tracking-wide"
            style={{ color: "var(--muted)" }}
          >
            Referral-active state (session-level)
          </p>
          <ReferralPausePanel regions={["lower_back"]} />
        </section>
      </div>
    </ForcedTheme>
  );
}
