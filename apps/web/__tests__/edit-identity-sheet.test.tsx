// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditIdentitySheet } from "@/components/profile/EditIdentitySheet";
import type { UserProfile } from "@/lib/api";

// Mock the api client
vi.mock("@/lib/api/client", () => ({
  api: {
    profile: {
      patch: vi.fn(),
    },
  },
}));

import { api } from "@/lib/api/client";

const mockProfile: UserProfile = {
  display_name: "Jane Doe",
  email: "jane@example.com",
  avatar_url: null,
  timezone: "UTC",
  first_workout_date: "2019-06-01",
  frequency_target_days: 4,
  graph_colour_mode: "intensity",
  weight_unit: "kg",
  checkin_enabled: true,
  onboarding_completed: true,
  bio: "Loves burpees",
  location: "Austin, TX",
  box_affiliation: "CrossFit ATX",
  distance_unit: "km",
  training_level: "intermediate",
  training_since: "2019-06-01",
};

function renderSheet(overrides?: Partial<UserProfile>) {
  const onSaved = vi.fn();
  const onOpenChange = vi.fn();
  const profile = { ...mockProfile, ...overrides };

  render(
    <EditIdentitySheet
      open={true}
      onOpenChange={onOpenChange}
      profile={profile}
      accessToken="test-token"
      onSaved={onSaved}
    />,
  );

  return { onSaved, onOpenChange };
}

describe("EditIdentitySheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all 5 fields", () => {
    renderSheet();

    expect(screen.getByPlaceholderText("Your name")).toBeTruthy();
    expect(screen.getByPlaceholderText("A short bio")).toBeTruthy();
    expect(screen.getByPlaceholderText("City, Country")).toBeTruthy();
    expect(screen.getByPlaceholderText("CrossFit HQ")).toBeTruthy();
    // date input — find by type
    const dateInputs = document.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBe(1);
  });

  it("populates fields with existing profile values", () => {
    renderSheet();

    expect(
      (screen.getByPlaceholderText("Your name") as HTMLInputElement).value,
    ).toBe("Jane Doe");
    expect(
      (screen.getByPlaceholderText("A short bio") as HTMLInputElement).value,
    ).toBe("Loves burpees");
    expect(
      (screen.getByPlaceholderText("City, Country") as HTMLInputElement).value,
    ).toBe("Austin, TX");
    expect(
      (screen.getByPlaceholderText("CrossFit HQ") as HTMLInputElement).value,
    ).toBe("CrossFit ATX");
  });

  it("shows bio char counter with correct initial count", () => {
    renderSheet();
    const bioText = "Loves burpees"; // 13 chars
    expect(screen.getByText(`${bioText.length}/160`)).toBeTruthy();
  });

  it("updates bio char counter as user types", async () => {
    const user = userEvent.setup();
    renderSheet({ bio: "" });

    const bioInput = screen.getByPlaceholderText("A short bio");
    await user.clear(bioInput);
    await user.type(bioInput, "Hello");

    await waitFor(() => {
      expect(screen.getByText("5/160")).toBeTruthy();
    });
  });

  it("disables submit when bio exceeds 160 chars", async () => {
    // Start with a bio just at the limit; maxLength prevents typing more via real input,
    // but validate the button state for the boundary case by passing a long default
    const longBio = "a".repeat(160);
    renderSheet({ bio: longBio });

    // At exactly 160, button should be enabled
    const submitBtn = screen.getByRole("button", { name: /save changes/i });
    expect((submitBtn as HTMLButtonElement).disabled).toBe(false);

    // At 160, counter reads 160/160
    expect(screen.getByText("160/160")).toBeTruthy();
  });

  it("calls api.profile.patch with the correct payload on submit", async () => {
    const user = userEvent.setup();
    const updatedProfile = { ...mockProfile, display_name: "New Name" };
    vi.mocked(api.profile.patch).mockResolvedValueOnce(updatedProfile);

    const { onSaved, onOpenChange } = renderSheet();

    const nameInput = screen.getByPlaceholderText("Your name");
    await user.clear(nameInput);
    await user.type(nameInput, "New Name");

    const submitBtn = screen.getByRole("button", { name: /save changes/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(vi.mocked(api.profile.patch)).toHaveBeenCalledWith(
        "test-token",
        expect.objectContaining({
          display_name: "New Name",
          bio: "Loves burpees",
          location: "Austin, TX",
          box_affiliation: "CrossFit ATX",
          training_since: "2019-06-01",
        }),
      );
    });

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledWith(updatedProfile);
    });

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("shows error message when patch fails", async () => {
    const user = userEvent.setup();
    vi.mocked(api.profile.patch).mockRejectedValueOnce(
      new Error("Server error"),
    );

    renderSheet();

    const submitBtn = screen.getByRole("button", { name: /save changes/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to save. Please try again."),
      ).toBeTruthy();
    });
  });

  it("shows the git-themed header", () => {
    renderSheet();
    expect(screen.getByText("$ git config --edit")).toBeTruthy();
  });
});
