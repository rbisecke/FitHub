// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IdentityEditSheet } from "@/components/profile/identity-edit-sheet";
import type { UserProfile } from "@/lib/api";

vi.mock("@/lib/api/client", () => ({
  api: { profile: { patch: vi.fn() } },
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { api } from "@/lib/api/client";
import { toast } from "sonner";

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
  primary_goal: "build_strength",
  equipment_access: ["barbell"],
};

function renderSheet(overrides?: Partial<UserProfile>) {
  const onSaved = vi.fn();
  const onOpenChange = vi.fn();
  const profile = { ...mockProfile, ...overrides };

  render(
    <IdentityEditSheet
      open={true}
      onOpenChange={onOpenChange}
      token="test-token"
      profile={profile}
      onSaved={onSaved}
    />,
  );

  return { onSaved, onOpenChange };
}

describe("IdentityEditSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefills fields from the current profile", () => {
    renderSheet();
    expect(
      (screen.getByLabelText("Display name") as HTMLInputElement).value,
    ).toBe("Jane Doe");
    expect((screen.getByLabelText("Bio") as HTMLTextAreaElement).value).toBe(
      "Loves burpees",
    );
    expect((screen.getByLabelText("Location") as HTMLInputElement).value).toBe(
      "Austin, TX",
    );
  });

  it("does not render a training-experience control", () => {
    // training_age has no persisted UserProfile column yet (distinct from
    // training_level, which is coach-chat-only) — the sheet must omit the
    // control rather than silently write into the wrong field.
    renderSheet();
    expect(screen.queryByText(/training experience/i)).toBeNull();
    expect(screen.queryByLabelText(/training experience/i)).toBeNull();
  });

  it("submits the patch with the edited fields, goal, and equipment", async () => {
    const user = userEvent.setup();
    vi.mocked(api.profile.patch).mockResolvedValue({
      ...mockProfile,
      display_name: "Jane Smith",
    });
    const { onSaved, onOpenChange } = renderSheet();

    const nameInput = screen.getByLabelText("Display name");
    await user.clear(nameInput);
    await user.type(nameInput, "Jane Smith");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(api.profile.patch).toHaveBeenCalledTimes(1));
    const [, body] = vi.mocked(api.profile.patch).mock.calls[0]!;
    expect(body.display_name).toBe("Jane Smith");
    expect(body.primary_goal).toBe("build_strength");
    expect(body.equipment_access).toEqual(["barbell"]);
    // Never written by this sheet — see the "no training-age control" test.
    expect(body).not.toHaveProperty("training_level");

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(toast.success).toHaveBeenCalled();
  });

  it("shows an error toast and keeps the sheet open on save failure", async () => {
    const user = userEvent.setup();
    vi.mocked(api.profile.patch).mockRejectedValue(new Error("network"));
    const { onSaved, onOpenChange } = renderSheet();

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(onSaved).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
