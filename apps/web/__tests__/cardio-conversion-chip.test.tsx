// @vitest-environment jsdom
/**
 * Tests for CardioConversionChip (01 §11): the chip surfaces only for
 * running-equivalent movement names and opens the reference panel on click.
 */

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CardioConversionChip } from "@/components/logging/CardioConversionChip";

describe("CardioConversionChip", () => {
  it("renders the chip for a running-equivalent movement", () => {
    render(<CardioConversionChip movementName="800m Run" />);
    expect(screen.getByText("Substitute cardio")).toBeTruthy();
  });

  it("renders nothing for a non-running movement", () => {
    const { container } = render(
      <CardioConversionChip movementName="Back Squat" />,
    );
    expect(container.textContent).toBe("");
  });

  it("opens the reference panel showing the distance and calorie tables", () => {
    render(<CardioConversionChip movementName="800m Run" />);
    fireEvent.click(screen.getByText("Substitute cardio"));
    // Section titles are CSS-uppercased; the DOM text is title-case.
    expect(screen.getByText("Distance")).toBeTruthy();
    expect(screen.getByText("Calories")).toBeTruthy();
    // The 200m gap-fix row is present (appears in both the run column and cells).
    expect(screen.getAllByText("200 m").length).toBeGreaterThan(0);
  });
});
