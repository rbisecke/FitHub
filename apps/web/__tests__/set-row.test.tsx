// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SetTypeBadge } from "@/components/log/SetTypeBadge";
import { E1RMGhost } from "@/components/log/E1RMGhost";
import { SetRow } from "@/components/log/SetRow";

describe("SetTypeBadge", () => {
  it("cycles warmup → working → drop → warmup on click", () => {
    const onChange = vi.fn();

    const { rerender } = render(
      <SetTypeBadge value="warmup" onChange={onChange} />,
    );
    const btn = screen.getByRole("button", { name: /set type/i });

    // warmup → working
    fireEvent.click(btn);
    expect(onChange).toHaveBeenLastCalledWith("working");

    rerender(<SetTypeBadge value="working" onChange={onChange} />);
    fireEvent.click(btn);
    expect(onChange).toHaveBeenLastCalledWith("drop");

    rerender(<SetTypeBadge value="drop" onChange={onChange} />);
    fireEvent.click(btn);
    expect(onChange).toHaveBeenLastCalledWith("warmup");
  });

  it("displays correct label for each set type", () => {
    const { rerender } = render(
      <SetTypeBadge value="warmup" onChange={vi.fn()} />,
    );
    expect(screen.getByText("W")).toBeTruthy();

    rerender(<SetTypeBadge value="working" onChange={vi.fn()} />);
    expect(screen.getByText("●")).toBeTruthy();

    rerender(<SetTypeBadge value="drop" onChange={vi.fn()} />);
    expect(screen.getByText("↓")).toBeTruthy();
  });
});

describe("E1RMGhost", () => {
  it("shows ~117 kg for 100 kg × 5 reps (Epley)", () => {
    render(<E1RMGhost loadKg={100} reps={5} />);
    expect(screen.getByText("~117 kg")).toBeTruthy();
  });

  it("is hidden when reps > 10", () => {
    const { container } = render(<E1RMGhost loadKg={100} reps={11} />);
    expect(container.firstChild).toBeNull();
  });

  it("is hidden when loadKg is 0", () => {
    const { container } = render(<E1RMGhost loadKg={0} reps={5} />);
    expect(container.firstChild).toBeNull();
  });

  it("is hidden when loadKg is null", () => {
    const { container } = render(<E1RMGhost loadKg={null} reps={5} />);
    expect(container.firstChild).toBeNull();
  });

  it("is hidden when reps is 0", () => {
    const { container } = render(<E1RMGhost loadKg={100} reps={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("is hidden when reps is null", () => {
    const { container } = render(<E1RMGhost loadKg={100} reps={null} />);
    expect(container.firstChild).toBeNull();
  });
});

describe("SetRow", () => {
  const defaultProps = {
    setNumber: 1,
    setType: "working" as const,
    loadDisplay: "100",
    reps: "5",
    weightUnit: "kg" as const,
    onSetTypeChange: vi.fn(),
    onLoadChange: vi.fn(),
    onRepsChange: vi.fn(),
  };

  it("renders the set number", () => {
    render(<SetRow {...defaultProps} />);
    expect(screen.getByText("#1")).toBeTruthy();
  });

  it("renders weight input with correct aria-label", () => {
    render(<SetRow {...defaultProps} />);
    expect(
      screen.getByRole("spinbutton", { name: "Set 1 weight in kg" }),
    ).toBeTruthy();
  });

  it("renders reps input with correct aria-label", () => {
    render(<SetRow {...defaultProps} />);
    expect(screen.getByRole("spinbutton", { name: "Set 1 reps" })).toBeTruthy();
  });

  it("shows e1rm ghost for valid kg input", () => {
    render(<SetRow {...defaultProps} loadDisplay="100" reps="5" />);
    expect(screen.getByText("~117 kg")).toBeTruthy();
  });

  it("converts lb to kg for e1rm calculation", () => {
    // 220.462 lb ≈ 100 kg; e1rm = round(100 * (1 + 5/30)) = 117
    render(
      <SetRow
        {...defaultProps}
        loadDisplay="220.462"
        reps="5"
        weightUnit="lb"
      />,
    );
    expect(screen.getByText("~117 kg")).toBeTruthy();
  });

  it("shows lb suffix when weightUnit is lb", () => {
    render(<SetRow {...defaultProps} weightUnit="lb" />);
    expect(screen.getByText("lb")).toBeTruthy();
  });
});
