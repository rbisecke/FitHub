// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePlanWizard } from "@/hooks/usePlanWizard";
import { resolveEquipmentTags } from "@/lib/plans/equipment";
import { generatePlanTitle } from "@/lib/plans/titles";
import type { EquipmentPreset } from "@/lib/types/plans";

// Prevent real API calls in tests.
vi.mock("@/lib/api/client", () => ({
  api: {
    plans: {
      create: vi.fn(),
      pollTask: vi.fn(),
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
});
