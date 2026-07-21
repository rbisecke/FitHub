// @vitest-environment jsdom
//
// Review fix #1 — integration test rendering the REAL SessionExecutionView
// component (not a mirrored/hand-copied version of its logic). This is
// deliberately the strongest form of coverage for this bug: the original
// defect was that handleOpenSwap dispatched OPEN_SWAP with
// `itemId: currentItem.id` (a planned_items.id), which flowed straight into
// ExerciseSwapSheet's `movementId` prop and therefore into
// `api.movements.getSubstitutes(token, movementId, ...)` — a lookup against
// public.movements that 404s on a planned_items id. The project's existing
// Playwright E2E suite mocks the substitutes route by URL *shape* only, so
// it never validates that the id segment is a real movement id — it would
// not have caught this bug. This test asserts on the actual argument the
// component passes to the mocked API client, which a wiring regression
// (e.g. reverting to `movementId={state.swapItemId}`) would fail.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SessionExecutionView } from "@/components/session/SessionExecutionView";
import type { PlannedSessionOut } from "@/lib/api/plans";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const PLANNED_ITEM_ID = "planned-item-11111111-2222-3333-4444-555555555555";
const REAL_MOVEMENT_ID = "movement-99999999-8888-7777-6666-555555555555";

const searchMock = vi.fn().mockResolvedValue([
  { id: "movement-other-1", name: "Overhead Squat" },
  { id: REAL_MOVEMENT_ID, name: "Back Squat" },
]);
const getSubstitutesMock = vi.fn().mockResolvedValue([]);
const completeSessionMock = vi.fn().mockResolvedValue({});
// 05 §5.1's passive contraindication check — fetched on mount by every
// SessionExecutionView render, unrelated to this file's swap-resolve
// coverage. No active injuries, so it's a no-op for these tests.
const modifyWorkoutMock = vi.fn().mockResolvedValue({
  session_id: "session-1",
  modifications: [],
  safe_movements: [],
  any_referral_required: false,
  referral_regions: [],
});

vi.mock("@/lib/api/client", () => ({
  api: {
    movements: {
      search: (...args: unknown[]) => searchMock(...args),
      getSubstitutes: (...args: unknown[]) => getSubstitutesMock(...args),
    },
    plans: {
      completeSession: (...args: unknown[]) => completeSessionMock(...args),
    },
    coach: {
      modifyWorkout: (...args: unknown[]) => modifyWorkoutMock(...args),
    },
  },
}));

// jsdom does not implement matchMedia; motion/react's useReducedMotion reads it.
// This vitest project's Node also runs without --localstorage-file, so the
// jsdom window's `localStorage` is left undefined — stub a minimal in-memory
// implementation (the component reads/writes it for load pre-population).
beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );

  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  });

  searchMock.mockClear();
  getSubstitutesMock.mockClear();
});

function makeSession(): PlannedSessionOut {
  return {
    id: "session-1",
    mesocycle_id: "meso-1",
    scheduled_date: "2026-07-14",
    session_type: "strength",
    title: "Squat Day",
    notes: null,
    status: "prescribed",
    items: [
      {
        id: PLANNED_ITEM_ID,
        movement_name: "Back Squat",
        sets: 3,
        reps: "5",
        load_pct_1rm: null,
        load_kg: 100,
        notes: null,
        item_order: 0,
      },
    ],
  };
}

describe("Review fix #1 — swap sheet resolves a real movements.id", () => {
  it("passes a real movements.id (not the planned_items.id) to the substitutes fetch", async () => {
    render(
      <SessionExecutionView
        session={makeSession()}
        plan={{ id: "plan-1", archetype: "general-crossfit", title: "Plan" }}
        accessToken="test-token"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "begin session" }));

    const swapButton = await screen.findByRole("button", {
      name: "Swap this exercise with a substitute",
    });
    fireEvent.click(swapButton);

    // handleOpenSwap resolves the real movement id via api.movements.search
    // before opening the sheet.
    await waitFor(() => expect(searchMock).toHaveBeenCalledTimes(1));
    expect(searchMock).toHaveBeenCalledWith("test-token", {
      q: "Back Squat",
      limit: 20,
    });

    // The substitutes fetch (triggered by ExerciseSwapSheet once it opens)
    // must receive the REAL movement id resolved above — never the
    // planned_items row id.
    await waitFor(() => expect(getSubstitutesMock).toHaveBeenCalledTimes(1));
    const [, movementIdArg] = getSubstitutesMock.mock.calls[0] as [
      string,
      string,
      string[],
      unknown,
    ];
    expect(movementIdArg).toBe(REAL_MOVEMENT_ID);
    expect(movementIdArg).not.toBe(PLANNED_ITEM_ID);
  });

  it("shows an error and does not open the swap sheet when no exact catalog match is found", async () => {
    searchMock.mockResolvedValueOnce([
      { id: "movement-other-1", name: "Overhead Squat" },
    ]);

    render(
      <SessionExecutionView
        session={makeSession()}
        plan={{ id: "plan-1", archetype: "general-crossfit", title: "Plan" }}
        accessToken="test-token"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "begin session" }));
    const swapButton = await screen.findByRole("button", {
      name: "Swap this exercise with a substitute",
    });
    fireEvent.click(swapButton);

    await waitFor(() => expect(searchMock).toHaveBeenCalledTimes(1));
    await screen.findByRole("alert");
    expect(getSubstitutesMock).not.toHaveBeenCalled();
  });
});
