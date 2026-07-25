// @vitest-environment jsdom
/**
 * Tests for DescribeItScreen (01 §10.1): parse-failure classes surface the right
 * message and never apply a partial parse, and a successful parse renders a
 * confirmable card marked unmatched with the "need confirming" commit guard.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DescribeItScreen } from "@/components/logging/ai/DescribeItScreen";
import { ApiError, type ApiClient } from "@/lib/api/client";

function makeClient(parseLog: ApiClient["coach"]["parseLog"]): ApiClient {
  return {
    coach: { parseLog },
    workouts: { create: vi.fn() },
  } as unknown as ApiClient;
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/client")>();
  return { ...actual, createApiClient: () => globalThis.__mockClient };
});

declare global {
  var __mockClient: ApiClient;
}

function setup(parseLog: ApiClient["coach"]["parseLog"]) {
  globalThis.__mockClient = makeClient(parseLog);
  render(<DescribeItScreen token="t" weightUnit="kg" />);
}

async function typeAndParse(text: string) {
  fireEvent.change(screen.getByPlaceholderText(/back squat 100kg/i), {
    target: { value: text },
  });
  fireEvent.click(screen.getByText("Parse commit"));
}

describe("DescribeItScreen parse states", () => {
  it("shows the rate-limit message on a 429 and applies no partial parse", async () => {
    setup(vi.fn().mockRejectedValue(new ApiError(429, "rate")));
    await typeAndParse("3x5 back squat 100kg");
    await waitFor(() =>
      expect(
        screen.getByText("AI logging is busy — try again in a moment."),
      ).toBeTruthy(),
    );
    // No session fields / cards were populated.
    expect(screen.queryByText("All movements confirmed")).toBeNull();
  });

  it("shows the unavailable message on a billing/quota error", async () => {
    setup(vi.fn().mockRejectedValue(new ApiError(402, "billing")));
    await typeAndParse("row 2k");
    await waitFor(() =>
      expect(
        screen.getByText("AI coaching is temporarily unavailable."),
      ).toBeTruthy(),
    );
  });

  it("shows the generic message on any other failure", async () => {
    setup(vi.fn().mockRejectedValue(new ApiError(500, "boom")));
    await typeAndParse("fran");
    await waitFor(() =>
      expect(
        screen.getByText(
          "Couldn't parse that — check your connection and try again.",
        ),
      ).toBeTruthy(),
    );
  });

  it("renders an unmatched confirmable card and guards commit on success", async () => {
    setup(
      vi.fn().mockResolvedValue({
        parsed: {
          title: "Squat day",
          session_type: null,
          workout_format: null,
          duration_s: null,
          session_rpe: null,
          results: [
            {
              movement_name: "Back Squat",
              result_type: "weight",
              reps: 5,
              load_kg: 100,
              scaled: false,
              notes: null,
            },
          ],
          parsing_notes: "",
        },
        confidence: 0.85,
        stub: false,
      }),
    );
    await typeAndParse("3x5 back squat 100kg");
    await waitFor(() => expect(screen.getByText("Back Squat")).toBeTruthy());
    expect(screen.getByText("Tap to confirm")).toBeTruthy();
    expect(screen.getByText("1 movement needs confirming")).toBeTruthy();
  });
});
