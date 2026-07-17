import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

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

import { CurrentWeekView } from "@/components/plans/CurrentWeekView";
import type { PlannedSessionOut } from "@/lib/api/plans";

// ---------------------------------------------------------------------------
// Fixtures — dates computed relative to "today" so the test is stable
// regardless of when it runs, mirroring the component's own week-range math.
// ---------------------------------------------------------------------------

function mondayOfThisWeek(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay();
  const offsetToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const start = new Date(today);
  start.setDate(today.getDate() + offsetToMonday);
  return start;
}

function toDateKey(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function makeSession(
  id: string,
  scheduledDate: string,
  overrides: Partial<PlannedSessionOut> = {},
): PlannedSessionOut {
  return {
    id,
    mesocycle_id: "meso-1",
    scheduled_date: scheduledDate,
    session_type: "strength",
    title: `Session ${id}`,
    notes: null,
    status: "prescribed",
    items: [],
    ...overrides,
  };
}

describe("CurrentWeekView — PD2 duplicate-date grouping", () => {
  it("renders both sessions when two share the same scheduled_date", () => {
    const dateKey = toDateKey(mondayOfThisWeek());
    const sessions: PlannedSessionOut[] = [
      makeSession("s1", dateKey, { title: "Morning Strength" }),
      makeSession("s2", dateKey, {
        title: "Evening Conditioning",
        session_type: "metcon",
      }),
    ];

    const html = renderToStaticMarkup(<CurrentWeekView sessions={sessions} />);

    expect(html).toContain("Morning Strength");
    expect(html).toContain("Evening Conditioning");
  });
});

describe("CurrentWeekView — PD5 explicit empty-week message", () => {
  it('shows "Nothing scheduled this week" instead of rendering nothing', () => {
    const html = renderToStaticMarkup(<CurrentWeekView sessions={[]} />);

    expect(html).toContain("Nothing scheduled this week");
  });

  it("still renders the week header even with no sessions", () => {
    const html = renderToStaticMarkup(<CurrentWeekView sessions={[]} />);

    expect(html).toContain("This week");
  });
});

describe("CurrentWeekView — single session per day (unchanged behavior)", () => {
  it("renders a single session normally", () => {
    const dateKey = toDateKey(mondayOfThisWeek());
    const sessions: PlannedSessionOut[] = [
      makeSession("s1", dateKey, { title: "Solo Session" }),
    ];

    const html = renderToStaticMarkup(<CurrentWeekView sessions={sessions} />);

    expect(html).toContain("Solo Session");
    expect(html).not.toContain("Nothing scheduled this week");
  });
});
