"use client";

import { useState, useCallback } from "react";
import type {
  UseFormRegister,
  UseFormSetValue,
  Control,
} from "react-hook-form";
import { useWatch } from "react-hook-form";
import { MovementSearch } from "@/components/workout/MovementSearch";
import { api } from "@/lib/api/client";
import type { LastResult, Movement } from "@/lib/api";
import { ResultFields, type ResultTypeValue } from "./ResultFields";
import { PrevSessionBadge } from "./PrevSessionBadge";
import type { LogFormValues } from "./schema";

interface MovementRowProps {
  index: number;
  accessToken: string;
  control: Control<LogFormValues>;
  register: UseFormRegister<LogFormValues>;
  setValue: UseFormSetValue<LogFormValues>;
  remove: (index: number) => void;
}

export function MovementRow({
  index,
  accessToken,
  control,
  register,
  setValue,
  remove,
}: MovementRowProps) {
  const [lastResult, setLastResult] = useState<LastResult | null | undefined>(
    undefined,
  );
  const [selectedName, setSelectedName] = useState<string | undefined>(
    undefined,
  );

  const resultType = useWatch({
    control,
    name: `results.${index}.result_type`,
    defaultValue: "weight",
  }) as ResultTypeValue;

  const handleMovementSelect = useCallback(
    async (m: Movement) => {
      setValue(`results.${index}.movement_id`, m.id);
      setValue(`results.${index}.movement_name`, m.name);
      setValue(
        `results.${index}.result_type`,
        (m.default_result_type as ResultTypeValue | null) ?? "weight",
      );
      setSelectedName(m.name);
      setLastResult(undefined); // clear while loading

      try {
        const r = await api.movements.lastResult(accessToken, m.id);
        setLastResult(r);
        setValue(
          `results.${index}.result_type`,
          r.result_type as ResultTypeValue,
        );
      } catch {
        setLastResult(null); // 404 or error → no prev
      }
    },
    [accessToken, index, setValue],
  );

  const handleFill = useCallback(
    (r: LastResult) => {
      if (r.load_kg != null)
        setValue(`results.${index}.load_kg`, String(r.load_kg));
      if (r.reps != null) setValue(`results.${index}.reps`, String(r.reps));
      if (r.time_s != null) {
        const m = Math.floor(r.time_s / 60);
        const s = r.time_s % 60;
        setValue(
          `results.${index}.time_text`,
          `${m}:${String(s).padStart(2, "0")}`,
        );
      }
      if (r.distance_m != null)
        setValue(`results.${index}.distance_m`, String(r.distance_m));
      if (r.rounds != null)
        setValue(`results.${index}.rounds`, String(r.rounds));
      if (r.partial_reps != null)
        setValue(`results.${index}.partial_reps`, String(r.partial_reps));
      if (r.calories != null)
        setValue(`results.${index}.calories`, String(r.calories));
      if (r.watts != null) setValue(`results.${index}.watts`, String(r.watts));
    },
    [index, setValue],
  );

  return (
    <div className="rounded-lg border border-[#30363d] bg-[#161b22] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-[#8b949e]">#{index + 1}</span>
        <div className="flex-1">
          <MovementSearch
            accessToken={accessToken}
            initialName={selectedName}
            onSelect={handleMovementSelect}
          />
        </div>
        <button
          type="button"
          onClick={() => remove(index)}
          aria-label={`Remove ${selectedName ?? "movement"} row`}
          className="ml-1 min-h-[44px] min-w-[44px] flex items-center justify-center text-[#8b949e] hover:text-[#e6edf3] transition-colors text-xl leading-none"
        >
          ×
        </button>
      </div>

      <div>
        <p className="text-xs text-[#8b949e] mb-1.5">Result</p>
        <ResultFields
          index={index}
          resultType={resultType}
          register={register}
        />
        <PrevSessionBadge lastResult={lastResult} onFill={handleFill} />
      </div>

      {/* hidden field so result_type is tracked in form state */}
      <input type="hidden" {...register(`results.${index}.result_type`)} />
    </div>
  );
}
