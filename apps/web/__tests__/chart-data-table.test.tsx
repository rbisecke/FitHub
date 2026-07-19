// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import { ChartDataTable } from "@/components/shared/chart-data-table";

describe("ChartDataTable (0.17 sr-only chart fallback)", () => {
  const props = {
    caption: "Estimated 1RM over the last 3 sessions",
    columns: ["Date", "Weight (kg)"],
    rows: [
      ["2026-06-01", 100],
      ["2026-06-08", 102.5],
      ["2026-06-15", 105],
    ] as Array<Array<string | number>>,
  };

  it("renders a captioned table with column and row headers", () => {
    const { getByRole, getAllByRole } = render(<ChartDataTable {...props} />);
    const table = getByRole("table", { hidden: true });
    expect(table).toBeDefined();
    // 2 column headers + 3 row headers = 5 <th> total.
    expect(getAllByRole("rowheader", { hidden: true })).toHaveLength(3);
    expect(getAllByRole("columnheader", { hidden: true })).toHaveLength(2);
  });

  it("has no axe violations (proves the a11y gate runs — 0.27)", async () => {
    const { container } = render(<ChartDataTable {...props} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
