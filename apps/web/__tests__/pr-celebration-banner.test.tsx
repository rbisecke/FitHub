// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import {
  PRCelebrationBanner,
  type PrGroupInput,
} from "@/components/logging/detail/PRCelebrationBanner";
import type { ApiClient } from "@/lib/api/client";
import type { PersonalRecord } from "@/lib/api";

function pr(overrides: Partial<PersonalRecord>): PersonalRecord {
  return {
    movement_id: "m-1",
    movement_name: "Bench Press",
    best_1rm_kg: 100,
    achieved_at: "2026-06-01",
    workout_id: "w-1",
    load_kg: 100,
    reps: 1,
    time_s: null,
    prev_best_1rm_kg: null,
    delta_kg: null,
    implement: null,
    side: null,
    current_e1rm_kg: null,
    next_pr_kg: null,
    next_pr_weeks: null,
    is_stale: false,
    ...overrides,
  };
}

function fakeClient(records: PersonalRecord[]): ApiClient {
  return {
    analytics: {
      personalRecords: vi.fn().mockResolvedValue(records),
    },
  } as unknown as ApiClient;
}

const GROUPS: PrGroupInput[] = [
  { movementId: "m-1", movementName: "Bench Press" },
];

describe("PRCelebrationBanner", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("shows a PR line once the record fetch resolves", async () => {
    const client = fakeClient([pr({ delta_kg: 5, prev_best_1rm_kg: 95 })]);
    render(
      <PRCelebrationBanner
        workoutId="w-1"
        prGroups={GROUPS}
        client={client}
        weightUnit="kg"
      />,
    );
    expect(await screen.findByText(/New PR — Bench Press/)).toBeTruthy();
  });

  it("does not vanish on an unrelated re-render once shown (regression: dedup must not re-run against its own render's sessionStorage write)", async () => {
    const client = fakeClient([pr({ delta_kg: 5, prev_best_1rm_kg: 95 })]);
    const { rerender } = render(
      <PRCelebrationBanner
        workoutId="w-1"
        prGroups={GROUPS}
        client={client}
        weightUnit="kg"
      />,
    );
    await screen.findByText(/New PR — Bench Press/);

    // Simulate an unrelated state change elsewhere on the page causing this
    // component to re-render with the same props.
    rerender(
      <PRCelebrationBanner
        workoutId="w-1"
        prGroups={GROUPS}
        client={client}
        weightUnit="kg"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/New PR — Bench Press/)).toBeTruthy();
    });
  });

  it("does not show the same PR twice across separate mounts in one session", async () => {
    const client = fakeClient([pr({ delta_kg: 5, prev_best_1rm_kg: 95 })]);
    const { unmount } = render(
      <PRCelebrationBanner
        workoutId="w-1"
        prGroups={GROUPS}
        client={client}
        weightUnit="kg"
      />,
    );
    await screen.findByText(/New PR — Bench Press/);
    unmount();

    render(
      <PRCelebrationBanner
        workoutId="w-1"
        prGroups={GROUPS}
        client={client}
        weightUnit="kg"
      />,
    );

    await waitFor(() => {
      expect(client.analytics.personalRecords).toHaveBeenCalledTimes(2);
    });
    expect(screen.queryByText(/New PR — Bench Press/)).toBeNull();
  });
});
