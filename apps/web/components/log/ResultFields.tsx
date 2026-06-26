"use client";

import { useState, useMemo } from "react";
import type { UseFormRegister, UseFormSetValue } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { parseTimeInput, timeTextToSeconds } from "@/lib/time";
import { fmtPace } from "@/lib/distance";
import { useUserPrefs } from "@/lib/contexts/UserPrefsContext";
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
  weightUnit?: "kg" | "lb";
  setValue?: UseFormSetValue<LogFormValues>;
  isCardioCompound?: boolean;
}

export function ResultFields({
  index,
  resultType,
  register,
  weightUnit = "kg",
  setValue,
  isCardioCompound = false,
}: ResultFieldsProps) {
  const { distanceUnit } = useUserPrefs();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = (field: string) => register(`results.${index}.${field}` as any);

  // Local state for cardio compound pace computation
  const [cardioDistance, setCardioDistance] = useState("");
  const [cardioTime, setCardioTime] = useState("");

  const paceLabel = useMemo(() => {
    const dist = Number(cardioDistance);
    const timeS = timeTextToSeconds(cardioTime);
    if (!dist || !timeS) return null;
    return fmtPace(timeS, dist, distanceUnit);
  }, [cardioDistance, cardioTime, distanceUnit]);

  // Cardio compound branch — distance + time stacked + read-only pace
  if (isCardioCompound) {
    const distReg = r("distance_m");
    const timeRegCardio = r("time_text");

    return (
      <div className="space-y-2">
        <div className="relative">
          <Input
            type="number"
            min={0.01}
            placeholder="2000"
            aria-label="Distance in metres"
            {...distReg}
            onChange={(e) => {
              setCardioDistance(e.target.value);
              distReg.onChange(e);
            }}
            className={`${INPUT_CLS} pr-6`}
          />
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-[#8b949e]">
            m
          </span>
        </div>
        <div>
          <Input
            type="text"
            inputMode="numeric"
            placeholder="7:12"
            aria-label="Time (mm:ss)"
            {...timeRegCardio}
            onChange={(e) => {
              setCardioTime(e.target.value);
              timeRegCardio.onChange(e);
            }}
            onBlur={(e) => {
              const normalised = parseTimeInput(e.target.value);
              setCardioTime(normalised);
              if (setValue) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setValue(`results.${index}.time_text` as any, normalised);
              }
              timeRegCardio.onBlur(e);
            }}
            className={INPUT_CLS}
          />
        </div>
        {paceLabel && (
          <p className="font-mono text-xs text-[#8b949e]">{paceLabel}</p>
        )}
      </div>
    );
  }

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
            aria-label={`Weight in ${weightUnit}`}
            {...r("load_kg")}
            className={`${INPUT_CLS} pr-8`}
          />
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-[#8b949e]">
            {weightUnit}
          </span>
        </div>
        <Input
          type="number"
          min={1}
          max={9999}
          placeholder="5"
          aria-label="Repetitions"
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
        aria-label="Repetitions"
        {...r("reps")}
        className={INPUT_CLS}
      />
    );
  }

  if (resultType === "time") {
    const timeReg = r("time_text");
    return (
      <Input
        type="text"
        inputMode="numeric"
        placeholder="6:32"
        aria-label="Time (mm:ss)"
        {...timeReg}
        onBlur={(e) => {
          const normalised = parseTimeInput(e.target.value);
          if (setValue) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setValue(`results.${index}.time_text` as any, normalised);
          }
          timeReg.onBlur(e);
        }}
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
          aria-label="Distance in metres"
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
        aria-label="Calories"
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
          aria-label="Rounds"
          {...r("rounds")}
          className={`${INPUT_CLS} w-20`}
        />
        <span className="font-mono text-xs text-[#8b949e]">+</span>
        <Input
          type="number"
          min={0}
          placeholder="14"
          aria-label="Partial reps"
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
          aria-label="Power in watts"
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
          aria-label="Height in cm"
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
        aria-label="Pace per 500m (mm:ss)"
        {...r("pace_text")}
        className={INPUT_CLS}
      />
    );
  }

  return null;
}
