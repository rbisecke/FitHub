"use client";

import type { UseFormRegister } from "react-hook-form";
import { Input } from "@/components/ui/input";
import type { LogFormValues } from "./schema";

export type ResultTypeValue =
  | "weight"
  | "reps"
  | "time"
  | "distance"
  | "calories"
  | "height"
  | "rounds_reps"
  | "pace"
  | "watts";

const INPUT_CLS =
  "h-9 bg-[#0d1117] border-[#30363d] text-[#e6edf3] font-mono text-sm placeholder:text-[#8b949e]";

interface ResultFieldsProps {
  index: number;
  resultType: ResultTypeValue;
  register: UseFormRegister<LogFormValues>;
}

export function ResultFields({
  index,
  resultType,
  register,
}: ResultFieldsProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = (field: string) => register(`results.${index}.${field}` as any);

  if (resultType === "weight") {
    return (
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type="number"
            step={0.5}
            min={0}
            max={1000}
            placeholder="95"
            {...r("load_kg")}
            className={`${INPUT_CLS} pr-8`}
          />
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-[#8b949e]">
            kg
          </span>
        </div>
        <Input
          type="number"
          min={1}
          max={9999}
          placeholder="5"
          {...r("reps")}
          className={`${INPUT_CLS} w-20`}
        />
      </div>
    );
  }

  if (resultType === "reps") {
    return (
      <Input
        type="number"
        min={1}
        max={9999}
        placeholder="42"
        {...r("reps")}
        className={INPUT_CLS}
      />
    );
  }

  if (resultType === "time") {
    return (
      <Input
        type="text"
        inputMode="numeric"
        placeholder="6:32"
        {...r("time_text")}
        className={INPUT_CLS}
      />
    );
  }

  if (resultType === "distance") {
    return (
      <div className="relative">
        <Input
          type="number"
          min={0.01}
          placeholder="5000"
          {...r("distance_m")}
          className={`${INPUT_CLS} pr-6`}
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-[#8b949e]">
          m
        </span>
      </div>
    );
  }

  if (resultType === "calories") {
    return (
      <Input
        type="number"
        min={1}
        placeholder="84"
        {...r("calories")}
        className={INPUT_CLS}
      />
    );
  }

  if (resultType === "rounds_reps") {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          placeholder="8"
          {...r("rounds")}
          className={`${INPUT_CLS} w-20`}
        />
        <span className="font-mono text-xs text-[#8b949e]">+</span>
        <Input
          type="number"
          min={0}
          placeholder="14"
          {...r("partial_reps")}
          className={`${INPUT_CLS} w-20`}
        />
        <span className="font-mono text-xs text-[#8b949e]">reps</span>
      </div>
    );
  }

  if (resultType === "watts") {
    return (
      <div className="relative">
        <Input
          type="number"
          min={1}
          placeholder="312"
          {...r("watts")}
          className={`${INPUT_CLS} pr-6`}
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-[#8b949e]">
          W
        </span>
      </div>
    );
  }

  if (resultType === "height") {
    return (
      <div className="relative">
        <Input
          type="number"
          min={1}
          placeholder="60"
          {...r("height_cm")}
          className={`${INPUT_CLS} pr-8`}
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-[#8b949e]">
          cm
        </span>
      </div>
    );
  }

  if (resultType === "pace") {
    return (
      <Input
        type="text"
        inputMode="numeric"
        placeholder="2:05"
        {...r("pace_text")}
        className={INPUT_CLS}
      />
    );
  }

  return null;
}
