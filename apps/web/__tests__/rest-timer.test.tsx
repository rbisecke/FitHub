// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RestTimer } from "@/components/log/RestTimer";

describe("RestTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("renders nothing when remaining is 0", () => {
    const { container } = render(<RestTimer remaining={0} onSkip={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders countdown when remaining > 0", () => {
    render(<RestTimer remaining={90} onSkip={() => {}} />);
    expect(screen.getByText("1:30")).toBeTruthy();
    expect(screen.getByText("Rest")).toBeTruthy();
  });

  it("calls onSkip when Skip button is clicked", () => {
    const onSkip = vi.fn();
    render(<RestTimer remaining={60} onSkip={onSkip} />);
    fireEvent.click(screen.getByRole("button", { name: "Skip rest" }));
    expect(onSkip).toHaveBeenCalledOnce();
  });

  it("formats time correctly", () => {
    render(<RestTimer remaining={75} onSkip={() => {}} />);
    expect(screen.getByText("1:15")).toBeTruthy();
  });

  it("formats sub-minute time with leading zero", () => {
    render(<RestTimer remaining={9} onSkip={() => {}} />);
    expect(screen.getByText("0:09")).toBeTruthy();
  });
});
