// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EquipmentGrid } from "@/components/profile/equipment-grid";

describe("EquipmentGrid", () => {
  it("renders all 7 equipment options", () => {
    render(<EquipmentGrid value={[]} onChange={vi.fn()} />);
    expect(screen.getByText("Barbell")).toBeDefined();
    expect(screen.getByText("Dumbbells")).toBeDefined();
    expect(screen.getByText("Kettlebells")).toBeDefined();
    expect(screen.getByText("Rig / pull-up bar")).toBeDefined();
    expect(screen.getByText("Rower / erg")).toBeDefined();
    expect(screen.getByText("Machines")).toBeDefined();
    expect(screen.getByText("No equipment")).toBeDefined();
  });

  it("adds an item to the selection on click", () => {
    const onChange = vi.fn();
    render(<EquipmentGrid value={[]} onChange={onChange} />);
    fireEvent.click(screen.getByText("Barbell"));
    expect(onChange).toHaveBeenCalledWith(["barbell"]);
  });

  it("removes an already-selected item on click", () => {
    const onChange = vi.fn();
    render(
      <EquipmentGrid value={["barbell", "dumbbells"]} onChange={onChange} />,
    );
    fireEvent.click(screen.getByText("Barbell"));
    expect(onChange).toHaveBeenCalledWith(["dumbbells"]);
  });

  it("selecting 'none' clears every other selection", () => {
    const onChange = vi.fn();
    render(
      <EquipmentGrid value={["barbell", "dumbbells"]} onChange={onChange} />,
    );
    fireEvent.click(screen.getByText("No equipment"));
    expect(onChange).toHaveBeenCalledWith(["none"]);
  });

  it("selecting real equipment while 'none' is active drops 'none'", () => {
    const onChange = vi.fn();
    render(<EquipmentGrid value={["none"]} onChange={onChange} />);
    fireEvent.click(screen.getByText("Barbell"));
    expect(onChange).toHaveBeenCalledWith(["barbell"]);
  });

  it("clicking 'none' again while active deselects it", () => {
    const onChange = vi.fn();
    render(<EquipmentGrid value={["none"]} onChange={onChange} />);
    fireEvent.click(screen.getByText("No equipment"));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
