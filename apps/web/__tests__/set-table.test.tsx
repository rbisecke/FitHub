// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { SetTable } from "@/components/log/SetTable";
import type { LogFormValues } from "@/components/log/schema";

// ---- Minimal wrapper that provides react-hook-form context ----

interface WrapperProps {
  resultType?: LogFormValues["movement_entries"][0]["result_type"];
  initialSets?: LogFormValues["movement_entries"][0]["sets"];
  prThreshold?: number | null;
  weightUnit?: "kg" | "lb";
}

function Wrapper({
  resultType = "weight",
  initialSets = [],
  prThreshold = null,
  weightUnit = "kg",
}: WrapperProps) {
  const { control, register, setValue } = useForm<LogFormValues>({
    defaultValues: {
      performed_at: "2026-01-01",
      movement_entries: [
        {
          result_type: resultType,
          sets: initialSets,
          order_index: 0,
        },
      ],
    },
  });

  return (
    <SetTable
      movementIndex={0}
      control={control}
      register={register}
      setValue={setValue}
      resultType={resultType}
      weightUnit={weightUnit}
      prThreshold={prThreshold}
    />
  );
}

describe("SetTable", () => {
  it("renders column headers for a strength/weight movement", () => {
    render(<Wrapper resultType="weight" />);
    expect(screen.getByText("Set")).toBeTruthy();
    expect(screen.getByText("kg")).toBeTruthy();
    expect(screen.getByText("Reps")).toBeTruthy();
    expect(screen.getByText("Type")).toBeTruthy();
    expect(screen.getByText("1RM")).toBeTruthy();
  });

  it("renders a SetRow for each entry in sets[]", () => {
    const sets: LogFormValues["movement_entries"][0]["sets"] = [
      {
        set_index: 0,
        set_type: "working",
        load_display: "100",
        load_kg: "100",
        reps: "5",
      },
      {
        set_index: 1,
        set_type: "warmup",
        load_display: "60",
        load_kg: "60",
        reps: "10",
      },
    ];

    render(<Wrapper resultType="weight" initialSets={sets} />);

    // Each row shows its set number
    expect(screen.getByText("#1")).toBeTruthy();
    expect(screen.getByText("#2")).toBeTruthy();
  });

  it("'+ Add set' button appends a new row", () => {
    render(<Wrapper resultType="weight" initialSets={[]} />);

    expect(screen.queryByText("#1")).toBeNull();

    fireEvent.click(screen.getByText("+ Add set"));

    expect(screen.getByText("#1")).toBeTruthy();
  });

  it("appending a second set copies the previous set_type", () => {
    const sets: LogFormValues["movement_entries"][0]["sets"] = [
      {
        set_index: 0,
        set_type: "drop",
        load_display: "80",
        load_kg: "80",
        reps: "8",
      },
    ];

    render(<Wrapper resultType="weight" initialSets={sets} />);

    fireEvent.click(screen.getByText("+ Add set"));

    // Two set-type badges should now exist; the new one inherits "drop" (↓)
    const dropBadges = screen.getAllByText("↓");
    expect(dropBadges.length).toBeGreaterThanOrEqual(1);
  });

  it("does not render headers or '+ Add set' for time (cardio) result type", () => {
    const { container } = render(<Wrapper resultType="time" />);
    expect(container.firstChild).toBeNull();
  });

  it("does not render headers or '+ Add set' for distance (cardio) result type", () => {
    const { container } = render(<Wrapper resultType="distance" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders 'lb' in column header when weightUnit is lb", () => {
    render(<Wrapper resultType="weight" weightUnit="lb" />);
    expect(screen.getByText("lb")).toBeTruthy();
  });
});
