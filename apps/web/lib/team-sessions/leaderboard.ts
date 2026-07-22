import { scoringTypeLabel } from "@/lib/display";
import type { ScoringType, TeamSessionParticipant } from "@/lib/api";

/**
 * Team-session detail (design-spec 06 §3) display/derivation helpers — pure
 * functions so the podium/ranked-list/not-yet-logged partitioning and the
 * shared-team-score headline logic can be unit tested without mounting the
 * client component tree.
 */

/** §3.2 — the *headline-number* label, distinct from the F6 chip label
 * (`scoringTypeLabel`). Deliberate collision: amrap/total_reps both read
 * "Total reps" since they measure the same unit; the chip disambiguates. */
const TEAM_SCORE_HEADER_LABEL: Record<ScoringType, string> = {
  for_time: "Team time",
  amrap: "Total reps",
  total_reps: "Total reps",
  max_load: "Combined max load",
  relay: "Relay time",
  slowest_finisher: "Slowest time",
};

export function teamScoreHeaderLabel(
  scoringType: ScoringType | null | undefined,
): string | null {
  if (!scoringType) return null;
  return TEAM_SCORE_HEADER_LABEL[scoringType] ?? null;
}

/** mm:ss / h:mm:ss, matching the backend's own duration formatting style. */
export function formatDurationS(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

interface TeamScoreShape {
  scoring_type: ScoringType | null;
  team_score: string | null;
  team_score_s: number | null;
  team_score_reps: number | null;
}

const TIME_SCORING_TYPES = new Set<ScoringType>([
  "for_time",
  "relay",
  "slowest_finisher",
]);
const REPS_SCORING_TYPES = new Set<ScoringType>(["amrap", "total_reps"]);

/**
 * The shared `team_score`/`_s`/`_reps` headline value (§3.2/F4). Returns null
 * when none of the three fields are set — the null state renders only the
 * scoring-type chip, no label, no placeholder dash.
 */
export function formatTeamScoreValue(session: TeamScoreShape): string | null {
  const { scoring_type, team_score, team_score_s, team_score_reps } = session;
  if (
    scoring_type &&
    TIME_SCORING_TYPES.has(scoring_type) &&
    team_score_s != null
  ) {
    return formatDurationS(team_score_s);
  }
  if (
    scoring_type &&
    REPS_SCORING_TYPES.has(scoring_type) &&
    team_score_reps != null
  ) {
    return `${team_score_reps} reps`;
  }
  if (team_score) return team_score;
  if (team_score_s != null) return formatDurationS(team_score_s);
  if (team_score_reps != null) return `${team_score_reps} reps`;
  return null;
}

/** §1 States "Unnamed session" fallback, reused verbatim for the detail
 * header (§3): "{scoring_type label} with {first two display names} +N". */
export function derivedSessionName(
  scoringType: ScoringType | null,
  participants: TeamSessionParticipant[],
): string {
  const label = scoringTypeLabel(scoringType) || "Team session";
  const names = participants
    .slice()
    .sort((a, b) => a.joined_at.localeCompare(b.joined_at))
    .map((p) => p.display_name || p.guest_name || "Someone");
  if (names.length === 0) return label;
  const shown = names.slice(0, 2).join(" & ");
  const extra = names.length - 2;
  return extra > 0
    ? `${label} with ${shown} +${extra}`
    : `${label} with ${shown}`;
}

/** "1" / "2" / "T-2" — rank is never shown without this shared formatter so
 * ties always read as tied (§3 States). */
export function formatRankBadge(rank: number, tied: boolean): string {
  return tied ? `T-${rank}` : String(rank);
}

export interface PartitionedParticipants {
  /** Top 3 by rank (relay: always empty — no per-person rank exists). */
  podium: TeamSessionParticipant[];
  /** Rank 4+ (or all ranked participants when relay is not in play but the
   * podium is short, e.g. only 1-2 logged). */
  ranked: TeamSessionParticipant[];
  /** No linked result. On Final, this is presented as "Did not log". */
  notLogged: TeamSessionParticipant[];
  /** Relay has no per-person rank — podium suppressed, roster shown flat as
   * `ranked` regardless of position count. */
  isRelay: boolean;
  /** rank -> count, for tie-badge lookups shared by podium + ranked rows. */
  rankCounts: Map<number, number>;
}

function byJoinedAt(
  a: TeamSessionParticipant,
  b: TeamSessionParticipant,
): number {
  return a.joined_at.localeCompare(b.joined_at);
}

/**
 * Groups a session's participants into podium / ranked / not-yet-logged per
 * §3.3/§3.4/§3.5. Ties share a rank number; within a tie, `joined_at` breaks
 * order (§3 States) — including the podium-boundary case, since sorting by
 * `(rank, joined_at)` before slicing the top 3 naturally seats the
 * earlier-joined tie-member on the plinth and pushes the later-joined member
 * to lead the plain list at the same shared rank.
 */
export function partitionParticipants(
  participants: TeamSessionParticipant[],
  scoringType: ScoringType | null,
): PartitionedParticipants {
  const isRelay = scoringType === "relay";
  const logged = participants.filter((p) => p.workout_id != null);
  const notLogged = participants
    .filter((p) => p.workout_id == null)
    .slice()
    .sort(byJoinedAt);

  const rankCounts = new Map<number, number>();
  for (const p of logged) {
    if (p.rank != null)
      rankCounts.set(p.rank, (rankCounts.get(p.rank) ?? 0) + 1);
  }

  if (isRelay) {
    // No per-person rank for relay by design — the whole logged roster
    // renders flat (no podium, no rank numerals).
    return {
      podium: [],
      ranked: logged.slice().sort(byJoinedAt),
      notLogged,
      isRelay: true,
      rankCounts,
    };
  }

  const rankedAll = logged
    .filter((p) => p.rank != null)
    .sort(
      (a, b) => (a.rank as number) - (b.rank as number) || byJoinedAt(a, b),
    );
  // Defensive: a participant can have a linked workout but a null rank (the
  // backend only computes `has_score`/rank when its scoring-type-specific
  // source value is present — e.g. a for_time result missing duration_s).
  // These must still render somewhere (never silently dropped, matching the
  // "did not log" DNF philosophy) — append them to the flat ranked list,
  // unranked, rather than excluding them from every bucket.
  const loggedNoRank = logged.filter((p) => p.rank == null).sort(byJoinedAt);

  return {
    podium: rankedAll.slice(0, 3),
    ranked: [...rankedAll.slice(3), ...loggedNoRank],
    notLogged,
    isRelay: false,
    rankCounts,
  };
}

export function isTiedRank(
  rank: number | null | undefined,
  rankCounts: Map<number, number>,
): boolean {
  if (rank == null) return false;
  return (rankCounts.get(rank) ?? 0) > 1;
}

/** §6 Finalize confirm-sheet body copy — the three completion states. */
export function finalizeSummary(
  loggedCount: number,
  totalCount: number,
): { allLogged: boolean; noneLogged: boolean } {
  return {
    allLogged: totalCount > 0 && loggedCount === totalCount,
    noneLogged: loggedCount === 0,
  };
}
