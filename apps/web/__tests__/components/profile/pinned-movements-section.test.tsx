// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PinnedMovementsSection } from "@/components/profile/pinned-movements-section";
import type { PinnedMovement } from "@/lib/api";

vi.mock("@/lib/api/client", () => ({
  api: {
    movements: { search: vi.fn().mockResolvedValue([]) },
    profile: { setPinnedMovements: vi.fn() },
  },
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { api } from "@/lib/api/client";

function pin(id: string, order: number): PinnedMovement {
  return {
    movement_id: id,
    movement_name: `Movement ${id}`,
    modality: "strength",
    display_order: order,
  };
}

describe("PinnedMovementsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the empty-state copy when there are no pins", () => {
    render(
      <PinnedMovementsSection
        token="t"
        loading={false}
        pins={[]}
        onPinsChange={vi.fn()}
      />,
    );
    expect(
      screen.getByText("Pin up to 6 movements for quick reference"),
    ).toBeDefined();
  });

  it("shows loading skeletons while loading", () => {
    const { container } = render(
      <PinnedMovementsSection
        token="t"
        loading={true}
        pins={[]}
        onPinsChange={vi.fn()}
      />,
    );
    expect(
      container.querySelectorAll("[data-slot='skeleton']").length,
    ).toBeGreaterThan(0);
  });

  it("disables the search input and shows the max-pins copy at MAX_PINS", () => {
    const pins = Array.from({ length: 6 }, (_, i) => pin(`m${i}`, i));
    render(
      <PinnedMovementsSection
        token="t"
        loading={false}
        pins={pins}
        onPinsChange={vi.fn()}
      />,
    );
    expect(
      (screen.getByLabelText("Search movements to pin") as HTMLInputElement)
        .disabled,
    ).toBe(true);
    expect(screen.getByText("Max 6 movements pinned")).toBeDefined();
  });

  it("Save order is disabled until the working set diverges from saved pins", async () => {
    const user = userEvent.setup();
    const pins = [pin("m0", 0)];
    render(
      <PinnedMovementsSection
        token="t"
        loading={false}
        pins={pins}
        onPinsChange={vi.fn()}
      />,
    );
    const saveButton = screen.getByRole("button", {
      name: /save order/i,
    }) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(true);

    await user.click(screen.getByLabelText(`Unpin ${pins[0]!.movement_name}`));
    expect(saveButton.disabled).toBe(false);
  });

  it("Save order calls setPinnedMovements with the reordered ids", async () => {
    const user = userEvent.setup();
    const pins = [pin("m0", 0), pin("m1", 1)];
    vi.mocked(api.profile.setPinnedMovements).mockResolvedValue(pins);
    const onPinsChange = vi.fn();
    render(
      <PinnedMovementsSection
        token="t"
        loading={false}
        pins={pins}
        onPinsChange={onPinsChange}
      />,
    );

    // Move the second pin up, making the working order diverge from `pins`.
    await user.click(
      screen.getByLabelText(`Move ${pins[1]!.movement_name} up`),
    );
    await user.click(screen.getByRole("button", { name: /save order/i }));

    expect(api.profile.setPinnedMovements).toHaveBeenCalledWith("t", [
      "m1",
      "m0",
    ]);
  });
});
