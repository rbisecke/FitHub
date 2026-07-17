// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EquipmentStep } from "@/components/plans/wizard/EquipmentStep";
import { resolveEquipmentTags } from "@/lib/plans/equipment";
import type { WizardState, EquipmentPreset } from "@/lib/types/plans";

function makeState(
  selectedPresets: Set<EquipmentPreset> = new Set(),
): WizardState {
  return {
    step: 1,
    archetype: "general-crossfit",
    selectedPresets,
    daysPerWeek: 4,
    targetMovementId: null,
    targetMovementName: null,
    current1rmKg: null,
    trainingAge: null,
    maxDurationWeeks: null,
    customTitle: null,
    isSubmitting: false,
    error: null,
    planId: null,
  };
}

// Stateful wrapper so onUpdate feeds back into rendered state.
function StatefulEquipmentStep({
  initial = new Set<EquipmentPreset>(),
  onNext = vi.fn(),
}: {
  initial?: Set<EquipmentPreset>;
  onNext?: () => void;
}) {
  const [state, setState] = React.useState<WizardState>(makeState(initial));
  return (
    <EquipmentStep
      state={state}
      onUpdate={(presets) =>
        setState((s) => ({ ...s, selectedPresets: presets }))
      }
      onNext={onNext}
    />
  );
}

// ---------------------------------------------------------------------------
// Full Gym auto-lock
// ---------------------------------------------------------------------------

describe("EquipmentStep — Full Gym auto-lock", () => {
  it("clicking Full Gym checks all other presets", () => {
    render(<StatefulEquipmentStep />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Full Gym" }));

    const checkboxes = screen.getAllByRole("checkbox");
    for (const cb of checkboxes) {
      expect(cb.getAttribute("aria-checked")).toBe("true");
    }
  });

  it("clicking Full Gym again deselects and unlocks other presets", () => {
    render(<StatefulEquipmentStep />);

    // Select then deselect Full Gym.
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Full Gym" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Full Gym" }));

    const checkboxes = screen.getAllByRole("checkbox");
    for (const cb of checkboxes) {
      expect(cb.getAttribute("aria-checked")).toBe("false");
    }

    // Other presets should no longer be disabled.
    const homeSetupCheckbox = screen.getByRole("checkbox", {
      name: "Select Home Setup",
    });
    expect((homeSetupCheckbox as HTMLButtonElement).disabled).toBe(false);
  });

  it("non-Full-Gym presets are disabled when Full Gym is selected", () => {
    render(<StatefulEquipmentStep />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Full Gym" }));

    const otherPresets: EquipmentPreset[] = [
      "Home Setup",
      "Barbell Only",
      "Travel",
      "Bodyweight",
    ];
    for (const preset of otherPresets) {
      const cb = screen.getByRole("checkbox", {
        name: `Select ${preset}`,
      }) as HTMLButtonElement;
      expect(cb.disabled).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Continue button
// ---------------------------------------------------------------------------

describe("EquipmentStep — Continue button", () => {
  it("is disabled when no presets are selected", () => {
    render(<StatefulEquipmentStep />);
    const btn = screen.getByTestId("continue-btn") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("is enabled after selecting a preset", () => {
    render(<StatefulEquipmentStep />);

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Select Bodyweight" }),
    );

    const btn = screen.getByTestId("continue-btn") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it("calls onNext when clicked with a selection", () => {
    const onNext = vi.fn();
    render(<StatefulEquipmentStep onNext={onNext} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Travel" }));
    fireEvent.click(screen.getByTestId("continue-btn"));

    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("does not call onNext when clicked with no selection", () => {
    const onNext = vi.fn();
    render(<StatefulEquipmentStep onNext={onNext} />);

    // Button is disabled so click should not propagate to handler.
    const btn = screen.getByTestId("continue-btn");
    fireEvent.click(btn);

    expect(onNext).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tag expansion
// ---------------------------------------------------------------------------

describe("EquipmentStep — tag expansion", () => {
  it("expanding a tile shows the equipment tag list", () => {
    render(<StatefulEquipmentStep />);

    // Tags should not be visible initially.
    expect(screen.queryByTestId("tags-Barbell Only")).toBeNull();

    fireEvent.click(
      screen.getByRole("button", {
        name: "See what's included in Barbell Only",
      }),
    );

    const tagContainer = screen.getByTestId("tags-Barbell Only");
    expect(tagContainer.textContent).toContain("barbell");
    expect(tagContainer.textContent).toContain("rack");
    expect(tagContainer.textContent).toContain("pull_up_bar");
  });

  it("expanding Full Gym shows all Full Gym tags", () => {
    render(<StatefulEquipmentStep />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "See what's included in Full Gym",
      }),
    );

    const tagContainer = screen.getByTestId("tags-Full Gym");
    expect(tagContainer.textContent).toContain("barbell");
    expect(tagContainer.textContent).toContain("rower");
    expect(tagContainer.textContent).toContain("rings");
  });

  it("re-clicking the expand button collapses the tag list", () => {
    render(<StatefulEquipmentStep />);

    const expandBtn = screen.getByRole("button", {
      name: "See what's included in Travel",
    });

    fireEvent.click(expandBtn);
    expect(screen.getByTestId("tags-Travel")).toBeDefined();

    fireEvent.click(expandBtn);
    expect(screen.queryByTestId("tags-Travel")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Resolved tag count footer
// ---------------------------------------------------------------------------

describe("EquipmentStep — resolved tag count footer", () => {
  it("shows 0 equipment tags when nothing is selected", () => {
    render(<StatefulEquipmentStep />);
    const footer = screen.getByTestId("tag-count");
    expect(footer.textContent).toContain("0 equipment tags selected");
  });

  it("shows the correct resolved tag count after selection", () => {
    render(<StatefulEquipmentStep />);

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Select Barbell Only" }),
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Select Travel" }));

    const expected = resolveEquipmentTags(
      new Set<EquipmentPreset>(["Barbell Only", "Travel"]),
    ).length;

    const footer = screen.getByTestId("tag-count");
    expect(footer.textContent).toContain(`${expected} equipment tags selected`);
  });

  it("shows Full Gym resolved tag count when Full Gym is selected", () => {
    render(<StatefulEquipmentStep />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Full Gym" }));

    // Full Gym auto-locks all presets so resolveEquipmentTags sees all 5.
    const allPresets = new Set<EquipmentPreset>([
      "Full Gym",
      "Home Setup",
      "Barbell Only",
      "Travel",
      "Bodyweight",
    ]);
    const expected = resolveEquipmentTags(allPresets).length;

    const footer = screen.getByTestId("tag-count");
    expect(footer.textContent).toContain(`${expected} equipment tags selected`);
  });
});
