// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MovementVariantChips } from "@/components/log/MovementVariantChips";

describe("MovementVariantChips", () => {
  it("renders null when modality is in the hidden set (mono_structural)", () => {
    const { container } = render(
      <MovementVariantChips
        value=""
        onChange={vi.fn()}
        modality="mono_structural"
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

  it("renders 4 chips with label for weightlifting modality", () => {
    render(
      <MovementVariantChips
        value=""
        onChange={vi.fn()}
        modality="weightlifting"
      />,
    );
    expect(screen.getByText("Annotate variant")).toBeTruthy();
    expect(screen.getByText("Pause")).toBeTruthy();
    expect(screen.getByText("Block")).toBeTruthy();
    expect(screen.getByText("Tempo")).toBeTruthy();
    expect(screen.getByText("Strict")).toBeTruthy();
  });

  it("renders chips for gymnastics modality (not hidden)", () => {
    const { container } = render(
      <MovementVariantChips
        value=""
        onChange={vi.fn()}
        modality="gymnastics"
      />,
    );
    expect(container.firstChild).not.toBeNull();
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
    fireEvent.click(screen.getByText("Pause"));
    expect(onChange).toHaveBeenCalledWith("pause");
  });

  it("clicking a selected chip removes it from the value", () => {
    const onChange = vi.fn();
    render(
      <MovementVariantChips
        value="pause,block"
        onChange={onChange}
        modality="weightlifting"
      />,
    );
    fireEvent.click(screen.getByText("Pause"));
    expect(onChange).toHaveBeenCalledWith("block");
  });

  it("multiple chips can be selected simultaneously", () => {
    const onChange = vi.fn();
    render(
      <MovementVariantChips
        value="pause"
        onChange={onChange}
        modality="weightlifting"
      />,
    );
    fireEvent.click(screen.getByText("Block"));
    const result = (onChange.mock.calls[0] as [string])[0];
    const parts = result.split(",").sort();
    expect(parts).toEqual(["block", "pause"]);
  });
});
