// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MovementVariantChips } from "@/components/log/MovementVariantChips";

describe("MovementVariantChips", () => {
  it("renders null when modality is not weightlifting", () => {
    const { container } = render(
      <MovementVariantChips
        value=""
        onChange={vi.fn()}
        modality="gymnastics"
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders null when modality is undefined", () => {
    const { container } = render(
      <MovementVariantChips value="" onChange={vi.fn()} modality={undefined} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders 5 chips when modality is weightlifting", () => {
    render(
      <MovementVariantChips
        value=""
        onChange={vi.fn()}
        modality="weightlifting"
      />,
    );
    expect(screen.getByText("Hang")).toBeTruthy();
    expect(screen.getByText("Power")).toBeTruthy();
    expect(screen.getByText("Squat")).toBeTruthy();
    expect(screen.getByText("Block")).toBeTruthy();
    expect(screen.getByText("Pause")).toBeTruthy();
  });

  it("clicking an unselected chip adds it to the value", () => {
    const onChange = vi.fn();
    render(
      <MovementVariantChips
        value=""
        onChange={onChange}
        modality="weightlifting"
      />,
    );
    fireEvent.click(screen.getByText("Hang"));
    expect(onChange).toHaveBeenCalledWith("hang");
  });

  it("clicking a selected chip removes it from the value", () => {
    const onChange = vi.fn();
    render(
      <MovementVariantChips
        value="hang,power"
        onChange={onChange}
        modality="weightlifting"
      />,
    );
    fireEvent.click(screen.getByText("Hang"));
    expect(onChange).toHaveBeenCalledWith("power");
  });

  it("multiple chips can be selected simultaneously", () => {
    const onChange = vi.fn();
    render(
      <MovementVariantChips
        value="hang"
        onChange={onChange}
        modality="weightlifting"
      />,
    );
    fireEvent.click(screen.getByText("Power"));
    const result = (onChange.mock.calls[0] as [string])[0];
    const parts = result.split(",").sort();
    expect(parts).toEqual(["hang", "power"]);
  });
});
