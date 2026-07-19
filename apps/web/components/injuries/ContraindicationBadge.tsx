"use client";

import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { ContraindicationRevealSheet } from "@/components/injuries/ContraindicationRevealSheet";

/**
 * Passive contraindication badge (05 §5.1 — plan step 4.19, coordinate with
 * Effort 5's session-execution screen once it exists). Standalone and
 * prop-driven: renders one session-movement row with a subtle full-surface
 * amber tint when flagged, plus a small inline caution badge. Tapping the
 * badge or row opens `ContraindicationRevealSheet` — never inline expand,
 * never a blocking modal.
 */
export function ContraindicationBadge({
  movementName,
  flagged,
  drivenBy,
  substitutions,
  onSwap,
  sessionBlocked = false,
}: {
  movementName: string;
  flagged: boolean;
  drivenBy: string[];
  substitutions: string[];
  onSwap?: (substitution: string) => void;
  /**
   * True when a referral-flagged active injury has paused the whole session
   * (05 §5.1: "every movement is marked blocked... not just its region").
   * A swap doesn't clear that pause, so the badge reads as non-actionable
   * and dims — tapping still opens the reveal sheet for context, but the
   * "Modify" framing (which implies swapping unblocks the movement) is
   * replaced with "Blocked".
   */
  sessionBlocked?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        role={flagged ? "button" : undefined}
        tabIndex={flagged ? 0 : -1}
        onClick={() => flagged && setOpen(true)}
        onKeyDown={(e) => {
          if (flagged && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        aria-label={
          flagged
            ? `${movementName} — ${
                sessionBlocked ? "blocked" : "flagged"
              }, view details`
            : movementName
        }
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-[8px] px-3 py-2"
        style={
          flagged
            ? {
                background: `color-mix(in srgb, var(--amber) ${
                  sessionBlocked ? 6 : 12
                }%, var(--bg))`,
                border: `1px solid color-mix(in srgb, var(--amber) ${
                  sessionBlocked ? 25 : 45
                }%, var(--border))`,
                cursor: "pointer",
                opacity: sessionBlocked ? 0.7 : 1,
              }
            : { background: "var(--bg)", border: "1px solid var(--border)" }
        }
      >
        <span
          className="font-sans text-[13px]"
          style={{ color: "var(--text)" }}
        >
          {movementName}
        </span>
        {flagged && (
          <span
            className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-sans text-[11px] font-semibold"
            style={
              sessionBlocked
                ? {
                    background: "transparent",
                    color: "var(--muted)",
                    border: "1px solid var(--border)",
                  }
                : { background: "var(--amber)", color: "var(--bg)" }
            }
          >
            <TriangleAlert size={12} aria-hidden="true" />
            {sessionBlocked ? "Blocked" : "Modify"}
          </span>
        )}
      </div>

      {open && (
        <ContraindicationRevealSheet
          movementName={movementName}
          drivenBy={drivenBy}
          substitutions={substitutions}
          onSwap={sessionBlocked ? undefined : onSwap}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
