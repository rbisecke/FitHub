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
 */
export function TeamScoreHeadline({ session }: { session: TeamSession }) {
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
    </div>
  );
}
