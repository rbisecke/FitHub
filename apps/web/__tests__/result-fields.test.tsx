// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { ResultFields } from "@/components/log/ResultFields";
import { UserPrefsProvider } from "@/lib/contexts/UserPrefsContext";
import type { LogFormValues } from "@/components/log/schema";
import type { ResultTypeValue } from "@/components/log/ResultFields";

// Minimal wrapper that wires up react-hook-form and renders ResultFields.
function Wrapper({
  resultType = "weight",
  weightUnit = "kg",
  distanceUnit = "km",
  isCardioCompound = false,
}: {
  resultType?: ResultTypeValue;
  weightUnit?: "kg" | "lb";
  distanceUnit?: "km" | "mi";
  isCardioCompound?: boolean;
}) {
  const { register, setValue } = useForm<LogFormValues>({
    defaultValues: { movement_entries: [] },
  });

  return (
    <UserPrefsProvider
      initialWeightUnit={weightUnit}
      initialDistanceUnit={distanceUnit}
      initialGraphColourMode="intensity"
    >
      <ResultFields
        index={0}
        resultType={resultType}
        register={register}
        weightUnit={weightUnit}
        setValue={setValue}
        isCardioCompound={isCardioCompound}
      />
    </UserPrefsProvider>
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

  it("shows pace label in km/km after entering valid distance and time", () => {
    render(
      <Wrapper isCardioCompound={true} resultType="weight" distanceUnit="km" />,
    );
    const distInput = screen.getByRole("spinbutton", {
      name: "Distance in metres",
    });
    const timeInput = screen.getByRole("textbox", { name: "Time (mm:ss)" });

    // 2000m at 7:12 (432s) → pace per km = 432 / (2000/1000) = 432/2 = 216s = 3:36 /km
    fireEvent.change(distInput, { target: { value: "2000" } });
    fireEvent.change(timeInput, { target: { value: "7:12" } });

    expect(screen.getByText("3:36 /km")).toBeTruthy();
  });

  it("shows pace label in /mi when distanceUnit=mi", () => {
    render(
      <Wrapper isCardioCompound={true} resultType="weight" distanceUnit="mi" />,
    );
    const distInput = screen.getByRole("spinbutton", {
      name: "Distance in metres",
    });
    const timeInput = screen.getByRole("textbox", { name: "Time (mm:ss)" });

    // 2000m at 7:12 (432s) → pace per mile = 432 / (2000/1609.344) ≈ 347.7s ≈ 5:48 /mi
    fireEvent.change(distInput, { target: { value: "2000" } });
    fireEvent.change(timeInput, { target: { value: "7:12" } });

    expect(screen.getByText("5:48 /mi")).toBeTruthy();
  });

  it("does not show pace when distance is empty", () => {
    render(<Wrapper isCardioCompound={true} resultType="weight" />);
    const timeInput = screen.getByRole("textbox", { name: "Time (mm:ss)" });
    fireEvent.change(timeInput, { target: { value: "7:12" } });
    expect(screen.queryByText(/\/km/)).toBeNull();
  });

  it("renders distance suffix 'm'", () => {
    render(<Wrapper isCardioCompound={true} resultType="weight" />);
    expect(screen.getByText("m")).toBeTruthy();
  });
});
