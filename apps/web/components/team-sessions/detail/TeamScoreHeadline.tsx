import {
  formatTeamScoreValue,
  teamScoreHeaderLabel,
} from "@/lib/team-sessions/leaderboard";
import type { TeamSession } from "@/lib/api";

/**
 * Shared team score headline (06 §3.2/F4) — the one creator-owned number,
 * visually distinct from the computed leaderboard below it. Null state
 * (nothing recorded) renders nothing here at all; the caller still shows the
 * scoring-type chip in the header.
 *
 * `team_score`/`_s`/`_reps` is entered by the creator independently of any
 * participant's own linked workout (06 §2 hint copy: "each person's own
 * result comes from their linked workout below") — a team can legitimately
 * have a recorded team result before anyone has individually logged. Without
 * `loggedCount === 0`'s caption below, that reads as a flat contradiction
 * against the header's "N of M logged" pill and the "No results yet" copy
 * directly under it (found live: "Final · 0 of 2 logged" next to a bold
 * "TEAM TIME 18:42" with both participants under "Did not log").
 */
export function TeamScoreHeadline({
  session,
  loggedCount,
}: {
  session: TeamSession;
  loggedCount: number;
}) {
  const value = formatTeamScoreValue(session);
  if (value == null) return null;
  const label = teamScoreHeaderLabel(session.scoring_type);

  return (
    <div className="flex flex-col items-center gap-0.5 py-2">
      {label && (
        <span
          className="font-sans text-[11px] font-medium uppercase tracking-wide"
          style={{ color: "var(--muted)" }}
        >
          {label}
        </span>
      )}
      <span
        className="font-mono text-[32px] font-bold tabular-nums"
        style={{ color: "var(--text)" }}
      >
        {value}
      </span>
      {loggedCount === 0 && (
        <span
          className="font-sans text-[11px]"
          style={{ color: "var(--muted)" }}
        >
          Recorded by the creator — no individual results linked yet
        </span>
      )}
    </div>
  );
}
