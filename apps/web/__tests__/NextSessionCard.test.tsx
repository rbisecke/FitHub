// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

// ------------------------------------------------------------------
// Minimal stubs so the component can be imported in jsdom without
// needing the full Next.js / API client environment.
// ------------------------------------------------------------------

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// We mock createApiClient so the component never makes real HTTP calls.
const mockGetNextSession = vi.fn();

vi.mock("@/lib/api/client", () => ({
  createApiClient: () => ({
    plans: {
      getNextSession: mockGetNextSession,
    },
  }),
}));

// Import component AFTER mocks are in place.
import {
  NextSessionCard,
  formatExerciseLine,
  itemHasLoad,
} from "@/components/dashboard/NextSessionCard";
import type { PlannedItemOut, PlannedSessionOut } from "@/lib/api/plans";

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

const MOCK_SESSION: PlannedSessionOut = {
  id: "sess-1",
  mesocycle_id: "meso-1",
  scheduled_date: "2026-07-15",
  session_type: "strength",
  title: "Upper Pull",
  notes: null,
  status: "prescribed",
  items: [
    {
      id: "item-1",
      movement_name: "Pull-up",
      sets: 4,
      reps: "6",
      load_pct_1rm: null,
      load_kg: null,
      notes: null,
      item_order: 1,
    },
    {
      id: "item-2",
      movement_name: "Barbell Row",
      sets: 3,
      reps: "8",
      load_pct_1rm: null,
      load_kg: null,
      notes: null,
      item_order: 2,
    },
  ],
};

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------

describe("NextSessionCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows skeleton while loading when activePlanId is set", async () => {
    // Fetch never resolves during this test.
    mockGetNextSession.mockReturnValue(new Promise(() => {}));

    render(<NextSessionCard accessToken="tok" activePlanId="plan-1" />);

    expect(
      screen.getByRole("status", { name: /loading next session/i }),
    ).toBeTruthy();
  });

  it("shows empty state when activePlanId is null", () => {
    render(<NextSessionCard accessToken="tok" activePlanId={null} />);

    expect(screen.getByText(/No active plan/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /create plan/i })).toBeTruthy();
  });

  it("shows empty state when activePlanId is undefined", () => {
    render(<NextSessionCard accessToken="tok" activePlanId={undefined} />);

    expect(screen.getByText(/No active plan/i)).toBeTruthy();
  });

  // PD1 — activePlanId changing on an already-mounted instance (e.g. via
  // router.refresh() right after plan creation) must show the loading
  // state, not a stale/wrong empty state, until the new fetch resolves.
  it("shows loading state, not a stale empty state, when activePlanId changes on an already-mounted instance", () => {
    // Never resolves — we only care about the state shown immediately
    // after the plan id changes, before any fetch completes.
    mockGetNextSession.mockReturnValue(new Promise(() => {}));

    const { rerender } = render(
      <NextSessionCard accessToken="tok" activePlanId={null} />,
    );
    expect(screen.getByText(/No active plan/i)).toBeTruthy();

    rerender(<NextSessionCard accessToken="tok" activePlanId="plan-2" />);

    expect(
      screen.getByRole("status", { name: /loading next session/i }),
    ).toBeTruthy();
    expect(screen.queryByText(/No active plan/i)).toBeNull();
  });

  it("renders exercise list when data is returned", async () => {
    mockGetNextSession.mockResolvedValue(MOCK_SESSION);

    await act(async () => {
      render(<NextSessionCard accessToken="tok" activePlanId="plan-1" />);
    });

    expect(screen.getByText("Upper Pull")).toBeTruthy();
    expect(screen.getByText("Pull-up")).toBeTruthy();
    expect(screen.getByText("Barbell Row")).toBeTruthy();
    // Sets × reps rendered in tabular-nums mono span.
    expect(screen.getByText("4×6")).toBeTruthy();
    expect(screen.getByText("3×8")).toBeTruthy();
  });

  it("shows empty state when API returns null (no upcoming session)", async () => {
    mockGetNextSession.mockResolvedValue(null);

    await act(async () => {
      render(<NextSessionCard accessToken="tok" activePlanId="plan-1" />);
    });

    expect(screen.getByText(/No active plan/i)).toBeTruthy();
  });

  it("aborts the fetch on unmount", async () => {
    const abortSpy = vi.spyOn(AbortController.prototype, "abort");
    mockGetNextSession.mockReturnValue(new Promise(() => {}));

    const { unmount } = render(
      <NextSessionCard accessToken="tok" activePlanId="plan-1" />,
    );

    unmount();

    expect(abortSpy).toHaveBeenCalledOnce();
  });

  it("passes AbortSignal to the API call", async () => {
    mockGetNextSession.mockReturnValue(new Promise(() => {}));

    render(<NextSessionCard accessToken="tok" activePlanId="plan-1" />);

    expect(mockGetNextSession).toHaveBeenCalledWith(
      "plan-1",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  // PD4 — prescribed load must be surfaced, and the amber "loaded" styling
  // must track the actual load fields, not whether the reps string is
  // non-empty.
  it("surfaces prescribed load and applies amber styling only to items that actually carry a load", async () => {
    const session: PlannedSessionOut = {
      ...MOCK_SESSION,
      items: [
        {
          id: "item-bw",
          movement_name: "Push-up",
          sets: 3,
          reps: "10",
          load_pct_1rm: null,
          load_kg: null,
          notes: null,
          item_order: 1,
        },
        {
          id: "item-loaded",
          movement_name: "Back Squat",
          sets: null,
          reps: null,
          load_pct_1rm: null,
          load_kg: 100,
          notes: null,
          item_order: 2,
        },
      ],
    };
    mockGetNextSession.mockResolvedValue(session);

    await act(async () => {
      render(<NextSessionCard accessToken="tok" activePlanId="plan-1" />);
    });

    // Bodyweight item: reps set, no load -> muted, no load suffix.
    const bodyweightLine = screen.getByText("3×10");
    expect(bodyweightLine.style.color).toBe("var(--muted)");

    // Loaded item with a null reps string: load must still be surfaced,
    // and styled amber because it actually carries a load.
    const loadedLine = screen.getByText("@ 100kg");
    expect(loadedLine.style.color).toBe("var(--amber)");
  });
});

// ------------------------------------------------------------------
// Pure logic: formatExerciseLine / itemHasLoad (PD4)
// Imported directly from the component so tests can't drift out of sync
// with the real implementation.
// ------------------------------------------------------------------

describe("formatExerciseLine", () => {
  function item(overrides: Partial<PlannedItemOut>): PlannedItemOut {
    return {
      id: "item-x",
      movement_name: "Movement",
      sets: null,
      reps: null,
      load_pct_1rm: null,
      load_kg: null,
      notes: null,
      item_order: 1,
      ...overrides,
    };
  }

  it("returns sets × reps when both present and no load", () => {
    expect(formatExerciseLine(item({ sets: 4, reps: "6" }))).toBe("4×6");
  });

  it("returns only reps when sets is null", () => {
    expect(formatExerciseLine(item({ sets: null, reps: "3 rounds" }))).toBe(
      "3 rounds",
    );
  });

  it("returns only sets indicator when reps is null", () => {
    expect(formatExerciseLine(item({ sets: 3, reps: null }))).toBe("3×");
  });

  it("returns empty string when sets, reps, and load are all null", () => {
    expect(formatExerciseLine(item({ sets: null, reps: null }))).toBe("");
  });

  it("appends ` @ Nkg` when load_kg is present", () => {
    expect(formatExerciseLine(item({ sets: 5, reps: "5", load_kg: 100 }))).toBe(
      "5×5 @ 100kg",
    );
  });

  it("appends ` @ N%` when load_pct_1rm is present", () => {
    expect(
      formatExerciseLine(item({ sets: 5, reps: "5", load_pct_1rm: 75 })),
    ).toBe("5×5 @ 75%");
  });

  it("prefers load_kg over load_pct_1rm when both are present", () => {
    expect(
      formatExerciseLine(
        item({ sets: 5, reps: "5", load_kg: 100, load_pct_1rm: 75 }),
      ),
    ).toBe("5×5 @ 100kg");
  });

  it("surfaces load even with a null reps string", () => {
    expect(
      formatExerciseLine(item({ sets: null, reps: null, load_kg: 60 })),
    ).toBe("@ 60kg");
  });
});

describe("itemHasLoad", () => {
  it("is false for a bodyweight item with reps but no load", () => {
    expect(itemHasLoad({ load_kg: null, load_pct_1rm: null })).toBe(false);
  });

  it("is true for an item with load_kg set, regardless of reps", () => {
    expect(itemHasLoad({ load_kg: 100, load_pct_1rm: null })).toBe(true);
  });

  it("is true for an item with load_pct_1rm set, regardless of reps", () => {
    expect(itemHasLoad({ load_kg: null, load_pct_1rm: 75 })).toBe(true);
  });
});
