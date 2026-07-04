import { describe, it, expect } from "vitest";

function formatTeamScore(ts: {
  team_score_s?: number | null;
  team_score_reps?: number | null;
  team_score?: string | null;
}): string {
  if (ts.team_score_s != null) {
    const m = Math.floor(ts.team_score_s / 60);
    const s = ts.team_score_s % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  if (ts.team_score_reps != null) return `${ts.team_score_reps} reps`;
  if (ts.team_score) return ts.team_score;
  return "";
}

function teamScoreLabel(scoringType: string | null): string {
  const map: Record<string, string> = {
    for_time: "team time",
    relay: "relay time",
    slowest_finisher: "slowest",
    max_load: "max load",
    total_reps: "total reps",
    amrap: "score",
  };
  return scoringType ? map[scoringType] ?? "team score" : "team score";
}

describe("team session detail helpers", () => {
  it("formats for-time score as MM:SS", () => {
    expect(formatTeamScore({ team_score_s: 1122 })).toBe("18:42");
  });

  it("formats total-reps score as N reps", () => {
    expect(formatTeamScore({ team_score_reps: 245 })).toBe("245 reps");
  });

  it("returns free-text team_score when no structured score", () => {
    expect(formatTeamScore({ team_score: "315 kg" })).toBe("315 kg");
  });

  it("returns empty string when no score data", () => {
    expect(formatTeamScore({})).toBe("");
  });

  it("returns correct label for each scoring type", () => {
    expect(teamScoreLabel("for_time")).toBe("team time");
    expect(teamScoreLabel("relay")).toBe("relay time");
    expect(teamScoreLabel("amrap")).toBe("score");
    expect(teamScoreLabel(null)).toBe("team score");
    expect(teamScoreLabel("max_load")).toBe("max load");
  });

  it("pads seconds below 10 with leading zero", () => {
    expect(formatTeamScore({ team_score_s: 65 })).toBe("1:05");
  });

  it("returns team score for unknown scoring type", () => {
    expect(teamScoreLabel("custom_type")).toBe("team score");
  });
});
