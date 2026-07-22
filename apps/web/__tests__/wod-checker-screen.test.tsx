// @vitest-environment jsdom
/**
 * Tests for WodCheckerScreen (03 §12): safe/unsafe movements render into
 * distinct groups, a referral gets its banner, and "no recognized
 * movements" renders as an honest empty result, not an error.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WodCheckerScreen } from "@/components/coach/WodCheckerScreen";
import type { ApiClient } from "@/lib/api/client";

function makeClient(checkWod: ApiClient["coach"]["checkWod"]): ApiClient {
  return { coach: { checkWod } } as unknown as ApiClient;
}

vi.mock("@/lib/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/client")>();
  return { ...actual, createApiClient: () => globalThis.__mockClient };
});

declare global {
  var __mockClient: ApiClient;
}

function setup(checkWod: ApiClient["coach"]["checkWod"]) {
  globalThis.__mockClient = makeClient(checkWod);
  render(<WodCheckerScreen token="t" />);
}

async function typeAndCheck(text: string) {
  fireEvent.change(screen.getByLabelText("WOD text"), {
    target: { value: text },
  });
  fireEvent.click(screen.getByText("Check"));
}

describe("WodCheckerScreen", () => {
  it("groups safe and unsafe movements and shows the referral banner", async () => {
    setup(
      vi.fn().mockResolvedValue({
        movements_found: ["thruster", "pull_up"],
        results: [
          {
            movement: "thruster",
            safe: false,
            driven_by: ["knee"],
            substitutions: ["Goblet Squat"],
          },
          { movement: "pull_up", safe: true, driven_by: [], substitutions: [] },
        ],
        any_referral_required: true,
        referral_regions: ["knee"],
      }),
    );
    await typeAndCheck("21-15-9 thrusters pull-ups");
    await waitFor(() => expect(screen.getByText("Thruster")).toBeTruthy());
    expect(screen.getByText("Pull Up")).toBeTruthy();
    expect(screen.getByText("Professional referral recommended")).toBeTruthy();
  });

  it("shows an honest empty result when nothing is recognized", async () => {
    setup(
      vi.fn().mockResolvedValue({
        movements_found: [],
        results: [],
        any_referral_required: false,
        referral_regions: [],
      }),
    );
    await typeAndCheck("some unrecognized gibberish text");
    await waitFor(() =>
      expect(
        screen.getByText("No known movements detected in that text."),
      ).toBeTruthy(),
    );
  });

  it("shows a retry-free error message on failure", async () => {
    setup(vi.fn().mockRejectedValue(new Error("boom")));
    await typeAndCheck("fran");
    await waitFor(() =>
      expect(
        screen.getByText(
          "Couldn't check that WOD — check your connection and try again.",
        ),
      ).toBeTruthy(),
    );
  });
});
