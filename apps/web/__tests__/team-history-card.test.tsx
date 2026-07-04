import { describe, it, expect } from "vitest";
import {
  formatTeamScore,
  teamScoreLabel,
} from "@/components/workout/WorkoutCard";
import type { TeamSession } from "@/lib/api";

describe("formatTeamScore", () => {
  it("formats seconds as MM:SS", () => {
    const ts = { team_score_s: 1122 } as unknown as TeamSession;
    expect(formatTeamScore(ts)).toBe("18:42");
  });

  it("pads single-digit seconds", () => {
    const ts = { team_score_s: 125 } as unknown as TeamSession;
    expect(formatTeamScore(ts)).toBe("2:05");
  });

  it("formats reps score", () => {
    const ts = { team_score_reps: 245 } as unknown as TeamSession;
    expect(formatTeamScore(ts)).toBe("245 reps");
  });

  it("returns free-text team_score when no structured score", () => {
    const ts = { team_score: "315 kg" } as unknown as TeamSession;
    expect(formatTeamScore(ts)).toBe("315 kg");
  });

  it("returns empty string when no score data", () => {
    const ts = {} as unknown as TeamSession;
    expect(formatTeamScore(ts)).toBe("");
  });

  it("prefers team_score_s over team_score_reps", () => {
    const ts = {
      team_score_s: 300,
      team_score_reps: 100,
    } as unknown as TeamSession;
    expect(formatTeamScore(ts)).toBe("5:00");
  });
});

describe("teamScoreLabel", () => {
  it("maps for_time to team time", () => {
    expect(teamScoreLabel("for_time")).toBe("team time");
  });

  it("maps relay to relay time", () => {
    expect(teamScoreLabel("relay")).toBe("relay time");
  });

  it("maps amrap to score", () => {
    expect(teamScoreLabel("amrap")).toBe("score");
  });

  it("maps max_load correctly", () => {
    expect(teamScoreLabel("max_load")).toBe("max load");
  });

  it("maps total_reps correctly", () => {
    expect(teamScoreLabel("total_reps")).toBe("total reps");
  });

  it("maps slowest_finisher correctly", () => {
    expect(teamScoreLabel("slowest_finisher")).toBe("slowest");
  });

  it("returns team score for null", () => {
    expect(teamScoreLabel(null)).toBe("team score");
  });

  it("returns team score for unknown types", () => {
    expect(teamScoreLabel("custom_type")).toBe("team score");
  });
});
