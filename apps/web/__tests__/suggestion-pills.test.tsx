// @vitest-environment jsdom
/**
 * Unit tests for the SuggestionPills component.
 *
 * Verifies: the new "Convert cardio →" pill is present, its onSelect call
 * pre-fills with the right prompt prefix, and existing pills still work.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SuggestionPills } from "@/components/coach/SuggestionPills";

describe("SuggestionPills", () => {
  it("renders the Convert cardio → pill", () => {
    render(<SuggestionPills onSelect={() => {}} />);
    const pill = screen.getByText("Convert cardio →");
    expect(pill).toBeDefined();
  });

  it("Convert cardio → pill calls onSelect with the prompt prefix", () => {
    const onSelect = vi.fn();
    render(<SuggestionPills onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Convert cardio →"));
    expect(onSelect).toHaveBeenCalledWith(
      "Convert this cardio to machine equivalents: ",
    );
  });

  it("existing pills call onSelect with their own text verbatim", () => {
    const onSelect = vi.fn();
    render(<SuggestionPills onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Review my last week"));
    expect(onSelect).toHaveBeenCalledWith("Review my last week");
  });

  it("Suggest a deload pill passes its text verbatim", () => {
    const onSelect = vi.fn();
    render(<SuggestionPills onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Suggest a deload"));
    expect(onSelect).toHaveBeenCalledWith("Suggest a deload");
  });

  it("renders all six pills (5 original + Convert cardio →)", () => {
    render(<SuggestionPills onSelect={() => {}} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(6);
  });

  it("Convert cardio → pill is the last in the row", () => {
    render(<SuggestionPills onSelect={() => {}} />);
    const buttons = screen.getAllByRole("button");
    const lastButton = buttons[buttons.length - 1];
    expect(lastButton).toBeDefined();
    expect(lastButton!.textContent).toBe("Convert cardio →");
  });
});
