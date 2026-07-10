// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { TargetMovementStep } from "@/components/plans/wizard/TargetMovementStep";
import { PrerequisiteLadder } from "@/components/plans/wizard/PrerequisiteLadder";
import type { WizardState, PrerequisiteStatus } from "@/lib/types/plans";

// ---------------------------------------------------------------------------
// Mock api.movements.search
// ---------------------------------------------------------------------------
const mockSearch = vi.fn();
vi.mock("@/lib/api/client", () => ({
  api: {
    movements: {
      search: (...args: unknown[]) => mockSearch(...args),
    },
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeState(overrides: Partial<WizardState> = {}): WizardState {
  return {
    step: 3,
    archetype: "skill-acquisition",
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

const TOKEN = "test-token";
const noop = () => {};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TargetMovementStep — debounced search", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSearch.mockResolvedValue([
      {
        id: "m1",
        name: "Muscle-up",
        slug: "muscle-up",
        base_movement: "Muscle-up",
        modality: "gymnastics",
        start_position: null,
        catch_position: null,
        pause_position: null,
        tempo: null,
        execution_style: null,
        movement_pattern: null,
        limb_style: null,
        implement: null,
        implement_2: null,
      },
      {
        id: "m2",
        name: "Bar Muscle-up",
        slug: "bar-muscle-up",
        base_movement: "Bar Muscle-up",
        modality: "gymnastics",
        start_position: null,
        catch_position: null,
        pause_position: null,
        tempo: null,
        execution_style: null,
        movement_pattern: null,
        limb_style: null,
        implement: null,
        implement_2: null,
      },
    ]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("calls search API after 300ms debounce", async () => {
    render(
      <TargetMovementStep
        state={makeState()}
        accessToken={TOKEN}
        onSelect={noop}
        on1rmChange={noop}
        onNext={noop}
        onBack={noop}
      />,
    );

    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "muscle" } });

    // Should not call immediately
    expect(mockSearch).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(mockSearch).toHaveBeenCalledTimes(1);
    expect(mockSearch).toHaveBeenCalledWith(
      TOKEN,
      expect.objectContaining({ q: "muscle" }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("new keystroke aborts previous AbortController", async () => {
    render(
      <TargetMovementStep
        state={makeState()}
        accessToken={TOKEN}
        onSelect={noop}
        on1rmChange={noop}
        onNext={noop}
        onBack={noop}
      />,
    );

    const input = screen.getByRole("searchbox");

    // First keystroke
    fireEvent.change(input, { target: { value: "m" } });
    // Advance 200ms — debounce not yet fired
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // Second keystroke before debounce fires
    fireEvent.change(input, { target: { value: "mu" } });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    // Only one search call — the second one
    expect(mockSearch).toHaveBeenCalledTimes(1);
    // The call should have been for "mu"
    expect(mockSearch).toHaveBeenCalledWith(
      TOKEN,
      expect.objectContaining({ q: "mu" }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("selecting a movement calls onSelect with id and name", async () => {
    const onSelect = vi.fn();

    render(
      <TargetMovementStep
        state={makeState()}
        accessToken={TOKEN}
        onSelect={onSelect}
        on1rmChange={noop}
        onNext={noop}
        onBack={noop}
      />,
    );

    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "muscle" } });

    // Advance past the 300ms debounce
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    // Flush the resolved promise
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // Results should now be visible
    const resultBtn = screen.getByRole("button", { name: "Muscle-up" });
    fireEvent.click(resultBtn);

    expect(onSelect).toHaveBeenCalledWith("m1", "Muscle-up");
  });
});

// ---------------------------------------------------------------------------
// PrerequisiteLadder — static data rendering
// ---------------------------------------------------------------------------

describe("PrerequisiteLadder — Muscle-up prerequisite chain", () => {
  it("renders prerequisite chain items for Muscle-up", () => {
    const items: PrerequisiteStatus[] = [
      { movementId: "p0", movementName: "Pull-up", status: "pending" },
      { movementId: "p1", movementName: "Dip", status: "pending" },
      { movementId: "p2", movementName: "Kipping Swing", status: "pending" },
      { movementId: "p3", movementName: "Muscle-up", status: "target" },
    ];

    render(<PrerequisiteLadder items={items} />);

    expect(screen.getByText("Pull-up")).toBeDefined();
    expect(screen.getByText("Dip")).toBeDefined();
    expect(screen.getByText("Kipping Swing")).toBeDefined();
    expect(screen.getByText("Muscle-up")).toBeDefined();
  });

  it('shows "No prerequisites" when items list is empty', () => {
    render(<PrerequisiteLadder items={[]} />);
    expect(screen.getByText("No prerequisites")).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Conditional 1RM field
// ---------------------------------------------------------------------------

describe("TargetMovementStep — conditional 1RM field", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockSearch.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("1RM field is hidden when archetype is skill-acquisition", () => {
    render(
      <TargetMovementStep
        state={makeState({
          archetype: "skill-acquisition",
          targetMovementId: "m1",
          targetMovementName: "Bar Muscle-up",
        })}
        accessToken={TOKEN}
        onSelect={noop}
        on1rmChange={noop}
        onNext={noop}
        onBack={noop}
      />,
    );

    expect(screen.queryByLabelText(/current 1RM/i)).toBeNull();
  });

  it("1RM field is shown when archetype is one-rm-peak and movement is selected", () => {
    render(
      <TargetMovementStep
        state={makeState({
          archetype: "one-rm-peak",
          targetMovementId: "m2",
          targetMovementName: "Snatch",
          current1rmKg: null,
        })}
        accessToken={TOKEN}
        onSelect={noop}
        on1rmChange={noop}
        onNext={noop}
        onBack={noop}
      />,
    );

    const field = screen.getByLabelText(/current 1RM/i);
    expect(field).toBeDefined();
  });

  it("1RM field is not shown for one-rm-peak when no movement is selected yet", () => {
    render(
      <TargetMovementStep
        state={makeState({
          archetype: "one-rm-peak",
          targetMovementId: null,
          targetMovementName: null,
        })}
        accessToken={TOKEN}
        onSelect={noop}
        on1rmChange={noop}
        onNext={noop}
        onBack={noop}
      />,
    );

    expect(screen.queryByLabelText(/current 1RM/i)).toBeNull();
  });
});
