// @vitest-environment jsdom
/**
 * Cost / usage dashboard (`08` §7) — covers the two pieces of real logic in
 * the rewritten components: TokenGrid's invoice subtotal computation (the
 * previously-stubbed `totals={null}` path) and CostHero's over/under-budget
 * badge flip (the one full-card state-signal on this page).
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TokenGrid } from "@/components/admin/TokenGrid";
import { CostHero } from "@/components/admin/CostHero";
import { TopUsersTable } from "@/components/admin/TopUsersTable";
import type { AdminTokenTypeBreakdown } from "@/lib/api";

describe("TokenGrid", () => {
  const breakdown: AdminTokenTypeBreakdown[] = [
    {
      token_type: "input",
      quantity: 1_000_000,
      unit_price_per_mtok: 1.0,
      charge_usd: 1.0,
    },
    {
      token_type: "output",
      quantity: 200_000,
      unit_price_per_mtok: 5.0,
      charge_usd: 1.0,
    },
    {
      token_type: "cache_read",
      quantity: 500_000,
      unit_price_per_mtok: 0.1,
      charge_usd: 0.05,
    },
    {
      token_type: "cache_write",
      quantity: 40_000,
      unit_price_per_mtok: 1.25,
      charge_usd: 0.05,
    },
  ];

  it("computes the subtotal as the sum of every row's charge", () => {
    render(<TokenGrid breakdown={breakdown} />);
    // 1.00 + 1.00 + 0.05 + 0.05 = 2.10
    expect(screen.getByText("$2.10")).toBeDefined();
  });

  it("renders honest zero rows with fallback Haiku 4.5 pricing when there is no usage yet", () => {
    render(<TokenGrid breakdown={[]} />);
    // 4 zero-charge rows + a $0.00 subtotal.
    expect(screen.getAllByText("$0.00")).toHaveLength(5);
    expect(screen.getByText("$1.00/M tok")).toBeDefined();
  });
});

describe("CostHero", () => {
  it("shows the quiet 'Under budget' badge when projected spend is within budget", () => {
    render(<CostHero projectedMonthEndUsd={3.5} budgetUsd={5.0} />);
    expect(screen.getByText("Under budget")).toBeDefined();
    expect(screen.queryByText("Over budget")).toBeNull();
  });

  it("flips to the full-card 'Over budget' danger state when projected spend exceeds budget", () => {
    render(<CostHero projectedMonthEndUsd={7.2} budgetUsd={5.0} />);
    expect(screen.getByText("Over budget")).toBeDefined();
    expect(screen.queryByText("Under budget")).toBeNull();
  });

  it("never implies the dashboard can stop spend", () => {
    render(<CostHero projectedMonthEndUsd={7.2} budgetUsd={5.0} />);
    expect(
      screen.getByText(/reports usage only; it cannot limit or stop spend/i),
    ).toBeDefined();
  });
});

describe("TopUsersTable", () => {
  it("shows an honest empty state instead of a blank list", () => {
    render(<TopUsersTable users={[]} />);
    expect(screen.getByText("No LLM activity in this window.")).toBeDefined();
  });

  it("falls back user_id when both display_name and email are null", () => {
    render(
      <TopUsersTable
        users={[
          {
            user_id: "abcdef12-3456-7890-abcd-ef1234567890",
            display_name: null,
            email: null,
            interactions_30d: 4,
            cost_30d_usd: 1.23,
          },
        ]}
      />,
    );
    expect(screen.getByText("user-abcdef12")).toBeDefined();
  });
});
