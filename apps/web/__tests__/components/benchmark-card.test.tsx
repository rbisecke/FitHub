// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BenchmarkCard } from "@/components/benchmarks/BenchmarkCard";
import type { BenchmarkEntry } from "@/lib/api";

const SINGLE: BenchmarkEntry = {
  name: "Fran",
  attempts: [
    { date: "2026-06-01", result_display: "4:32", result_seconds: 272 },
  ],
  pr_display: "4:32",
  improvement_display: "",
};

const MULTI_NO_IMPROVEMENT: BenchmarkEntry = {
  name: "Cindy",
  attempts: [
    { date: "2026-04-01", result_display: "18 rounds", result_seconds: 1200 },
    { date: "2026-05-01", result_display: "17 rounds", result_seconds: 1200 },
    { date: "2026-06-01", result_display: "18 rounds", result_seconds: 1200 },
  ],
  pr_display: "18 rounds",
  improvement_display: "",
};

const MULTI_WITH_IMPROVEMENT: BenchmarkEntry = {
  name: "Murph",
  attempts: [
    { date: "2026-01-15", result_display: "48:10", result_seconds: 2890 },
    { date: "2026-07-04", result_display: "39:20", result_seconds: 2360 },
  ],
  pr_display: "39:20",
  improvement_display: "8m50s improvement over 2 attempts",
};

describe("BenchmarkCard — three attempt-count states (design-spec 04 Screen 3)", () => {
  it("single attempt: shows 'first attempt', no improvement text, no expand affordance", () => {
    render(<BenchmarkCard entry={SINGLE} />);
    expect(screen.getByText("first attempt")).not.toBeNull();
    expect(screen.queryByText(/attempts logged/)).toBeNull();
    const button = screen.getByRole("button", {
      name: /Fran/,
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("multiple attempts, no improvement: shows attempt count, NOT 'first attempt', no improvement chip", () => {
    render(<BenchmarkCard entry={MULTI_NO_IMPROVEMENT} />);
    expect(screen.queryByText("first attempt")).toBeNull();
    expect(screen.getByText("3 attempts logged")).not.toBeNull();
    const button = screen.getByRole("button", {
      name: /Cindy/,
    }) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });

  it("multiple attempts with real improvement: shows the improvement string, not 'first attempt'", () => {
    render(<BenchmarkCard entry={MULTI_WITH_IMPROVEMENT} />);
    expect(screen.queryByText("first attempt")).toBeNull();
    expect(
      screen.getByText("8m50s improvement over 2 attempts"),
    ).not.toBeNull();
  });

  it("expanding a multi-attempt card reveals its attempts newest-first", () => {
    render(<BenchmarkCard entry={MULTI_WITH_IMPROVEMENT} />);
    const button = screen.getByRole("button", { name: /Expand Murph/ });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    const rows = screen.getAllByText(/48:10|39:20/);
    // Newest (Jul 4, 39:20) should appear before the oldest (Jan 15, 48:10).
    const positions = rows.map((el) => el.textContent);
    expect(positions.indexOf("39:20")).toBeLessThan(positions.indexOf("48:10"));
  });

  it("never nests a <table> inside the toggle <button> (invalid HTML / hydration risk)", () => {
    const { container } = render(
      <BenchmarkCard entry={MULTI_WITH_IMPROVEMENT} />,
    );
    const button = container.querySelector("button");
    expect(button?.querySelector("table")).toBeNull();
  });
});
