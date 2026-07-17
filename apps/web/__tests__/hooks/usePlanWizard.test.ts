// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePlanWizard } from "@/hooks/usePlanWizard";
import { resolveEquipmentTags } from "@/lib/plans/equipment";
import { generatePlanTitle } from "@/lib/plans/titles";
import type { EquipmentPreset } from "@/lib/types/plans";

// Prevent real API calls in tests. Hoisted so the mock fns are reachable
// from test bodies for call-arg assertions (e.g. the abort/signal tests).
const { mockCreate, mockPollTask } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockPollTask: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  api: {
    plans: {
      create: mockCreate,
      pollTask: mockPollTask,
    },
  },
}));

describe("usePlanWizard — initial state", () => {
  it("starts at step 0 with null archetype", () => {
    const { result } = renderHook(() => usePlanWizard());
    expect(result.current.state.step).toBe(0);
    expect(result.current.state.archetype).toBeNull();
  });

  it("has sensible defaults for numeric fields", () => {
    const { result } = renderHook(() => usePlanWizard());
    expect(result.current.state.daysPerWeek).toBe(4);
    expect(result.current.state.isSubmitting).toBe(false);
    expect(result.current.state.error).toBeNull();
    expect(result.current.state.planId).toBeNull();
  });
});

describe("usePlanWizard — setArchetype", () => {
  it("updates the archetype", () => {
    const { result } = renderHook(() => usePlanWizard());

    act(() => {
      result.current.setArchetype("general-crossfit");
    });

    expect(result.current.state.archetype).toBe("general-crossfit");
  });
});

describe("usePlanWizard — goNext step-skip logic", () => {
  it("advances step 0 → 1 normally", () => {
    const { result } = renderHook(() => usePlanWizard());

    act(() => {
      result.current.setArchetype("general-crossfit");
    });
    act(() => {
      result.current.goNext();
    });

    expect(result.current.state.step).toBe(1);
  });

  it("skips step 3 (target) when archetype is general-crossfit", () => {
    const { result } = renderHook(() => usePlanWizard());

    act(() => {
      result.current.setArchetype("general-crossfit");
      // Advance through steps 0 → 1 → 2
      result.current.goNext();
      result.current.goNext();
      result.current.goNext();
    });

    // Step 2 + goNext should skip to step 4 for general-crossfit
    expect(result.current.state.step).toBe(4);
  });

  it("does NOT skip step 3 when archetype is skill-acquisition", () => {
    const { result } = renderHook(() => usePlanWizard());

    act(() => {
      result.current.setArchetype("skill-acquisition");
      // Advance through steps 0 → 1 → 2
      result.current.goNext();
      result.current.goNext();
      result.current.goNext();
    });

    // Step 2 + goNext should go to step 3 for skill-acquisition
    expect(result.current.state.step).toBe(3);
  });

  it("does NOT skip step 3 when archetype is one-rm-peak", () => {
    const { result } = renderHook(() => usePlanWizard());

    act(() => {
      result.current.setArchetype("one-rm-peak");
      result.current.goNext();
      result.current.goNext();
      result.current.goNext();
    });

    // Step 2 + goNext should go to step 3 for one-rm-peak
    expect(result.current.state.step).toBe(3);
  });

  it("skips step 3 for strength-bias archetype", () => {
    const { result } = renderHook(() => usePlanWizard());

    act(() => {
      result.current.setArchetype("strength-bias");
      result.current.goNext();
      result.current.goNext();
      result.current.goNext();
    });

    expect(result.current.state.step).toBe(4);
  });
});

describe("usePlanWizard — goPrev step-skip logic", () => {
  it("goes back from step 4 → step 2 when archetype is general-crossfit", () => {
    const { result } = renderHook(() => usePlanWizard());

    // Jump to step 4 via goNext skip
    act(() => {
      result.current.setArchetype("general-crossfit");
      result.current.goNext(); // 0 → 1
      result.current.goNext(); // 1 → 2
      result.current.goNext(); // 2 → 4 (skip)
    });

    expect(result.current.state.step).toBe(4);

    act(() => {
      result.current.goPrev();
    });

    expect(result.current.state.step).toBe(2);
  });

  it("goes back from step 4 → step 3 when archetype is skill-acquisition", () => {
    const { result } = renderHook(() => usePlanWizard());

    act(() => {
      result.current.setArchetype("skill-acquisition");
      result.current.goNext(); // 0 → 1
      result.current.goNext(); // 1 → 2
      result.current.goNext(); // 2 → 3
      result.current.goNext(); // 3 → 4
    });

    expect(result.current.state.step).toBe(4);

    act(() => {
      result.current.goPrev();
    });

    expect(result.current.state.step).toBe(3);
  });

  it("goes back from step 4 → step 3 when archetype is one-rm-peak", () => {
    const { result } = renderHook(() => usePlanWizard());

    act(() => {
      result.current.setArchetype("one-rm-peak");
      result.current.goNext(); // 0 → 1
      result.current.goNext(); // 1 → 2
      result.current.goNext(); // 2 → 3
      result.current.goNext(); // 3 → 4
    });

    expect(result.current.state.step).toBe(4);

    act(() => {
      result.current.goPrev();
    });

    expect(result.current.state.step).toBe(3);
  });

  it("does not go below step 0", () => {
    const { result } = renderHook(() => usePlanWizard());

    act(() => {
      result.current.goPrev();
    });

    expect(result.current.state.step).toBe(0);
  });
});

describe("usePlanWizard — buildSubmitPayload", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 9)); // July 9, 2026 local
  });

  it("resolves equipment tags via resolveEquipmentTags", () => {
    const { result } = renderHook(() => usePlanWizard());

    act(() => {
      result.current.setArchetype("general-crossfit");
      result.current.setTrainingAge("intermediate");
      // Select two presets
      result.current.togglePreset("Barbell Only");
      result.current.togglePreset("Travel");
    });

    const payload = result.current.buildSubmitPayload();
    const expected = resolveEquipmentTags(
      new Set<EquipmentPreset>(["Barbell Only", "Travel"]),
    );
    expect(payload.equipment).toEqual(expected);
  });

  it("generates the title via generatePlanTitle", () => {
    const { result } = renderHook(() => usePlanWizard());

    act(() => {
      result.current.setArchetype("strength-bias");
      result.current.setTrainingAge("advanced");
    });

    const payload = result.current.buildSubmitPayload();
    const expected = generatePlanTitle("strength-bias", "advanced");
    expect(payload.title).toBe(expected);
  });

  it("includes target movement name in the title for skill-acquisition", () => {
    const { result } = renderHook(() => usePlanWizard());

    act(() => {
      result.current.setArchetype("skill-acquisition");
      result.current.setTrainingAge("beginner");
      result.current.setTargetMovement("mov-123", "Muscle-Up");
    });

    const payload = result.current.buildSubmitPayload();
    expect(payload.title).toBe("Beginner Muscle-Up Skill Program");
    expect(payload.target_movement_id).toBe("mov-123");
  });

  it("omits optional fields when not set", () => {
    const { result } = renderHook(() => usePlanWizard());

    act(() => {
      result.current.setArchetype("aerobic-base");
      result.current.setTrainingAge("beginner");
    });

    const payload = result.current.buildSubmitPayload();
    expect(payload.target_movement_id).toBeUndefined();
    expect(payload.current_1rm_kg).toBeUndefined();
    expect(payload.max_duration_weeks).toBeUndefined();
  });

  it("uses start_date as today (local date, no UTC drift)", () => {
    const { result } = renderHook(() => usePlanWizard());

    act(() => {
      result.current.setArchetype("general-crossfit");
      result.current.setTrainingAge("beginner");
    });

    const payload = result.current.buildSubmitPayload();
    expect(payload.start_date).toBe("2026-07-09");
  });

  it("defaults weeks to 12 when maxDurationWeeks is not set", () => {
    const { result } = renderHook(() => usePlanWizard());

    act(() => {
      result.current.setArchetype("general-crossfit");
      result.current.setTrainingAge("beginner");
    });

    const payload = result.current.buildSubmitPayload();
    expect(payload.weeks).toBe(12);
  });

  it("uses maxDurationWeeks for weeks when set", () => {
    const { result } = renderHook(() => usePlanWizard());

    act(() => {
      result.current.setArchetype("general-crossfit");
      result.current.setTrainingAge("beginner");
      result.current.setMaxDuration(8);
    });

    const payload = result.current.buildSubmitPayload();
    expect(payload.weeks).toBe(8);
    expect(payload.max_duration_weeks).toBe(8);
  });

  // W1 — a user-edited title must win over the auto-derived one.
  it("prefers customTitle over the auto-derived title once set", () => {
    const { result } = renderHook(() => usePlanWizard());

    act(() => {
      result.current.setArchetype("strength-bias");
      result.current.setTrainingAge("advanced");
    });

    // Before any edit, the derived title is used.
    expect(result.current.buildSubmitPayload().title).toBe(
      generatePlanTitle("strength-bias", "advanced"),
    );

    act(() => {
      result.current.setCustomTitle("My Custom Plan");
    });

    expect(result.current.buildSubmitPayload().title).toBe("My Custom Plan");
  });

  // W1 regression fix — an empty/whitespace-only custom title must not be
  // submitted as the real plan title; it must fall back to the derived one.
  it("falls back to the derived title when customTitle is empty or whitespace-only", () => {
    const { result } = renderHook(() => usePlanWizard());

    act(() => {
      result.current.setArchetype("strength-bias");
      result.current.setTrainingAge("advanced");
      // Simulate select-all-and-delete on the title field.
      result.current.setCustomTitle("");
    });

    expect(result.current.state.customTitle).toBeNull();
    expect(result.current.buildSubmitPayload().title).toBe(
      generatePlanTitle("strength-bias", "advanced"),
    );

    act(() => {
      result.current.setCustomTitle("My Custom Plan");
      result.current.setCustomTitle("   ");
    });

    expect(result.current.state.customTitle).toBeNull();
    expect(result.current.buildSubmitPayload().title).toBe(
      generatePlanTitle("strength-bias", "advanced"),
    );
  });

  it("trims surrounding whitespace from a real custom title", () => {
    const { result } = renderHook(() => usePlanWizard());

    act(() => {
      result.current.setArchetype("strength-bias");
      result.current.setTrainingAge("advanced");
      result.current.setCustomTitle("  My Custom Plan  ");
    });

    expect(result.current.state.customTitle).toBe("My Custom Plan");
    expect(result.current.buildSubmitPayload().title).toBe("My Custom Plan");
  });

  // W1 regression (finding #2) — a stale custom title baked with a
  // previously-selected target movement must not survive a later target
  // movement change made without re-selecting training age.
  it("does not leak a stale generated title across a target movement change", () => {
    const { result } = renderHook(() => usePlanWizard());

    act(() => {
      result.current.setArchetype("skill-acquisition");
      result.current.setTargetMovement("mov-a", "Movement A");
      result.current.setTrainingAge("intermediate");
    });

    // The user never typed a title — customTitle must stay null, not get
    // auto-populated with a generated string tied to the current movement.
    expect(result.current.state.customTitle).toBeNull();

    act(() => {
      // Back-navigate and pick a different target movement, without
      // re-selecting training age.
      result.current.setTargetMovement("mov-b", "Movement B");
    });

    const payload = result.current.buildSubmitPayload();
    expect(payload.title).toBe(
      generatePlanTitle("skill-acquisition", "intermediate", "Movement B"),
    );
    expect(payload.title).not.toContain("Movement A");
  });
});

describe("usePlanWizard — set1rm", () => {
  // W2 — a clear (null) call must actually clear the stored value, not be
  // silently swallowed.
  it("stores null when set1rm(null) is called after a prior value", () => {
    const { result } = renderHook(() => usePlanWizard());

    act(() => {
      result.current.set1rm(100);
    });
    expect(result.current.state.current1rmKg).toBe(100);

    act(() => {
      result.current.set1rm(null);
    });
    expect(result.current.state.current1rmKg).toBeNull();

    // A stale value must not leak into the submitted payload for whatever
    // movement is selected afterward.
    act(() => {
      result.current.setArchetype("one-rm-peak");
      result.current.setTrainingAge("intermediate");
      result.current.setTargetMovement("mov-b", "Snatch");
    });
    expect(result.current.buildSubmitPayload().current_1rm_kg).toBeUndefined();
  });
});

describe("usePlanWizard — submit / abort (W4)", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockPollTask.mockReset();
  });

  it("forwards a real AbortSignal to create/pollTask and stops polling once abort() is called", async () => {
    vi.useFakeTimers();
    try {
      mockCreate.mockResolvedValue({ task_id: "task-abort" });
      mockPollTask.mockResolvedValue({ status: "pending" });

      const { result } = renderHook(() => usePlanWizard());

      let submitPromise!: Promise<void>;
      await act(async () => {
        submitPromise = result.current.submit("token-abort");
        await vi.advanceTimersByTimeAsync(0);
      });

      // create() must have been called with a real, not-yet-aborted signal.
      expect(mockCreate).toHaveBeenCalledTimes(1);
      const [, , createOptions] = mockCreate.mock.calls[0] as [
        unknown,
        unknown,
        { signal: AbortSignal },
      ];
      expect(createOptions.signal).toBeInstanceOf(AbortSignal);
      expect(createOptions.signal.aborted).toBe(false);

      // Advance past the first 5s poll interval — exactly one poll fires.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      expect(mockPollTask).toHaveBeenCalledTimes(1);
      const [, , pollOptions] = mockPollTask.mock.calls[0] as [
        unknown,
        unknown,
        { signal: AbortSignal },
      ];
      expect(pollOptions.signal).toBe(createOptions.signal);

      // Abort mid-flight (simulating unmount navigating away).
      act(() => {
        result.current.abort();
      });
      expect(createOptions.signal.aborted).toBe(true);

      // Advance through several more would-be poll intervals — no further
      // poll requests should fire once aborted.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30000);
      });
      expect(mockPollTask).toHaveBeenCalledTimes(1);

      await submitPromise;
    } finally {
      vi.useRealTimers();
    }
  });
});
