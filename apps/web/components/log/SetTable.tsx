"use client";

import { useFieldArray } from "react-hook-form";
import type {
  Control,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import { SetRow } from "./SetRow";
import type { LogFormValues } from "./schema";
import type { ResultTypeValue } from "./ResultFields";

interface SetTableProps {
  movementIndex: number;
  control: Control<LogFormValues>;
  register: UseFormRegister<LogFormValues>;
  setValue: UseFormSetValue<LogFormValues>;
  resultType: ResultTypeValue;
  weightUnit: "kg" | "lb";
  prThreshold: number | null; // from personalRecord API (estimated_1rm_kg)
}

const CARDIO_TYPES: ResultTypeValue[] = ["time", "distance"];

export function SetTable({
  movementIndex,
  control,
  setValue,
  resultType,
  weightUnit,
  prThreshold,
}: SetTableProps) {
  const { fields, append } = useFieldArray({
    control,
    name: `results.${movementIndex}.sets`,
  });

  const isCardio = CARDIO_TYPES.includes(resultType);

  if (isCardio) return null;

  function handleAddSet() {
    const prev = fields[fields.length - 1];
    append({
      set_index: fields.length,
      set_type: prev?.set_type ?? "working",
      load_display: prev?.load_display ?? "",
      load_kg: prev?.load_kg ?? "",
      reps: prev?.reps ?? "",
      time_text: "",
      distance_m: "",
      variant_annotation: "",
    });
  }

  return (
    <div className="space-y-2">
      {/* Column headers */}
      <div className="grid grid-cols-[2rem_1fr_1fr_2.5rem_auto] gap-2 items-center text-xs font-mono text-[#8b949e] px-1">
        <span className="text-right">Set</span>
        <span>{weightUnit}</span>
        <span>Reps</span>
        <span>Type</span>
        <span>1RM</span>
      </div>

      {/* Set rows */}
      {fields.map((field, i) => {
        const loadDisplay = field.load_display ?? "";
        const reps = field.reps ?? "";
        const setType = field.set_type ?? "working";

        const loadKg =
          weightUnit === "lb"
            ? Number(loadDisplay) / 2.20462
            : Number(loadDisplay);
        const repsNum = isNaN(parseInt(reps, 10)) ? null : parseInt(reps, 10);
        const estimatedOneRM =
          loadKg && repsNum && repsNum > 0 && repsNum <= 10
            ? Math.round(loadKg * (1 + repsNum / 30))
            : null;

        return (
          <SetRow
            key={field.id}
            setNumber={i + 1}
            setType={setType}
            loadDisplay={loadDisplay}
            reps={reps}
            weightUnit={weightUnit}
            onSetTypeChange={(t) =>
              setValue(`results.${movementIndex}.sets.${i}.set_type`, t)
            }
            onLoadChange={(v) => {
              setValue(`results.${movementIndex}.sets.${i}.load_display`, v);
              // Convert to kg for storage
              const kg = weightUnit === "lb" ? String(Number(v) / 2.20462) : v;
              setValue(`results.${movementIndex}.sets.${i}.load_kg`, kg);
            }}
            onRepsChange={(v) =>
              setValue(`results.${movementIndex}.sets.${i}.reps`, v)
            }
            prThreshold={prThreshold}
            estimatedOneRM={estimatedOneRM}
            setTypeBadgeForPR={setType}
          />
        );
      })}

      {/* Add set button */}
      <button
        type="button"
        onClick={handleAddSet}
        className="text-xs font-mono text-[#58a6ff] hover:text-[#e6edf3] transition-colors py-1 px-1"
      >
        + Add set
      </button>
    </div>
  );
}
