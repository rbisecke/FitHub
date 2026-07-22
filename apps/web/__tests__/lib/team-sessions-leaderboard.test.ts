import { describe, expect, it } from "vitest";
import {
  derivedSessionName,
  finalizeSummary,
  formatDurationS,
  formatRankBadge,
  formatTeamScoreValue,
  isTiedRank,
  partitionParticipants,
  teamScoreHeaderLabel,
} from "@/lib/team-sessions/leaderboard";
import type { TeamSessionParticipant } from "@/lib/api";

function participant(
  overrides: Partial<TeamSessionParticipant>,
): TeamSessionParticipant {
  return {
    id: overrides.id ?? "p-default",
    team_session_id: "ts-1",
    user_id: null,
    workout_id: null,
    guest_name: null,
    role: null,
    joined_at: "2026-07-01T00:00:00Z",
    display_name: "Someone",
    score: null,
    rank: null,
    ...overrides,
  };
}

describe("formatDurationS", () => {
  it("formats sub-hour durations as mm:ss", () => {
    expect(formatDurationS(272)).toBe("4:32");
    expect(formatDurationS(5)).toBe("0:05");
  });

  it("formats hour-plus durations as h:mm:ss", () => {
    expect(formatDurationS(3725)).toBe("1:02:05");
  });
});

describe("formatTeamScoreValue", () => {
  it("returns null when nothing is recorded (§3.2 null state)", () => {
    expect(
      formatTeamScoreValue({
        scoring_type: "for_time",
        team_score: null,
        team_score_s: null,
        team_score_reps: null,
      }),
    ).toBeNull();
  });

  it("prefers the scoring-type-specific structured field", () => {
    expect(
      formatTeamScoreValue({
        scoring_type: "for_time",
        team_score: "should not win",
        team_score_s: 272,
        team_score_reps: null,
      }),
    ).toBe("4:32");
    expect(
      formatTeamScoreValue({
        scoring_type: "amrap",
        team_score: null,
        team_score_s: null,
        team_score_reps: 145,
      }),
    ).toBe("145 reps");
  });

  it("falls back to the freeform team_score (e.g. max_load)", () => {
    expect(
      formatTeamScoreValue({
        scoring_type: "max_load",
        team_score: "120 kg",
        team_score_s: null,
        team_score_reps: null,
      }),
    ).toBe("120 kg");
  });
});

describe("teamScoreHeaderLabel", () => {
  it("collides amrap and total_reps on 'Total reps' by design", () => {
    expect(teamScoreHeaderLabel("amrap")).toBe("Total reps");
    expect(teamScoreHeaderLabel("total_reps")).toBe("Total reps");
  });
  it("returns null for a null scoring type", () => {
    expect(teamScoreHeaderLabel(null)).toBeNull();
  });
});

describe("derivedSessionName", () => {
  it("names the first two joiners plus a +N tail", () => {
    const participants = [
      participant({
        id: "a",
        display_name: "Alex",
        joined_at: "2026-07-01T00:00:00Z",
      }),
      participant({
        id: "b",
        display_name: "Bea",
        joined_at: "2026-07-01T00:01:00Z",
      }),
      participant({
        id: "c",
        display_name: "Cy",
        joined_at: "2026-07-01T00:02:00Z",
      }),
    ];
    expect(derivedSessionName("for_time", participants)).toBe(
      "For Time with Alex & Bea +1",
    );
  });

  it("omits the +N tail at exactly two participants", () => {
    const participants = [
      participant({
        id: "a",
        display_name: "Alex",
        joined_at: "2026-07-01T00:00:00Z",
      }),
      participant({
        id: "b",
        display_name: "Bea",
        joined_at: "2026-07-01T00:01:00Z",
      }),
    ];
    expect(derivedSessionName("amrap", participants)).toBe(
      "AMRAP with Alex & Bea",
    );
  });
});

describe("formatRankBadge", () => {
  it("prefixes tied ranks with T-", () => {
    expect(formatRankBadge(2, true)).toBe("T-2");
    expect(formatRankBadge(2, false)).toBe("2");
  });
});

describe("partitionParticipants", () => {
  it("splits podium (top 3) / ranked (4+) / not-logged, ignoring guests without results", () => {
    const participants = [
      participant({
        id: "1",
        rank: 1,
        workout_id: "w1",
        joined_at: "2026-07-01T00:00:00Z",
      }),
      participant({
        id: "2",
        rank: 2,
        workout_id: "w2",
        joined_at: "2026-07-01T00:01:00Z",
      }),
      participant({
        id: "3",
        rank: 3,
        workout_id: "w3",
        joined_at: "2026-07-01T00:02:00Z",
      }),
      participant({
        id: "4",
        rank: 4,
        workout_id: "w4",
        joined_at: "2026-07-01T00:03:00Z",
      }),
      participant({
        id: "5",
        workout_id: null,
        joined_at: "2026-07-01T00:04:00Z",
      }),
    ];
    const result = partitionParticipants(participants, "for_time");
    expect(result.podium.map((p) => p.id)).toEqual(["1", "2", "3"]);
    expect(result.ranked.map((p) => p.id)).toEqual(["4"]);
    expect(result.notLogged.map((p) => p.id)).toEqual(["5"]);
    expect(result.isRelay).toBe(false);
  });

  it("breaks a podium-boundary tie by joined_at, pushing the later tie-member off the podium", () => {
    const participants = [
      participant({
        id: "1",
        rank: 1,
        workout_id: "w1",
        joined_at: "2026-07-01T00:00:00Z",
      }),
      participant({
        id: "2",
        rank: 2,
        workout_id: "w2",
        joined_at: "2026-07-01T00:01:00Z",
      }),
      participant({
        id: "3-early",
        rank: 3,
        workout_id: "w3",
        joined_at: "2026-07-01T00:02:00Z",
      }),
      participant({
        id: "3-late",
        rank: 3,
        workout_id: "w4",
        joined_at: "2026-07-01T00:03:00Z",
      }),
    ];
    const result = partitionParticipants(participants, "for_time");
    expect(result.podium.map((p) => p.id)).toEqual(["1", "2", "3-early"]);
    expect(result.ranked.map((p) => p.id)).toEqual(["3-late"]);
    expect(isTiedRank(3, result.rankCounts)).toBe(true);
    expect(isTiedRank(1, result.rankCounts)).toBe(false);
  });

  it("never drops a logged-but-unranked participant from every bucket (regression)", () => {
    // The backend can return workout_id set but rank null (e.g. a for_time
    // result missing duration_s) — this must still surface somewhere, not
    // vanish from podium/ranked/notLogged entirely.
    const participants = [
      participant({
        id: "1",
        rank: 1,
        workout_id: "w1",
        joined_at: "2026-07-01T00:00:00Z",
      }),
      participant({
        id: "unranked",
        rank: null,
        workout_id: "w2",
        joined_at: "2026-07-01T00:01:00Z",
      }),
    ];
    const result = partitionParticipants(participants, "for_time");
    expect(result.podium.map((p) => p.id)).toEqual(["1"]);
    expect(result.ranked.map((p) => p.id)).toEqual(["unranked"]);
    expect(result.notLogged).toEqual([]);
  });

  it("suppresses the podium entirely for relay and shows the logged roster flat", () => {
    const participants = [
      participant({
        id: "1",
        rank: null,
        workout_id: "w1",
        joined_at: "2026-07-01T00:00:00Z",
      }),
      participant({
        id: "2",
        rank: null,
        workout_id: "w2",
        joined_at: "2026-07-01T00:01:00Z",
      }),
      participant({
        id: "3",
        rank: null,
        workout_id: null,
        joined_at: "2026-07-01T00:02:00Z",
      }),
    ];
    const result = partitionParticipants(participants, "relay");
    expect(result.isRelay).toBe(true);
    expect(result.podium).toEqual([]);
    expect(result.ranked.map((p) => p.id)).toEqual(["1", "2"]);
    expect(result.notLogged.map((p) => p.id)).toEqual(["3"]);
  });
});

describe("finalizeSummary", () => {
  it("flags all-logged and none-logged states", () => {
    expect(finalizeSummary(3, 3)).toEqual({
      allLogged: true,
      noneLogged: false,
    });
    expect(finalizeSummary(0, 3)).toEqual({
      allLogged: false,
      noneLogged: true,
    });
    expect(finalizeSummary(1, 3)).toEqual({
      allLogged: false,
      noneLogged: false,
    });
    expect(finalizeSummary(0, 0)).toEqual({
      allLogged: false,
      noneLogged: true,
    });
  });
});
