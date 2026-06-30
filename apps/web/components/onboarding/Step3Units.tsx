"use client";

import { useState } from "react";
import type { WeightUnit, DistanceUnit } from "@/lib/api";

interface SegmentedControlProps<T extends string> {
  value: T;
  options: readonly T[];
  labels: Record<T, string>;
  onChange: (v: T) => void;
}

function SegmentedControl<T extends string>({
  value,
  options,
  labels,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div
      className="flex rounded-[10px] p-[3px]"
      style={{
        background: "var(--background)",
        border: "1px solid var(--border)",
      }}
    >
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            aria-pressed={active}
            className="flex-1 rounded-[8px] px-4 py-[7px] text-[14px] font-semibold transition-all duration-150"
            style={{
              background: active ? "var(--accent)" : "transparent",
              color: active ? "#0A0D12" : "var(--muted)",
            }}
          >
            {labels[opt]}
          </button>
        );
      })}
    </div>
  );
}

interface Props {
  defaultWeightUnit?: WeightUnit;
  defaultDistanceUnit?: DistanceUnit;
  onNext: (units: { weight: WeightUnit; distance: DistanceUnit }) => void;
}

const WEIGHT_OPTIONS = ["lb", "kg"] as const;
const WEIGHT_LABELS: Record<WeightUnit, string> = { lb: "lb", kg: "kg" };

const DIST_OPTIONS = ["mi", "km"] as const;
const DIST_LABELS: Record<DistanceUnit, string> = { mi: "mi", km: "km" };

export function Step3Units({
  defaultWeightUnit = "lb",
  defaultDistanceUnit = "mi",
  onNext,
}: Props) {
  const [weight, setWeight] = useState<WeightUnit>(defaultWeightUnit);
  const [distance, setDistance] = useState<DistanceUnit>(defaultDistanceUnit);

  return (
    <div className="animate-fadeUp flex flex-col">
      <p className="font-data mb-2 text-[13px] text-[var(--accent)]">
        $ git config units
      </p>
      <h2
        className="font-heading mb-2 text-[28px] text-[var(--foreground)]"
        style={{ letterSpacing: "-0.6px" }}
      >
        Pick your units
      </h2>
      <p className="mb-6 text-[14px] text-[var(--muted)]">
        You can change these anytime in settings.
      </p>

      {/* Weight card */}
      <div className="mb-[14px] rounded-2xl border border-[var(--border)] bg-[var(--card)] p-[20px]">
        <div className="mb-3">
          <p className="text-[14px] font-semibold text-[var(--foreground)]">
            Weight
          </p>
          <p className="text-[11.5px] text-[var(--muted)]">
            Stored as kg, displayed in your unit
          </p>
        </div>
        <SegmentedControl
          value={weight}
          options={WEIGHT_OPTIONS}
          labels={WEIGHT_LABELS}
          onChange={setWeight}
        />
      </div>

      {/* Distance card */}
      <div className="mb-7 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-[20px]">
        <div className="mb-3">
          <p className="text-[14px] font-semibold text-[var(--foreground)]">
            Distance
          </p>
          <p className="text-[11.5px] text-[var(--muted)]">
            Miles or kilometres
          </p>
        </div>
        <SegmentedControl
          value={distance}
          options={DIST_OPTIONS}
          labels={DIST_LABELS}
          onChange={setDistance}
        />
      </div>

      <button
        onClick={() => onNext({ weight, distance })}
        className="min-h-[48px] w-full rounded-[13px] bg-[var(--accent)] py-[15px] text-[15px] font-extrabold text-[#0A0D12] transition-opacity hover:opacity-90 active:scale-[0.98]"
      >
        Continue
      </button>
    </div>
  );
}
