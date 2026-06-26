// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { ResultFields } from "@/components/log/ResultFields";
import type { LogFormValues } from "@/components/log/schema";
import type { ResultTypeValue } from "@/components/log/ResultFields";

// Minimal wrapper that wires up react-hook-form and renders ResultFields.
function Wrapper({
  resultType = "weight",
  weightUnit = "kg",
  isCardioCompound = false,
}: {
  resultType?: ResultTypeValue;
  weightUnit?: "kg" | "lb";
  isCardioCompound?: boolean;
}) {
  const { register, setValue } = useForm<LogFormValues>({
    defaultValues: { results: [{}] },
  });

  return (
    <ResultFields
      index={0}
      resultType={resultType}
      register={register}
      weightUnit={weightUnit}
      setValue={setValue}
      isCardioCompound={isCardioCompound}
    />
  );
}

describe("ResultFields — weight branch", () => {
  it('renders "kg" suffix by default', () => {
    render(<Wrapper resultType="weight" weightUnit="kg" />);
    expect(screen.getByText("kg")).toBeTruthy();
    expect(
      screen.getByRole("spinbutton", { name: "Weight in kg" }),
    ).toBeTruthy();
  });

  it('renders "lb" suffix when weightUnit="lb"', () => {
    render(<Wrapper resultType="weight" weightUnit="lb" />);
    expect(screen.getByText("lb")).toBeTruthy();
    expect(
      screen.getByRole("spinbutton", { name: "Weight in lb" }),
    ).toBeTruthy();
  });
});

describe("ResultFields — time branch onBlur normalisation", () => {
  it("time input is accessible with correct aria-label", () => {
    render(<Wrapper resultType="time" />);
    expect(screen.getByRole("textbox", { name: "Time (mm:ss)" })).toBeTruthy();
  });

  it("remains mounted and accessible after onBlur fires", () => {
    render(<Wrapper resultType="time" />);
    const input = screen.getByRole("textbox", { name: "Time (mm:ss)" });
    fireEvent.change(input, { target: { value: "632" } });
    fireEvent.blur(input, { target: { value: "632" } });
    // Component should remain rendered without errors
    expect(screen.getByRole("textbox", { name: "Time (mm:ss)" })).toBeTruthy();
  });
});

describe("ResultFields — cardio compound branch", () => {
  it("renders distance and time inputs when isCardioCompound=true", () => {
    render(<Wrapper isCardioCompound={true} resultType="weight" />);
    expect(
      screen.getByRole("spinbutton", { name: "Distance in metres" }),
    ).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Time (mm:ss)" })).toBeTruthy();
  });

  it("shows pace label after entering valid distance and time", () => {
    render(<Wrapper isCardioCompound={true} resultType="weight" />);
    const distInput = screen.getByRole("spinbutton", {
      name: "Distance in metres",
    });
    const timeInput = screen.getByRole("textbox", { name: "Time (mm:ss)" });

    // 2000m at 7:12 (432s) → pace = 432 / (2000/500) = 432/4 = 108s = 1:48 /500m
    fireEvent.change(distInput, { target: { value: "2000" } });
    fireEvent.change(timeInput, { target: { value: "7:12" } });

    expect(screen.getByText("1:48 /500m")).toBeTruthy();
  });

  it("does not show pace when distance is empty", () => {
    render(<Wrapper isCardioCompound={true} resultType="weight" />);
    const timeInput = screen.getByRole("textbox", { name: "Time (mm:ss)" });
    fireEvent.change(timeInput, { target: { value: "7:12" } });
    expect(screen.queryByText(/\/500m/)).toBeNull();
  });

  it("renders distance suffix 'm'", () => {
    render(<Wrapper isCardioCompound={true} resultType="weight" />);
    expect(screen.getByText("m")).toBeTruthy();
  });
});
