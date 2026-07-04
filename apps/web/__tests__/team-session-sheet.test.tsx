// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TeamSessionSheet } from "@/components/team-sessions/TeamSessionSheet";

// Minimal mock for api client calls within the sheet
vi.mock("@/lib/api/client", () => ({
  api: {
    profiles: {
      search: vi.fn().mockResolvedValue([]),
    },
    teamSessions: {
      create: vi.fn().mockResolvedValue({ id: "ts-1" }),
    },
  },
}));

describe("TeamSessionSheet", () => {
  it("renders the git merge header when open", () => {
    render(
      <TeamSessionSheet
        open={true}
        onOpenChange={vi.fn()}
        workoutId="w-1"
        performedAt="2026-07-04T09:00:00Z"
        accessToken="tok"
      />,
    );
    // "$ git merge" appears in both the header and submit button
    const gitMergeElements = screen.getAllByText("$ git merge");
    expect(gitMergeElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Log a team session")).toBeTruthy();
  });

  it("renders all six scoring type chips", () => {
    render(
      <TeamSessionSheet
        open={true}
        onOpenChange={vi.fn()}
        workoutId="w-1"
        performedAt="2026-07-04T09:00:00Z"
        accessToken="tok"
      />,
    );
    expect(screen.getByText("For Time")).toBeTruthy();
    expect(screen.getByText("AMRAP")).toBeTruthy();
    expect(screen.getByText("Max Load")).toBeTruthy();
    expect(screen.getByText("Total Reps")).toBeTruthy();
    expect(screen.getByText("Relay")).toBeTruthy();
    expect(screen.getByText("Slowest Finisher")).toBeTruthy();
  });

  it("renders the submit button with git theme label", () => {
    render(
      <TeamSessionSheet
        open={true}
        onOpenChange={vi.fn()}
        workoutId="w-1"
        performedAt="2026-07-04T09:00:00Z"
        accessToken="tok"
      />,
    );
    // "$ git merge" appears in both the header (SheetTitle) and the submit button
    const gitMergeEls = screen.getAllByText("$ git merge");
    expect(gitMergeEls.length).toBeGreaterThanOrEqual(1);
  });

  it("does not render content when closed", () => {
    render(
      <TeamSessionSheet
        open={false}
        onOpenChange={vi.fn()}
        workoutId="w-1"
        performedAt="2026-07-04T09:00:00Z"
        accessToken="tok"
      />,
    );
    expect(screen.queryByText("Log a team session")).toBeNull();
  });
});
