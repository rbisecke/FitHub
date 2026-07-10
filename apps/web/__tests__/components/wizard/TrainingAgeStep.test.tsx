// @vitest-environment jsdom
import { useState } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TrainingAgeStep } from "@/components/plans/wizard/TrainingAgeStep";
import type { WizardState, TrainingAge } from "@/lib/types/plans";

function makeState(overrides: Partial<WizardState> = {}): WizardState {
  return {
    step: 4,
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

// Stateful wrapper — keeps state in sync so useEffect re-runs correctly.
function StatefulTrainingAgeStep({
  initialState = makeState(),
  onTitleChange = vi.fn(),
  onSubmit = vi.fn(),
  isSubmitting = false,
  error = null,
}: {
  initialState?: WizardState;
  onTitleChange?: (t: string) => void;
  onSubmit?: () => void;
  isSubmitting?: boolean;
  error?: string | null;
}) {
  const [state, setState] = useState<WizardState>(initialState);
  return (
    <TrainingAgeStep
      state={state}
      onAgeSelect={(age: TrainingAge) =>
        setState((s) => ({ ...s, trainingAge: age }))
      }
      onTitleChange={onTitleChange}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      error={error}
    />
  );
}

describe("TrainingAgeStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("commit plan button is disabled when no training age is selected", () => {
    render(<StatefulTrainingAgeStep />);
    const btn = screen.getByTestId("commit-plan-btn") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("commit plan button is enabled after selecting a training age", () => {
    render(<StatefulTrainingAgeStep />);
    fireEvent.click(screen.getByTestId("training-age-beginner"));
    const btn = screen.getByTestId("commit-plan-btn") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it("commit plan button is disabled while submitting", () => {
    render(
      <StatefulTrainingAgeStep
        initialState={makeState({ trainingAge: "beginner" })}
        isSubmitting={true}
      />,
    );
    const btn = screen.getByTestId("commit-plan-btn") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it("auto-title updates when training age changes", () => {
    const onTitleChange = vi.fn();
    render(<StatefulTrainingAgeStep onTitleChange={onTitleChange} />);

    fireEvent.click(screen.getByTestId("training-age-beginner"));
    expect(onTitleChange).toHaveBeenCalledWith(
      expect.stringContaining("Beginner"),
    );

    fireEvent.click(screen.getByTestId("training-age-advanced"));
    expect(onTitleChange).toHaveBeenCalledWith(
      expect.stringContaining("Advanced"),
    );
  });

  it("title input reflects the auto-generated value after age selection", () => {
    render(<StatefulTrainingAgeStep />);
    fireEvent.click(screen.getByTestId("training-age-intermediate"));
    const input = screen.getByTestId("plan-title-input") as HTMLInputElement;
    expect(input.value).toContain("Intermediate");
  });

  it("manual title override prevents auto-regeneration on subsequent age changes", () => {
    const onTitleChange = vi.fn();
    render(<StatefulTrainingAgeStep onTitleChange={onTitleChange} />);

    // Select an age to get a generated title first.
    fireEvent.click(screen.getByTestId("training-age-beginner"));

    // Now manually override the title.
    const input = screen.getByTestId("plan-title-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "My Custom Plan" } });
    expect(onTitleChange).toHaveBeenLastCalledWith("My Custom Plan");

    // Selecting a different age should NOT reset the title field.
    fireEvent.click(screen.getByTestId("training-age-advanced"));
    expect(input.value).toBe("My Custom Plan");
  });

  it("shows error message when error prop is set", () => {
    render(<StatefulTrainingAgeStep error="Failed to create plan." />);
    const alert = screen.getByRole("alert");
    expect(alert).toBeDefined();
    expect(alert.textContent).toContain("Failed to create plan.");
  });

  it("does not render error message when error prop is null", () => {
    render(<StatefulTrainingAgeStep error={null} />);
    expect(screen.queryByTestId("submit-error")).toBeNull();
  });

  it("advanced settings panel is collapsed by default", () => {
    render(<StatefulTrainingAgeStep />);
    expect(screen.queryByTestId("advanced-settings-panel")).toBeNull();
  });

  it("advanced settings panel expands when toggle is clicked", () => {
    render(<StatefulTrainingAgeStep />);
    const toggle = screen.getByRole("button", {
      name: "Toggle advanced settings",
    });
    fireEvent.click(toggle);
    expect(screen.getByTestId("advanced-settings-panel")).toBeDefined();
  });

  it("advanced settings collapses again on second toggle click", () => {
    render(<StatefulTrainingAgeStep />);
    const toggle = screen.getByRole("button", {
      name: "Toggle advanced settings",
    });
    fireEvent.click(toggle);
    expect(screen.getByTestId("advanced-settings-panel")).toBeDefined();
    fireEvent.click(toggle);
    expect(screen.queryByTestId("advanced-settings-panel")).toBeNull();
  });

  it("calls onSubmit when commit plan is clicked with age selected", () => {
    const onSubmit = vi.fn();
    render(<StatefulTrainingAgeStep onSubmit={onSubmit} />);
    fireEvent.click(screen.getByTestId("training-age-beginner"));
    fireEvent.click(screen.getByTestId("commit-plan-btn"));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("does not call onSubmit when button is disabled (no age)", () => {
    const onSubmit = vi.fn();
    render(<StatefulTrainingAgeStep onSubmit={onSubmit} />);
    fireEvent.click(screen.getByTestId("commit-plan-btn"));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
