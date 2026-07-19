// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GoalGrid, GOAL_LABELS } from "@/components/profile/goal-grid";

describe("GoalGrid", () => {
  it("renders all 7 goal options with the exact spec labels", () => {
    render(<GoalGrid value={null} onChange={vi.fn()} />);
    expect(screen.getByText("Build strength")).toBeDefined();
    expect(screen.getByText("Gain muscle")).toBeDefined();
    expect(screen.getByText("Lose weight")).toBeDefined();
    expect(screen.getByText("Improve conditioning")).toBeDefined();
    expect(screen.getByText("Compete")).toBeDefined();
    expect(screen.getByText("Return from a break")).toBeDefined();
    expect(screen.getByText("General fitness")).toBeDefined();
  });

  it("calls onChange with the selected value", () => {
    const onChange = vi.fn();
    render(<GoalGrid value={null} onChange={onChange} />);
    fireEvent.click(screen.getByText("Compete"));
    expect(onChange).toHaveBeenCalledWith("compete");
  });

  it("marks the current value as the checked radio", () => {
    render(<GoalGrid value="lose_weight" onChange={vi.fn()} />);
    const option = screen.getByRole("radio", { name: "Lose weight" });
    expect(option.getAttribute("aria-checked")).toBe("true");
  });

  it("GOAL_LABELS covers all 7 values used by the recap summary", () => {
    expect(Object.keys(GOAL_LABELS)).toHaveLength(7);
    expect(GOAL_LABELS.build_strength).toBe("Build strength");
  });
});
