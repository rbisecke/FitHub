"use client";

import { useState, useCallback, useRef } from "react";
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
  /** When true, shows a small 'parsed' badge indicating this row was pre-populated from NL input */
  isParsed?: boolean;
}

/** Result types that are mono-structural / cardio — use single ResultFields, no SetTable. */
const CARDIO_RESULT_TYPES: ResultTypeValue[] = ["time", "distance"];

const IMPL_LIST = [
  { key: "barbell", label: "Barbell" },
  { key: "dumbbell", label: "Dumbbell" },
  { key: "kettlebell", label: "Kettlebell" },
  { key: "bodyweight", label: "Bodyweight" },
  { key: "band", label: "Band" },
  { key: "cable", label: "Cable" },
  { key: "machine", label: "Machine" },
  { key: "other", label: "Other" },
] as const;

function isStrengthMovement(
  resultType: ResultTypeValue,
  modality: string | undefined,
): boolean {
  if (modality === "mono_structural") return false;
  if (CARDIO_RESULT_TYPES.includes(resultType)) return false;
  return true;
}

function defaultImpl(
  modality: string | undefined,
  movementOverride: string | null,
): string | undefined {
  if (movementOverride) return movementOverride;
  if (!modality) return undefined;
  if (["strength", "weightlifting", "strongman"].includes(modality))
    return "barbell";
  if (["gymnastics", "plyometric"].includes(modality)) return "bodyweight";
  return undefined;
}

export function MovementRow({
  index,
  accessToken,
  control,
  register,
  setValue,
  remove,
  onSetConfirmed,
  isParsed = false,
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
  const [noteOpen, setNoteOpen] = useState(false);
  const [implement, setImplement] = useState<string | undefined>(undefined);
  const [tempo, setTempo] = useState<string>("");
  const [side, setSide] = useState<string | undefined>(undefined);
  const [limbStyle, setLimbStyle] = useState<string | null>(null);

  // keep refs to current movement id, implement, and side for re-fire callbacks
  const movementIdRef = useRef<string | undefined>(undefined);
  const implementRef = useRef<string | undefined>(undefined);
  const sideRef = useRef<string | undefined>(undefined);

  const resultType = useWatch({
    control,
    name: `movement_entries.${index}.result_type`,
    defaultValue: "weight",
  }) as ResultTypeValue;

  const fetchPrevData = useCallback(
    async (movId: string, impl: string | undefined, s: string | undefined) => {
      const [resultData, prData] = await Promise.allSettled([
        api.movements.lastResult(accessToken, movId, {
          implement: impl,
          side: s,
        }),
        api.movements.personalRecord(accessToken, movId, {
          implement: impl,
          side: s,
        }),
      ]);
      if (resultData.status === "fulfilled") {
        setLastResult(resultData.value);
      } else {
        setLastResult(null);
      }
      if (prData.status === "fulfilled" && prData.value != null) {
        const pr = prData.value as PersonalRecordResult;
        setPrThreshold(
          pr.estimated_1rm_kg != null ? Number(pr.estimated_1rm_kg) : null,
        );
      } else {
        setPrThreshold(null);
      }
    },
    [accessToken],
  );

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
      setTempo("");
      setValue(`movement_entries.${index}.tempo`, undefined);
      setNoteOpen(false);
      setValue(`movement_entries.${index}.notes`, undefined);
      setSide(undefined);
      setValue(`movement_entries.${index}.side`, undefined);
      setLimbStyle(m.limb_style ?? null);

      const impl = defaultImpl(m.modality ?? undefined, m.implement);
      setImplement(impl);
      setValue(`movement_entries.${index}.implement`, impl);
      movementIdRef.current = m.id;
      implementRef.current = impl;
      sideRef.current = undefined;

      try {
        const [resultData, prData] = await Promise.allSettled([
          api.movements.lastResult(accessToken, m.id, {
            implement: impl,
            side: undefined,
          }),
          api.movements.personalRecord(accessToken, m.id, {
            implement: impl,
            side: undefined,
          }),
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
          setPrThreshold(
            pr.estimated_1rm_kg != null ? Number(pr.estimated_1rm_kg) : null,
          );
        }
      } catch {
        setLastResult(null);
      }
    },
    [accessToken, index, setValue, weightUnit],
  );

  const handleImplementChange = useCallback(
    async (newImpl: string | undefined) => {
      setImplement(newImpl);
      setValue(`movement_entries.${index}.implement`, newImpl);
      implementRef.current = newImpl;
      const movId = movementIdRef.current;
      if (movId) {
        setLastResult(undefined);
        setPrThreshold(null);
        await fetchPrevData(movId, newImpl, sideRef.current);
      }
    },
    [index, setValue, fetchPrevData],
  );

  const handleSideChange = useCallback(
    async (newSide: string | undefined) => {
      setSide(newSide);
      setValue(`movement_entries.${index}.side`, newSide);
      sideRef.current = newSide;
      const movId = movementIdRef.current;
      if (movId) {
        setLastResult(undefined);
        setPrThreshold(null);
        await fetchPrevData(movId, implementRef.current, newSide);
      }
    },
    [index, setValue, fetchPrevData],
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
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="font-data text-xs text-[var(--muted-foreground)]">
          #{index + 1}
        </span>
        {isParsed && (
          <span className="font-data text-[10px] font-semibold px-[7px] py-[2px] rounded-full bg-[rgba(63,185,80,0.14)] border border-[rgba(63,185,80,0.35)] text-[var(--green)]">
            parsed
          </span>
        )}
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
          className="ml-1 min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors text-xl leading-none"
        >
          ×
        </button>
      </div>

      {showStrengthUI ? (
        <div className="space-y-2">
          <MovementVariantChips
            value={variantAnnotation}
            onChange={(v) => {
              setVariantAnnotation(v);
              if (!v.split(",").includes("tempo")) {
                setTempo("");
                setValue(`movement_entries.${index}.tempo`, undefined);
              }
            }}
            modality={modality}
          />
          {variantAnnotation.split(",").includes("tempo") && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-[#8b949e] shrink-0">Tempo</label>
              <input
                type="text"
                value={tempo}
                onChange={(e) => {
                  const raw = e.target.value
                    .toUpperCase()
                    .replace(/[^0-9X]/g, "")
                    .slice(0, 4);
                  setTempo(raw);
                  setValue(`movement_entries.${index}.tempo`, raw || undefined);
                }}
                placeholder="e.g. 3131"
                maxLength={4}
                className="w-24 rounded border border-[var(--border)] bg-[var(--card)] px-2 py-1 font-mono text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/40"
              />
              {tempo && (
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-[#58a6ff]/40 bg-[#58a6ff]/10 text-[#58a6ff]">
                  {tempo}
                </span>
              )}
            </div>
          )}
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
          <p className="text-xs text-[var(--muted-foreground)] mb-1.5">
            Result
          </p>
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
            weightUnit={weightUnit === "lb" ? "lb" : "kg"}
          />
        </div>
      )}

      {/* Implement picker — shown after movement selection */}
      {selectedName && (
        <div className="space-y-1.5">
          <p className="text-xs text-[#8b949e]">
            Implement · optional, applies to all sets
          </p>
          <div className="flex flex-wrap gap-1">
            {IMPL_LIST.map((item) => {
              const isSelected = implement === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() =>
                    handleImplementChange(isSelected ? undefined : item.key)
                  }
                  className={`text-xs px-2 py-0.5 rounded border font-mono cursor-pointer ${
                    isSelected
                      ? "bg-[#58a6ff]/20 border-[#58a6ff] text-[#58a6ff]"
                      : "bg-transparent border-[#30363d] text-[#8b949e]"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Side selector — unilateral / alternating movements only */}
      {selectedName &&
        (limbStyle === "unilateral" || limbStyle === "alternating") && (
          <div className="space-y-1.5">
            <p className="text-xs text-[#8b949e]">Side</p>
            <div className="flex gap-1">
              {(["left", "right", "both"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSideChange(side === s ? undefined : s)}
                  className={`text-xs px-2 py-0.5 rounded border font-mono cursor-pointer capitalize ${
                    side === s
                      ? "bg-[rgba(255,200,61,0.2)] border-[rgba(255,200,61,0.6)] text-[var(--gold)]"
                      : "bg-transparent border-[#30363d] text-[#8b949e]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

      {/* Per-result note */}
      {selectedName && (
        <div>
          {noteOpen ? (
            <div className="flex items-start gap-2">
              <textarea
                {...register(`movement_entries.${index}.notes`)}
                placeholder="Note for this result — cues, conditions, how it felt…"
                rows={2}
                className="flex-1 resize-y rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/40"
              />
              <button
                type="button"
                onClick={() => {
                  setNoteOpen(false);
                  setValue(`movement_entries.${index}.notes`, undefined);
                }}
                aria-label="Remove note"
                className="mt-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-lg leading-none"
              >
                ×
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setNoteOpen(true)}
              className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
              Add note
            </button>
          )}
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
