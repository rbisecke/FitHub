// @vitest-environment jsdom
/**
 * Tests for the FilterBar active filter pills row and mobile filter sheet trigger.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { FilterBar } from "@/components/history/FilterBar";
import { DEFAULT_FILTERS } from "@/components/workout/HistoryControls";

// Minimal stub for HistoryFilterSheet
vi.mock("@/components/workout/HistoryFilterSheet", () => ({
  HistoryFilterSheet: () => null,
}));

describe("FilterBar — active filter pills", () => {
  it("shows no pills when no server-side filters are active", () => {
    const { queryAllByRole } = render(
      <FilterBar
        filters={DEFAULT_FILTERS}
        onFiltersChange={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    // No amber pills visible
    expect(queryAllByRole("button", { name: /clear/i })).toHaveLength(0);
  });

  it("renders an amber pill when sessionType filter is active", () => {
    render(
      <FilterBar
        filters={{ ...DEFAULT_FILTERS, sessionType: "strength" }}
        onFiltersChange={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    // "Clear all" link appears when a server filter is active
    expect(screen.getByText("Clear all")).toBeDefined();
    // The × clear button for the Strength filter pill
    expect(screen.getByLabelText("Clear Strength filter")).toBeDefined();
  });

  it("renders a date range pill when dateFrom/dateTo are set", () => {
    render(
      <FilterBar
        filters={{
          ...DEFAULT_FILTERS,
          dateFrom: "2024-06-01",
          dateTo: "2024-06-30",
        }}
        onFiltersChange={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    // Should show a date range label containing Jun
    const pill = screen.getByText(/Jun/);
    expect(pill).toBeDefined();
  });

  it("calls onFiltersChange with sessionType=null when × is clicked on sessionType pill", () => {
    const onFiltersChange = vi.fn();
    render(
      <FilterBar
        filters={{ ...DEFAULT_FILTERS, sessionType: "metcon" }}
        onFiltersChange={onFiltersChange}
        onClear={vi.fn()}
      />,
    );
    // Find the × button on the Metcon pill
    const clearBtn = screen.getByLabelText("Clear Metcon filter");
    fireEvent.click(clearBtn);
    expect(onFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ sessionType: null }),
    );
  });

  it("renders a movement filter pill alongside server filter pills", () => {
    const onClearMovement = vi.fn();
    render(
      <FilterBar
        filters={DEFAULT_FILTERS}
        onFiltersChange={vi.fn()}
        onClear={vi.fn()}
        movementFilter="Back Squat"
        onClearMovementFilter={onClearMovement}
      />,
    );
    expect(screen.getByText(/Back Squat/)).toBeDefined();
  });

  it("shows mobile Filters button", () => {
    render(
      <FilterBar
        filters={DEFAULT_FILTERS}
        onFiltersChange={vi.fn()}
        onClear={vi.fn()}
      />,
    );
    // The mobile Filters button has aria-label="Open filters"
    expect(screen.getByLabelText("Open filters")).toBeDefined();
  });
});
