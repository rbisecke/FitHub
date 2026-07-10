// @vitest-environment jsdom
/**
 * Unit tests for ScheduleStep.
 *
 * Covers:
 *  - Days segmented control renders values 2–6
 *  - Clicking a day button calls onDaysChange with correct value
 *  - Conditional label: "Max program duration" for skill-acquisition archetype
 *  - Conditional label: "Program length" for general-crossfit archetype
 *  - Default weeks=12 when maxDurationWeeks is null
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ScheduleStep } from "@/components/plans/wizard/ScheduleStep";
import type { WizardState } from "@/lib/types/plans";

function makeState(overrides: Partial<WizardState> = {}): WizardState {
  return {
    step: 2,
    archetype: "general-crossfit",
    selectedPresets: new Set(),
    daysPerWeek: 4,
    targetMovementId: null,
    targetMovementName: null,
    current1rmKg: null,
    trainingAge: null,
    maxDurationWeeks: null,
    isSubmitting: false,
    error: null,
    planId: null,
    ...overrides,
  };
}

describe("ScheduleStep — days control", () => {
  it("renders all five day options (2 through 6)", () => {
    const { getByTestId } = render(
      <ScheduleStep
        state={makeState()}
        onDaysChange={() => {}}
        onDurationChange={() => {}}
        onNext={() => {}}
      />,
    );

    const container = getByTestId("days-buttons");
    const buttons = container.querySelectorAll("button");
    const labels = Array.from(buttons).map((b) => b.textContent?.trim());
    expect(labels).toEqual(["2", "3", "4", "5", "6"]);
  });

  it("calls onDaysChange with the clicked value", () => {
    const onDaysChange = vi.fn();
    const { getByTestId } = render(
      <ScheduleStep
        state={makeState()}
        onDaysChange={onDaysChange}
        onDurationChange={() => {}}
        onNext={() => {}}
      />,
    );

    const container = getByTestId("days-buttons");
    const threeBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "3",
    );
    expect(threeBtn).toBeDefined();
    fireEvent.click(threeBtn!);
    expect(onDaysChange).toHaveBeenCalledWith(3);
  });

  it("marks the current daysPerWeek button as pressed", () => {
    const { getByTestId } = render(
      <ScheduleStep
        state={makeState({ daysPerWeek: 5 })}
        onDaysChange={() => {}}
        onDurationChange={() => {}}
        onNext={() => {}}
      />,
    );

    const container = getByTestId("days-buttons");
    const fiveBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "5",
    );
    expect(fiveBtn?.getAttribute("aria-pressed")).toBe("true");
  });
});

describe("ScheduleStep — weeks conditional label", () => {
  it('shows "Max program duration (weeks)" for skill-acquisition archetype', () => {
    render(
      <ScheduleStep
        state={makeState({ archetype: "skill-acquisition" })}
        onDaysChange={() => {}}
        onDurationChange={() => {}}
        onNext={() => {}}
      />,
    );

    expect(screen.getByText("Max program duration (weeks)")).toBeDefined();
    expect(
      screen.getByText(
        "The AI will stop when the skill is achieved or time runs out.",
      ),
    ).toBeDefined();
  });

  it('shows "Program length (weeks)" for general-crossfit archetype', () => {
    render(
      <ScheduleStep
        state={makeState({ archetype: "general-crossfit" })}
        onDaysChange={() => {}}
        onDurationChange={() => {}}
        onNext={() => {}}
      />,
    );

    expect(screen.getByText("Program length (weeks)")).toBeDefined();
    expect(
      screen.queryByText(
        "The AI will stop when the skill is achieved or time runs out.",
      ),
    ).toBeNull();
  });
});

describe("ScheduleStep — weeks default", () => {
  it("marks 12 as pressed when maxDurationWeeks is null", () => {
    const { getByTestId } = render(
      <ScheduleStep
        state={makeState({ maxDurationWeeks: null })}
        onDaysChange={() => {}}
        onDurationChange={() => {}}
        onNext={() => {}}
      />,
    );

    const container = getByTestId("weeks-buttons");
    const twelveBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "12",
    );
    expect(twelveBtn?.getAttribute("aria-pressed")).toBe("true");
  });

  it("calls onDurationChange with the selected weeks value", () => {
    const onDurationChange = vi.fn();
    const { getByTestId } = render(
      <ScheduleStep
        state={makeState()}
        onDaysChange={() => {}}
        onDurationChange={onDurationChange}
        onNext={() => {}}
      />,
    );

    const container = getByTestId("weeks-buttons");
    const sixteenBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "16",
    );
    expect(sixteenBtn).toBeDefined();
    fireEvent.click(sixteenBtn!);
    expect(onDurationChange).toHaveBeenCalledWith(16);
  });
});
