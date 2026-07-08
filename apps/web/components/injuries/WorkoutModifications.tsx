"use client";

import type { MovementModification } from "@/lib/api/plans";

interface Props {
  modifications: MovementModification[];
  safeMovements: string[];
  anyReferralRequired: boolean;
  referralRegions: string[];
}

export function WorkoutModifications({
  modifications,
  safeMovements,
  anyReferralRequired,
  referralRegions,
}: Props) {
  return (
    <div
      data-testid="workout-modifications"
      className="flex flex-col gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      <p className="font-mono text-xs text-[var(--muted)]">
        $ git diff --injury HEAD~1
      </p>

      {anyReferralRequired && (
        <div
          data-testid="modifications-referral-alert"
          className="rounded border border-[var(--red)]/30 bg-[var(--red)]/10 px-3 py-2"
        >
          <p className="font-mono text-xs text-[var(--red)]">
            ⚠ MEDICAL ALERT — {referralRegions.join(", ")} requires physio
            clearance before training
          </p>
        </div>
      )}

      {modifications.length > 0 && (
        <div>
          <p className="mb-2 font-mono text-xs text-[var(--muted)]">
            # blocked movements
          </p>
          <ul className="flex flex-col gap-3">
            {modifications.map((mod) => (
              <li
                key={mod.original_movement}
                data-testid="modification-item"
                className="rounded border border-[var(--border)] bg-[var(--bg)] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-red-400 line-through">
                    {mod.original_movement.replace(/_/g, " ")}
                  </span>
                  <span className="font-mono text-[10px] text-[var(--muted)]">
                    {mod.driven_by.join(", ")}
                  </span>
                </div>
                {mod.substitutions.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1">
                    {mod.substitutions.map((sub) => (
                      <li
                        key={sub}
                        className="font-mono text-xs text-[var(--green)]"
                      >
                        + {sub}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {safeMovements.length > 0 && (
        <div>
          <p className="mb-2 font-mono text-xs text-[var(--muted)]">
            # safe movements
          </p>
          <div className="flex flex-wrap gap-2">
            {safeMovements.map((mv) => (
              <span
                key={mv}
                className="rounded border border-[var(--border)] px-2 py-1 font-mono text-xs text-[var(--text)]"
              >
                {mv.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      )}

      {modifications.length === 0 && (
        <p
          data-testid="modifications-all-safe"
          className="font-mono text-xs text-[var(--green)]"
        >
          ✓ all movements safe given current injuries
        </p>
      )}
    </div>
  );
}
