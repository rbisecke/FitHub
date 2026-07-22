// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { TeamSessionForm } from "@/components/team-sessions/TeamSessionForm";

vi.mock("@/lib/api/client", () => ({
  api: {
    profiles: { search: vi.fn().mockResolvedValue([]) },
    teamSessions: {
      create: vi.fn().mockResolvedValue({ id: "ts-1" }),
      patch: vi.fn().mockResolvedValue({ id: "ts-1" }),
      delete: vi.fn().mockResolvedValue(undefined),
      roleSuggestions: vi.fn().mockResolvedValue({ suggestions: [] }),
    },
  },
}));

describe("TeamSessionForm", () => {
  it("renders the create-mode title and all six scoring type chips", () => {
    render(
      <TeamSessionForm accessToken="tok" mode="create" onClose={vi.fn()} />,
    );
    expect(screen.getByText("New team session")).toBeTruthy();
    expect(screen.getByText("For Time")).toBeTruthy();
    expect(screen.getByText("AMRAP")).toBeTruthy();
    expect(screen.getByText("Max Load")).toBeTruthy();
    expect(screen.getByText("Total Reps")).toBeTruthy();
    expect(screen.getByText("Relay")).toBeTruthy();
    expect(screen.getByText("Slowest Finisher")).toBeTruthy();
  });

  it("shows the seeded-workout banner when a workout is pre-attached", () => {
    render(
      <TeamSessionForm
        accessToken="tok"
        mode="create"
        seedWorkout={{ workoutId: "w-1", performedAt: "2026-07-20T09:00:00Z" }}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("Your result is attached")).toBeTruthy();
  });

  it("does not show the seeded-workout banner from-scratch", () => {
    render(
      <TeamSessionForm accessToken="tok" mode="create" onClose={vi.fn()} />,
    );
    expect(screen.queryByText("Your result is attached")).toBeNull();
  });

  it("renders edit-mode title and the delete-session action", () => {
    render(
      <TeamSessionForm
        accessToken="tok"
        mode="edit"
        existing={{
          id: "ts-1",
          created_by: "u-1",
          name: "Wednesday WOD",
          team_size: 2,
          scoring_type: "for_time",
          team_score: null,
          team_score_s: null,
          team_score_reps: null,
          status: "active",
          performed_at: "2026-07-20T09:00:00Z",
          notes: null,
          created_at: "2026-07-20T09:00:00Z",
          updated_at: "2026-07-20T09:00:00Z",
          participants: [],
        }}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("Edit team session")).toBeTruthy();
    expect(screen.getByText("Delete session")).toBeTruthy();
  });

  // Effort 11.5 axe coverage gap-fill (Domain 06, Effort 8 — Team Sessions &
  // Social): the create/edit form had zero automated a11y coverage. Also
  // locks in the Field wrapper's group-labeling fix (role="group" +
  // aria-labelledby) added during the audit — every one of its 8 usages in
  // this form previously rendered an orphaned <label> with no htmlFor/id and
  // no nesting around its control.
  it("has no axe violations in create mode", async () => {
    const { container } = render(
      <TeamSessionForm accessToken="tok" mode="create" onClose={vi.fn()} />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
