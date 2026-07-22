// @vitest-environment jsdom
/**
 * Regression test for the podium tier-color/rank-numeral bug (full-branch
 * review, Effort 8): both must be derived from the participant's actual
 * computed `rank`, not the slot's visual position (`place`) — a
 * podium-boundary tie can put a rank-1 participant in the visually "2nd"
 * slot, and rendering that slot's tier color/numeral off `place` silently
 * showed a false "2" over someone tied for 1st.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Podium } from "@/components/team-sessions/detail/Podium";
import type { TeamSessionParticipant } from "@/lib/api";

function participant(
  overrides: Partial<TeamSessionParticipant>,
): TeamSessionParticipant {
  return {
    id: overrides.id ?? "p1",
    team_session_id: "ts1",
    user_id: null,
    workout_id: null,
    guest_name: null,
    role: null,
    joined_at: "2026-01-01T00:00:00Z",
    display_name: "Person",
    score: "10:00",
    rank: null,
    ...overrides,
  };
}

describe("Podium", () => {
  it("keys the tier color and numeral badge by rank, not slot position", () => {
    // Two participants tied for 1st (earlier-joined takes the visual "2nd"
    // slot per the podium-boundary tiebreak), one genuinely at rank 3.
    const first = participant({
      id: "a",
      display_name: "Alice",
      rank: 1,
      joined_at: "2026-01-01T00:00:00Z",
    });
    const tiedForFirst = participant({
      id: "b",
      display_name: "Bob",
      rank: 1,
      joined_at: "2026-01-02T00:00:00Z",
    });
    const third = participant({ id: "c", display_name: "Carl", rank: 3 });

    const rankCounts = new Map([
      [1, 2],
      [3, 1],
    ]);

    render(
      <Podium
        podium={[first, tiedForFirst, third]}
        rankCounts={rankCounts}
        isFinal={true}
      />,
    );

    // Every numeral badge reflects the real rank — never "2" for anyone,
    // since nobody actually holds rank 2.
    expect(screen.queryByText("2")).toBeNull();
    expect(screen.getAllByText("1")).toHaveLength(2);
    expect(screen.queryByText("3")).not.toBeNull();
    expect(screen.getAllByText("T-1")).toHaveLength(2);
  });
});
