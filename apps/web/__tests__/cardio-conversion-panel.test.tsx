// @vitest-environment jsdom
/**
 * Unit tests for the CardioConversionPanel helpers and component logic.
 *
 * The component is a "use client" interactive component so we test:
 *   1. Pure helper functions (isCardioMovement, extractRunDistance) exhaustively.
 *   2. The conversion data table structure (correct values, no missing machines).
 *   3. Basic render behaviour via JSDOM (chip renders, panel opens).
 */

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  isCardioMovement,
  extractRunDistance,
  CardioConversionChip,
} from "@/components/plans/CardioConversionPanel";

// ---------------------------------------------------------------------------
// isCardioMovement
// ---------------------------------------------------------------------------

describe("isCardioMovement", () => {
  it("returns true for '400m Run'", () => {
    expect(isCardioMovement("400m Run")).toBe(true);
  });

  it("returns true for '800m run' (lowercase)", () => {
    expect(isCardioMovement("800m run")).toBe(true);
  });

  it("returns true for '1 Mile Run'", () => {
    expect(isCardioMovement("1 Mile Run")).toBe(true);
  });

  it("returns true for 'Run 400m' (run prefix)", () => {
    expect(isCardioMovement("Run 400m")).toBe(true);
  });

  it("returns true for 'Sprint 100m'", () => {
    expect(isCardioMovement("Sprint 100m")).toBe(true);
  });

  it("returns false for 'Back Squat'", () => {
    expect(isCardioMovement("Back Squat")).toBe(false);
  });

  it("returns false for 'Thruster'", () => {
    expect(isCardioMovement("Thruster")).toBe(false);
  });

  it("returns false for 'Deadlift'", () => {
    expect(isCardioMovement("Deadlift")).toBe(false);
  });

  it("returns false for 'Pull-up'", () => {
    expect(isCardioMovement("Pull-up")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// extractRunDistance
// ---------------------------------------------------------------------------

describe("extractRunDistance", () => {
  it("returns '400m' for '400m Run'", () => {
    expect(extractRunDistance("400m Run")).toBe("400m");
  });

  it("returns '400m' for 'Run 400m'", () => {
    expect(extractRunDistance("Run 400m")).toBe("400m");
  });

  it("returns '800m' for '800m run'", () => {
    expect(extractRunDistance("800m run")).toBe("800m");
  });

  it("returns '1mile' for '1 Mile Run'", () => {
    expect(extractRunDistance("1 Mile Run")).toBe("1mile");
  });

  it("returns '1mile' for '1600m Run'", () => {
    expect(extractRunDistance("1600m Run")).toBe("1mile");
  });

  it("returns '1mile' for 'Mile Run'", () => {
    // "mile run" substring contains "mile run" → 1mile
    expect(extractRunDistance("Mile Run")).toBe("1mile");
  });

  it("returns null for 'Back Squat'", () => {
    expect(extractRunDistance("Back Squat")).toBeNull();
  });

  it("returns null for plain 'Run' (no distance)", () => {
    // No known distance token → null
    expect(extractRunDistance("Run")).toBeNull();
  });

  it("returns '1mile' before '800m' when both tokens present (edge case)", () => {
    // Contrived, but confirms ordering: 1mile check runs first
    expect(extractRunDistance("1 Mile 800m")).toBe("1mile");
  });
});

// ---------------------------------------------------------------------------
// CardioConversionChip — render and interaction
// ---------------------------------------------------------------------------

describe("CardioConversionChip", () => {
  it("renders the Sub cardio chip", () => {
    render(<CardioConversionChip distanceKey="400m" />);
    expect(screen.getByTestId("cardio-sub-chip")).toBeDefined();
    expect(screen.getByTestId("cardio-sub-chip").textContent).toContain(
      "Sub cardio",
    );
  });

  it("panel is hidden initially", () => {
    render(<CardioConversionChip distanceKey="400m" />);
    expect(screen.queryByTestId("cardio-conversion-panel")).toBeNull();
  });

  it("panel opens when chip is clicked", () => {
    render(<CardioConversionChip distanceKey="400m" />);
    fireEvent.click(screen.getByTestId("cardio-sub-chip"));
    expect(screen.getByTestId("cardio-conversion-panel")).toBeDefined();
  });

  it("panel shows Distance tab content by default (Row Erg 500 m)", () => {
    render(<CardioConversionChip distanceKey="400m" />);
    fireEvent.click(screen.getByTestId("cardio-sub-chip"));
    const panel = screen.getByTestId("cardio-conversion-panel");
    expect(panel.textContent).toContain("500 m");
    expect(panel.textContent).toContain("Row Erg");
  });

  it("panel closes when × button is clicked", () => {
    render(<CardioConversionChip distanceKey="400m" />);
    fireEvent.click(screen.getByTestId("cardio-sub-chip"));
    const closeBtn = screen.getByLabelText("Close conversion panel");
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId("cardio-conversion-panel")).toBeNull();
  });

  it("800m distance key shows correct Row Erg distance (1,000 m)", () => {
    render(<CardioConversionChip distanceKey="800m" />);
    fireEvent.click(screen.getByTestId("cardio-sub-chip"));
    expect(screen.getByTestId("cardio-conversion-panel").textContent).toContain(
      "1,000 m",
    );
  });

  it("1mile distance key shows correct Row Erg distance (2,000 m)", () => {
    render(<CardioConversionChip distanceKey="1mile" />);
    fireEvent.click(screen.getByTestId("cardio-sub-chip"));
    expect(screen.getByTestId("cardio-conversion-panel").textContent).toContain(
      "2,000 m",
    );
  });

  it("Assault Bike row shows '—' and 'use Calories tab' on Distance tab", () => {
    render(<CardioConversionChip distanceKey="400m" />);
    fireEvent.click(screen.getByTestId("cardio-sub-chip"));
    const panel = screen.getByTestId("cardio-conversion-panel");
    expect(panel.textContent).toContain("Assault Bike");
    expect(panel.textContent).toContain("—");
    expect(panel.textContent).toContain("use Calories tab");
  });

  it("switching to Calories tab shows calorie values", () => {
    render(<CardioConversionChip distanceKey="400m" />);
    fireEvent.click(screen.getByTestId("cardio-sub-chip"));
    const caloriesBtn = screen.getByText("Calories");
    fireEvent.click(caloriesBtn);
    const panel = screen.getByTestId("cardio-conversion-panel");
    expect(panel.textContent).toContain("20 cal"); // Row Erg
    expect(panel.textContent).toContain("12–14 cal"); // Assault Bike
  });

  it("footnote is always visible", () => {
    render(<CardioConversionChip distanceKey="400m" />);
    fireEvent.click(screen.getByTestId("cardio-sub-chip"));
    expect(screen.getByTestId("cardio-conversion-panel").textContent).toContain(
      "Calorie output scales with athlete size and effort",
    );
  });
});
