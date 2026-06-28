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
import type { LastResult, Movement, PersonalRecordResult } from "@/lib/api";
import { useUserPrefs } from "@/lib/contexts/UserPrefsContext";
import { ResultFields, type ResultTypeValue } from "./ResultFields";
import { MovementVariantChips } from "./MovementVariantChips";
import { SetTable } from "./SetTable";
import { PrevSessionBadge } from "./PrevSessionBadge";
import type { LogFormValues } from "./schema";

interface MovementRowProps {
  index: number;
  accessToken: string;
  control: Control<LogFormValues>;
  register: UseFormRegister<LogFormValues>;
  setValue: UseFormSetValue<LogFormValues>;
  remove: (index: number) => void;
  onSetConfirmed?: () => void;
}

/** Result types that are mono-structural / cardio — use single ResultFields, no SetTable. */
const CARDIO_RESULT_TYPES: ResultTypeValue[] = ["time", "distance"];

function isStrengthMovement(
  resultType: ResultTypeValue,
  modality: string | undefined,
): boolean {
  if (modality === "mono_structural") return false;
  if (CARDIO_RESULT_TYPES.includes(resultType)) return false;
  return true;
}

export function MovementRow({
  index,
  accessToken,
  control,
  register,
  setValue,
  remove,
  onSetConfirmed,
}: MovementRowProps) {
  const { weightUnit, distanceUnit } = useUserPrefs();
  const [lastResult, setLastResult] = useState<LastResult | null | undefined>(
    undefined,
  );
  const [selectedName, setSelectedName] = useState<string | undefined>(
    undefined,
  );
  const [modality, setModality] = useState<string | undefined>(undefined);
  const [prThreshold, setPrThreshold] = useState<number | null>(null);
  const [variantAnnotation, setVariantAnnotation] = useState<string>("");

  const resultType = useWatch({
    control,
    name: `movement_entries.${index}.result_type`,
    defaultValue: "weight",
  }) as ResultTypeValue;

  const handleMovementSelect = useCallback(
    async (m: Movement) => {
      setValue(`movement_entries.${index}.movement_id`, m.id);
      setValue(`movement_entries.${index}.movement_name`, m.name);
      setValue(`movement_entries.${index}.modality`, m.modality ?? undefined);
      setValue(
        `movement_entries.${index}.result_type`,
        (m.default_result_type as ResultTypeValue | null) ?? "weight",
      );
      setSelectedName(m.name);
      setModality(m.modality ?? undefined);
      setLastResult(undefined); // clear while loading
      setPrThreshold(null);
      setVariantAnnotation("");

      // Parallel: fetch lastResult + personalRecord
      try {
        const [resultData, prData] = await Promise.allSettled([
          api.movements.lastResult(accessToken, m.id),
          api.movements.personalRecord(accessToken, m.id),
        ]);

        if (resultData.status === "fulfilled") {
          const r = resultData.value;
          setLastResult(r);
          setValue(
            `movement_entries.${index}.result_type`,
            r.result_type as ResultTypeValue,
          );

          const rType = r.result_type as ResultTypeValue;
          const isStrength = isStrengthMovement(rType, m.modality ?? undefined);

          if (isStrength) {
            // Pre-populate sets[0] for strength movements
            setValue(`movement_entries.${index}.sets`, [
              {
                set_index: 0,
                set_type: "working",
                load_display:
                  weightUnit === "lb" && r.load_kg != null
                    ? String(Math.round(Number(r.load_kg) * 2.20462 * 10) / 10)
                    : r.load_kg != null
                      ? String(r.load_kg)
                      : "",
                load_kg: r.load_kg != null ? String(r.load_kg) : "",
                reps: r.reps != null ? String(r.reps) : "",
                time_text: "",
                distance_m: "",
                variant_annotation: "",
              },
            ]);
          } else {
            // Cardio: initialize sets[0] as empty so the flatten works
            setValue(`movement_entries.${index}.sets`, [
              {
                set_index: 0,
                set_type: "working",
                time_text:
                  r.time_s != null
                    ? `${Math.floor(r.time_s / 60)}:${String(
                        r.time_s % 60,
                      ).padStart(2, "0")}`
                    : "",
                distance_m: r.distance_m != null ? String(r.distance_m) : "",
                variant_annotation: "",
              },
            ]);
          }
        } else {
          setLastResult(null);
          // For cardio with no last result, still initialize sets[0]
          if (m.modality === "mono_structural") {
            setValue(`movement_entries.${index}.sets`, [
              {
                set_index: 0,
                set_type: "working",
                time_text: "",
                distance_m: "",
                variant_annotation: "",
              },
            ]);
          }
        }

        if (prData.status === "fulfilled" && prData.value != null) {
          const pr = prData.value as PersonalRecordResult;
          const threshold =
            pr.estimated_1rm_kg != null ? Number(pr.estimated_1rm_kg) : null;
          setPrThreshold(threshold);
        }
      } catch {
        setLastResult(null);
      }
    },
    [accessToken, index, setValue, weightUnit],
  );

  const handleFill = useCallback(
    (r: LastResult) => {
      setValue(`movement_entries.${index}.sets`, [
        {
          set_index: 0,
          set_type: "working",
          load_display:
            weightUnit === "lb" && r.load_kg != null
              ? String(Math.round(Number(r.load_kg) * 2.20462 * 10) / 10)
              : r.load_kg != null
                ? String(r.load_kg)
                : "",
          load_kg: r.load_kg != null ? String(r.load_kg) : "",
          reps: r.reps != null ? String(r.reps) : "",
          time_text:
            r.time_s != null
              ? `${Math.floor(r.time_s / 60)}:${String(r.time_s % 60).padStart(
                  2,
                  "0",
                )}`
              : "",
          distance_m: r.distance_m != null ? String(r.distance_m) : "",
          variant_annotation: "",
        },
      ]);
    },
    [index, setValue, weightUnit],
  );

  const showStrengthUI = isStrengthMovement(resultType, modality);
  const cardioFieldPrefix = `movement_entries.${index}.sets.0`;

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

      {showStrengthUI ? (
        <div className="space-y-2">
          <MovementVariantChips
            value={variantAnnotation}
            onChange={setVariantAnnotation}
            modality={modality}
          />
          <SetTable
            movementIndex={index}
            control={control}
            setValue={setValue}
            resultType={resultType}
            weightUnit={weightUnit}
            prThreshold={prThreshold}
            onSetConfirmed={onSetConfirmed}
          />
        </div>
      ) : (
        <div>
          <p className="text-xs text-[#8b949e] mb-1.5">Result</p>
          <ResultFields
            index={index}
            resultType={resultType}
            register={register}
            weightUnit={weightUnit}
            setValue={setValue}
            isCardioCompound={modality === "mono_structural"}
            fieldPrefix={cardioFieldPrefix}
          />
          <PrevSessionBadge
            lastResult={lastResult}
            onFill={handleFill}
            distanceUnit={distanceUnit}
          />
        </div>
      )}

      {/* hidden field so result_type is tracked in form state */}
      <input
        type="hidden"
        {...register(`movement_entries.${index}.result_type`)}
      />
    </div>
  );
}
