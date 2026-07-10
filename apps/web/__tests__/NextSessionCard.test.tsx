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
import { NextSessionCard } from "@/components/dashboard/NextSessionCard";
import type { PlannedSessionOut } from "@/lib/api/plans";

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
});

// ------------------------------------------------------------------
// Pure logic: formatExerciseLine
// Extracted inline so we can test it without mounting the component.
// ------------------------------------------------------------------

function formatExerciseLine(item: {
  sets: number | null;
  reps: string | null;
}): string {
  const parts: string[] = [];
  if (item.sets != null) parts.push(`${item.sets}×`);
  if (item.reps) parts.push(item.reps);
  return parts.join("") || "";
}

describe("formatExerciseLine", () => {
  it("returns sets × reps when both present", () => {
    expect(formatExerciseLine({ sets: 4, reps: "6" })).toBe("4×6");
  });

  it("returns only reps when sets is null", () => {
    expect(formatExerciseLine({ sets: null, reps: "3 rounds" })).toBe(
      "3 rounds",
    );
  });

  it("returns only sets indicator when reps is null", () => {
    expect(formatExerciseLine({ sets: 3, reps: null })).toBe("3×");
  });

  it("returns empty string when both are null", () => {
    expect(formatExerciseLine({ sets: null, reps: null })).toBe("");
  });
});
