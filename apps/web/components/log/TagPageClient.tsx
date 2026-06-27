"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api/client";
import type { Movement, LastResult } from "@/lib/api";
import { timeTextToSeconds } from "@/lib/time";
import {
  logFormSchema,
  type LogFormValues,
  type SetEntryValues,
} from "./schema";
import { ResultFields, type ResultTypeValue } from "./ResultFields";
import { MovementChips } from "./MovementChips";
import { MovementSearch } from "@/components/workout/MovementSearch";
import {
  buildTagLabel,
  computePrStatus,
  writeRecentMovements,
  type RecentMovement,
} from "@/lib/tag";
import { relativeDate } from "@/lib/display";

const today = new Date().toISOString().slice(0, 10);

const EMPTY_SET: SetEntryValues = {
  set_index: 0,
  set_type: "working",
  load_kg: "",
  load_display: "",
  reps: "",
  time_text: "",
  distance_m: "",
  rounds: "",
  partial_reps: "",
  calories: "",
  height_cm: "",
  watts: "",
  pace_text: "",
  variant_annotation: "",
};

function toISOLocal(dateStr: string): string {
  if (dateStr.includes("T")) return dateStr;
  return `${dateStr}T00:00:00Z`;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface TagPageClientProps {
  accessToken: string;
  prefillMovement?: Movement | null;
  prefillLastResult?: LastResult | null;
}

export function TagPageClient({
  accessToken,
  prefillMovement,
  prefillLastResult,
}: TagPageClientProps) {
  const router = useRouter();

  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(
    prefillMovement ?? null,
  );
  // undefined = loading, null = no prior result, LastResult = loaded
  const [lastResult, setLastResult] = useState<LastResult | null | undefined>(
    prefillMovement != null ? prefillLastResult ?? null : undefined,
  );
  const [noteOpen, setNoteOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  const fetchingRef = useRef<string | null>(null);

  const resultType: ResultTypeValue =
    (lastResult?.result_type as ResultTypeValue | undefined) ?? "weight";

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { isSubmitting },
  } = useForm<LogFormValues>({
    resolver: zodResolver(logFormSchema) as Resolver<LogFormValues>,
    defaultValues: {
      performed_at: today,
      notes: "",
      movement_entries: [
        {
          movement_id: prefillMovement?.id ?? undefined,
          movement_name: prefillMovement?.name ?? undefined,
          modality: undefined,
          result_type:
            (prefillLastResult?.result_type as LogFormValues["movement_entries"][number]["result_type"]) ??
            "weight",
          sets: [EMPTY_SET],
          order_index: 0,
        },
      ],
    },
  });

  // Watch the first movement entry's sets; extract [0] for live PR feedback
  const watchedSets = useWatch({
    control,
    name: "movement_entries.0.sets",
  });
  const resultValues = Array.isArray(watchedSets) ? watchedSets[0] : undefined;

  const noteValue = useWatch({ control, name: "notes" });

  // Sync result_type into form when lastResult changes
  useEffect(() => {
    if (lastResult && lastResult.result_type) {
      setValue(
        "movement_entries.0.result_type",
        lastResult.result_type as LogFormValues["movement_entries"][number]["result_type"],
      );
    }
  }, [lastResult, setValue]);

  async function fetchLastResult(movementId: string) {
    fetchingRef.current = movementId;
    setLastResult(undefined);
    try {
      const lr = await api.movements.lastResult(accessToken, movementId);
      if (fetchingRef.current === movementId) {
        setLastResult(lr);
      }
    } catch {
      if (fetchingRef.current === movementId) {
        setLastResult(null);
      }
    }
  }

  function applyMovementSelection(
    movement: Movement,
    knownLastResult?: LastResult | null,
  ) {
    setSelectedMovement(movement);
    setValue("movement_entries.0.movement_id", movement.id);
    setValue("movement_entries.0.movement_name", movement.name);
    // Reset sets[0] to empty values
    setValue("movement_entries.0.sets", [EMPTY_SET]);

    if (knownLastResult !== undefined) {
      setLastResult(knownLastResult);
    } else {
      fetchLastResult(movement.id);
    }
  }

  function handleChipSelect(m: RecentMovement) {
    applyMovementSelection({
      id: m.movement_id,
      name: m.movement_name,
    } as Movement);
  }

  function handleSearchSelect(m: Movement) {
    applyMovementSelection(m);
    setSearchFocused(false);
  }

  function handleFill(r: LastResult) {
    setValue("movement_entries.0.sets", [
      {
        ...EMPTY_SET,
        load_kg: r.load_kg != null ? String(r.load_kg) : "",
        load_display: r.load_kg != null ? String(r.load_kg) : "",
        reps: r.reps != null ? String(r.reps) : "",
        time_text: r.time_s != null ? formatTime(r.time_s) : "",
        distance_m: r.distance_m != null ? String(r.distance_m) : "",
        rounds: r.rounds != null ? String(r.rounds) : "",
        partial_reps: r.partial_reps != null ? String(r.partial_reps) : "",
        calories: r.calories != null ? String(r.calories) : "",
        watts: r.watts != null ? String(r.watts) : "",
      },
    ]);
  }

  async function onSubmit(values: LogFormValues) {
    if (!selectedMovement) return;
    setSubmitError(null);
    try {
      const entry = values.movement_entries[0]!;
      const set = entry.sets[0];
      const resultRow = {
        movement_id: entry.movement_id ?? undefined,
        result_type: entry.result_type,
        load_kg: set?.load_kg ? Number(set.load_kg) : undefined,
        reps: set?.reps ? parseInt(set.reps, 10) : undefined,
        time_s: set?.time_text
          ? timeTextToSeconds(set.time_text) ?? undefined
          : undefined,
        distance_m: set?.distance_m ? Number(set.distance_m) : undefined,
        rounds: set?.rounds ? parseInt(set.rounds, 10) : undefined,
        partial_reps: set?.partial_reps
          ? parseInt(set.partial_reps, 10)
          : undefined,
        calories: set?.calories ? parseInt(set.calories, 10) : undefined,
        height_cm: set?.height_cm ? Number(set.height_cm) : undefined,
        watts: set?.watts ? parseInt(set.watts, 10) : undefined,
        pace_s: set?.pace_text
          ? timeTextToSeconds(set.pace_text) ?? undefined
          : undefined,
        notes: values.notes || undefined,
        order_index: 0,
        is_pr: false,
        pace_distance_m: 500,
      };

      const body = {
        performed_at: toISOLocal(values.performed_at),
        is_tag: true,
        results: [resultRow],
      };

      await api.workouts.create(accessToken, body);

      writeRecentMovements(
        selectedMovement.id,
        selectedMovement.name,
        resultType,
      );
      router.push("/history");
    } catch {
      setSubmitError("Failed to save milestone. Please try again.");
    }
  }

  const prStatus = computePrStatus(resultType, resultValues, lastResult);
  const buttonLabel = buildTagLabel(
    selectedMovement?.name,
    resultType,
    resultValues,
  );

  const isSubmitReady = (() => {
    if (!selectedMovement) return false;
    const v = resultValues;
    if (!v) return false;
    return (
      (resultType === "weight" && !!v.load_kg) ||
      (resultType === "reps" && !!v.reps) ||
      (resultType === "time" && !!v.time_text) ||
      (resultType === "distance" && !!v.distance_m) ||
      (resultType === "calories" && !!v.calories) ||
      (resultType === "rounds_reps" && !!v.rounds) ||
      (resultType === "watts" && !!v.watts) ||
      (resultType === "height" && !!v.height_cm) ||
      (resultType === "pace" && !!v.pace_text)
    );
  })();

  // Format current best for display
  const currentBestDisplay = (() => {
    if (!lastResult) return null;
    const r = lastResult;
    switch (r.result_type) {
      case "weight": {
        const load = r.load_kg != null ? String(r.load_kg) : null;
        if (!load) return null;
        return r.reps != null ? `${load} kg × ${r.reps}` : `${load} kg`;
      }
      case "reps":
        return r.reps != null ? `${r.reps} reps` : null;
      case "time": {
        if (r.time_s == null) return null;
        return formatTime(r.time_s);
      }
      case "distance":
        return r.distance_m != null ? `${r.distance_m} m` : null;
      case "calories":
        return r.calories != null ? `${r.calories} cal` : null;
      case "rounds_reps":
        if (r.rounds == null) return null;
        return r.partial_reps != null
          ? `${r.rounds} + ${r.partial_reps} reps`
          : `${r.rounds} rounds`;
      case "watts":
        return r.watts != null ? `${r.watts} W` : null;
      default:
        return null;
    }
  })();

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      {/* Heading */}
      <h1 className="text-xl font-semibold text-[#e6edf3]">
        <span className="font-mono text-[#8b949e] text-sm mr-2" aria-hidden>
          $
        </span>
        git tag
      </h1>
      <p className="mt-0.5 font-mono text-xs text-[#8b949e]">
        Mark a milestone
      </p>

      <form
        onSubmit={handleSubmit(onSubmit as Parameters<typeof handleSubmit>[0])}
        className="mt-6 space-y-6"
      >
        {/* Movement selection */}
        <div className="space-y-3">
          <MovementChips
            selectedId={selectedMovement?.id ?? null}
            onSelect={handleChipSelect}
            onSearchRequest={() => setSearchFocused(true)}
          />
          <MovementSearch
            accessToken={accessToken}
            onSelect={handleSearchSelect}
            initialName={selectedMovement ? undefined : "Search movements…"}
            key={searchFocused ? "focused" : "idle"}
          />
        </div>

        {/* Result entry — shown after movement selected */}
        {selectedMovement && (
          <>
            <div className="border-t border-[#30363d]" aria-hidden />

            <div className="space-y-3">
              {/* Movement heading + current best */}
              <div>
                <p className="font-medium text-[#e6edf3]">
                  {selectedMovement.name}
                </p>
                <div className="min-h-[1.25rem] mt-1">
                  {lastResult === undefined && (
                    <span className="font-mono text-xs text-[#8b949e]">
                      Loading…
                    </span>
                  )}
                  {lastResult !== undefined &&
                    lastResult !== null &&
                    currentBestDisplay && (
                      <button
                        type="button"
                        onClick={() => handleFill(lastResult)}
                        className="font-mono text-xs text-[#8b949e] hover:text-[#e6edf3] transition-colors"
                        title="Tap to auto-fill"
                      >
                        Current best&nbsp;&nbsp;{currentBestDisplay}
                        {" · "}
                        {relativeDate(lastResult.performed_at)}
                      </button>
                    )}
                </div>
              </div>

              {/* Result fields */}
              <ResultFields
                index={0}
                resultType={resultType}
                register={register}
                fieldPrefix="movement_entries.0.sets.0"
              />

              {/* Dynamic PR feedback */}
              <div role="status" aria-live="polite" className="min-h-[1.25rem]">
                {prStatus === "new-pr" && (
                  <p className="font-mono text-xs text-[#3fb950]">
                    ⬆&nbsp; New PR
                  </p>
                )}
                {prStatus === "matches" && (
                  <p className="font-mono text-xs text-[#8b949e]">
                    = Matches your current best
                  </p>
                )}
                {prStatus === "below" && currentBestDisplay && (
                  <p className="font-mono text-xs text-[#d29922]">
                    ⚠&nbsp; Below current best ({currentBestDisplay})
                  </p>
                )}
                {prStatus === "first" && (
                  <p className="font-mono text-xs text-[#58a6ff]">
                    ★&nbsp; First log for this movement
                  </p>
                )}
              </div>
            </div>

            {/* Optional note */}
            <div className="space-y-2">
              {!noteOpen ? (
                <button
                  type="button"
                  onClick={() => setNoteOpen(true)}
                  className="font-mono text-xs text-[#58a6ff] hover:text-[#58a6ff]/80 transition-colors"
                >
                  + Add note
                </button>
              ) : (
                <div className="space-y-1">
                  <label
                    htmlFor="tag-note"
                    className="font-mono text-xs text-[#8b949e]"
                  >
                    Note
                  </label>
                  <input
                    id="tag-note"
                    type="text"
                    maxLength={280}
                    placeholder={`"competition", "tested cold", "post-injury"`}
                    {...register("notes")}
                    className="w-full h-9 rounded-md border border-[#30363d] bg-[#0d1117] px-3 font-mono text-sm text-[#e6edf3] placeholder:text-[#8b949e] focus:outline-none focus:ring-1 focus:ring-[#58a6ff]"
                  />
                  {noteValue && (
                    <p className="font-mono text-xs text-[#8b949e] truncate">
                      ↳ {noteValue}
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Submit */}
        <div
          className={[
            selectedMovement
              ? "sticky bottom-[calc(env(safe-area-inset-bottom)+60px)] md:static"
              : "",
          ].join("")}
        >
          <Button
            type="submit"
            disabled={!isSubmitReady || isSubmitting}
            className="w-full min-h-[48px] bg-[#58a6ff] text-[#0d1117] hover:bg-[#58a6ff]/90 font-mono text-sm disabled:opacity-40"
          >
            {isSubmitting ? "Tagging…" : buttonLabel}
          </Button>
        </div>

        {submitError && (
          <p role="alert" className="text-xs text-[#ff7b72] font-mono">
            {submitError}
          </p>
        )}
      </form>
    </div>
  );
}
