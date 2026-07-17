// @vitest-environment jsdom
import { useState } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { TrainingAgeStep } from "@/components/plans/wizard/TrainingAgeStep";
import { usePlanWizard } from "@/hooks/usePlanWizard";
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
    customTitle: null,
    isSubmitting: false,
    error: null,
    planId: null,
    ...overrides,
  };
}

// Stateful wrapper — keeps state in sync so derived values re-render correctly.
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

  it("auto-title (displayed) updates when training age changes", () => {
    const onTitleChange = vi.fn();
    render(<StatefulTrainingAgeStep onTitleChange={onTitleChange} />);

    fireEvent.click(screen.getByTestId("training-age-beginner"));
    const input = screen.getByTestId("plan-title-input") as HTMLInputElement;
    expect(input.value).toContain("Beginner");

    fireEvent.click(screen.getByTestId("training-age-advanced"));
    expect(input.value).toContain("Advanced");
  });

  // W1 regression fix — selecting a training age must only *clear* the
  // parent's stored customTitle, never push a freshly-generated string into
  // it. A generated string baked with the currently-selected target movement
  // would go stale if the user later changes the movement via
  // back-navigation without re-clicking training age (finding #2).
  it("clears (does not set) the parent's custom title on age select", () => {
    const onTitleChange = vi.fn();
    render(<StatefulTrainingAgeStep onTitleChange={onTitleChange} />);

    fireEvent.click(screen.getByTestId("training-age-beginner"));
    expect(onTitleChange).toHaveBeenCalledWith("");
    expect(onTitleChange).not.toHaveBeenCalledWith(
      expect.stringContaining("Beginner"),
    );

    fireEvent.click(screen.getByTestId("training-age-advanced"));
    expect(onTitleChange).toHaveBeenLastCalledWith("");
    expect(onTitleChange).not.toHaveBeenCalledWith(
      expect.stringContaining("Advanced"),
    );
  });

  it("title input reflects the auto-generated value after age selection", () => {
    render(<StatefulTrainingAgeStep />);
    fireEvent.click(screen.getByTestId("training-age-intermediate"));
    const input = screen.getByTestId("plan-title-input") as HTMLInputElement;
    expect(input.value).toContain("Intermediate");
  });

  it("manual title override is active until a different age is selected", () => {
    const onTitleChange = vi.fn();
    render(<StatefulTrainingAgeStep onTitleChange={onTitleChange} />);

    // Select an age to get a generated title first.
    fireEvent.click(screen.getByTestId("training-age-beginner"));

    // Manually override the title.
    const input = screen.getByTestId("plan-title-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "My Custom Plan" } });
    expect(onTitleChange).toHaveBeenLastCalledWith("My Custom Plan");
    expect(input.value).toBe("My Custom Plan");

    // Selecting a different age regenerates the title (resets override).
    fireEvent.click(screen.getByTestId("training-age-advanced"));
    expect(input.value).toContain("Advanced");
    expect(input.value).not.toBe("My Custom Plan");
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

// Integration harness wiring the real usePlanWizard hook to the real
// TrainingAgeStep component the same way CreatePlanWizard does — the parent
// hook instance persists across TrainingAgeStep mount/unmount (simulating
// wizard step navigation), while TrainingAgeStep's own local title state
// resets on remount.
function WizardHarness({
  showAgeStep,
  onWizardChange,
}: {
  showAgeStep: boolean;
  onWizardChange: (wizard: ReturnType<typeof usePlanWizard>) => void;
}) {
  const wizard = usePlanWizard();
  onWizardChange(wizard);
  return (
    <>
      {showAgeStep && (
        <TrainingAgeStep
          state={wizard.state}
          onAgeSelect={wizard.setTrainingAge}
          onTitleChange={wizard.setCustomTitle}
          onSubmit={() => {}}
          isSubmitting={wizard.state.isSubmitting}
          error={wizard.state.error}
        />
      )}
    </>
  );
}

describe("TrainingAgeStep + usePlanWizard integration — W1 finding #2 repro", () => {
  it("does not submit a stale title after: movement A -> age -> back -> movement B -> forward -> submit (no re-click)", () => {
    let wizard!: ReturnType<typeof usePlanWizard>;
    const captureWizard = (w: ReturnType<typeof usePlanWizard>) => {
      wizard = w;
    };

    const { rerender } = render(
      <WizardHarness showAgeStep={true} onWizardChange={captureWizard} />,
    );

    // Set up a skill-acquisition plan targeting Movement A.
    act(() => {
      wizard.setArchetype("skill-acquisition");
      wizard.setTargetMovement("mov-a", "Movement A");
    });
    rerender(
      <WizardHarness showAgeStep={true} onWizardChange={captureWizard} />,
    );

    // Pick a training age — this is the step 5 UI action.
    fireEvent.click(screen.getByTestId("training-age-intermediate"));
    rerender(
      <WizardHarness showAgeStep={true} onWizardChange={captureWizard} />,
    );

    // Back-navigate: TrainingAgeStep unmounts (its local title state is lost).
    rerender(
      <WizardHarness showAgeStep={false} onWizardChange={captureWizard} />,
    );

    // Change the target movement to B without touching training age.
    act(() => {
      wizard.setTargetMovement("mov-b", "Movement B");
    });
    rerender(
      <WizardHarness showAgeStep={false} onWizardChange={captureWizard} />,
    );

    // Forward-navigate again: TrainingAgeStep remounts. The user submits
    // WITHOUT re-clicking a training age.
    rerender(
      <WizardHarness showAgeStep={true} onWizardChange={captureWizard} />,
    );

    const payload = wizard.buildSubmitPayload();
    expect(payload.title).toContain("Movement B");
    expect(payload.title).not.toContain("Movement A");
  });
});
