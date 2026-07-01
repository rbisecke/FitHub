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
      className="flex flex-col gap-4 rounded-lg border border-zinc-700 bg-zinc-900 p-4"
    >
      <p className="font-mono text-xs text-zinc-500">
        $ git diff --injury HEAD~1
      </p>

      {anyReferralRequired && (
        <div
          data-testid="modifications-referral-alert"
          className="rounded border border-red-800 bg-red-950/40 px-3 py-2"
        >
          <p className="font-mono text-xs text-red-400">
            ⚠ MEDICAL ALERT — {referralRegions.join(", ")} requires physio
            clearance before training
          </p>
        </div>
      )}

      {modifications.length > 0 && (
        <div>
          <p className="mb-2 font-mono text-xs text-zinc-500">
            # blocked movements
          </p>
          <ul className="flex flex-col gap-3">
            {modifications.map((mod) => (
              <li
                key={mod.original_movement}
                data-testid="modification-item"
                className="rounded border border-zinc-800 bg-zinc-950 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-xs font-semibold text-red-400 line-through">
                    {mod.original_movement.replace(/_/g, " ")}
                  </span>
                  <span className="font-mono text-[10px] text-zinc-600">
                    {mod.driven_by.join(", ")}
                  </span>
                </div>
                {mod.substitutions.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1">
                    {mod.substitutions.map((sub) => (
                      <li
                        key={sub}
                        className="font-mono text-xs text-green-400"
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
          <p className="mb-2 font-mono text-xs text-zinc-500">
            # safe movements
          </p>
          <div className="flex flex-wrap gap-2">
            {safeMovements.map((mv) => (
              <span
                key={mv}
                className="rounded border border-zinc-700 px-2 py-1 font-mono text-xs text-zinc-300"
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
          className="font-mono text-xs text-green-400"
        >
          ✓ all movements safe given current injuries
        </p>
      )}
    </div>
  );
}
