"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";
import type { WorkoutSummary, SessionType, WorkoutFormat } from "@/lib/api";
import { toasts } from "@/lib/toast";
import { fireInitialCommitToast } from "@/lib/pr-celebrations";
import { timeTextToSeconds } from "@/lib/time";
import { useRestTimer } from "@/lib/hooks/useRestTimer";
import { logFormSchema, type LogFormValues } from "./schema";
import { MovementRow } from "./MovementRow";
import { MovementChips } from "./MovementChips";
import { AddDetailsCollapsible } from "./AddDetailsCollapsible";
import { RestTimer } from "./RestTimer";
import { TemplatePicker } from "./TemplatePicker";
import type { RecentMovement } from "@/lib/tag";

function toISOLocal(dateStr: string): string {
  if (dateStr.includes("T")) return dateStr;
  return `${dateStr}T00:00:00Z`;
}

const today = new Date().toISOString().slice(0, 10);

interface LogPageClientProps {
  accessToken: string;
  recentWorkouts: WorkoutSummary[];
  prefillValues?: Partial<LogFormValues>;
  isFirstWorkout?: boolean;
}

export function LogPageClient({
  accessToken,
  recentWorkouts,
  prefillValues,
  isFirstWorkout = false,
}: LogPageClientProps) {
  const router = useRouter();
  const timer = useRestTimer();
  const [nlText, setNlText] = useState("");
  const [nlLoading, setNlLoading] = useState(false);
  const [nlPreview, setNlPreview] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<LogFormValues>({
    resolver: zodResolver(logFormSchema) as Resolver<LogFormValues>,
    defaultValues: {
      performed_at: today,
      movement_entries: [],
      ...prefillValues,
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "movement_entries",
  });

  const handleTemplateSelect = useCallback(
    async (w: WorkoutSummary) => {
      try {
        const full = await api.workouts.get(accessToken, w.id);
        const prefillEntries = (full.results ?? []).map((r, i) => ({
          movement_id: r.movement_id ?? undefined,
          movement_name: r.movement_name ?? undefined,
          modality: undefined as string | undefined,
          result_type:
            r.result_type as LogFormValues["movement_entries"][number]["result_type"],
          sets: [] as LogFormValues["movement_entries"][number]["sets"],
          order_index: i,
        }));
        replace(prefillEntries);
        setNlText("");
        setNlPreview(null);
      } catch {
        // ignore — template fetch failed, user can continue manually
      }
    },
    [accessToken, replace],
  );

  const handleNlParse = useCallback(async () => {
    if (nlText.trim().length < 10) return;
    setNlLoading(true);
    setNlPreview(null);
    try {
      const result = await api.coach.parseLog(accessToken, nlText);
      const entry = result.parsed;
      if (entry) {
        const preview = [
          entry.title && `Title: ${entry.title}`,
          entry.results.length > 0 &&
            `Movements: ${entry.results
              .map((r) => r.movement_name)
              .join(", ")}`,
        ]
          .filter(Boolean)
          .join(" · ");
        setNlPreview(preview || "Parsed — review below before committing");

        if (entry.title) setValue("performed_at", today);
        const prefill = entry.results.map((r, i) => ({
          movement_id: undefined as string | undefined,
          movement_name: r.movement_name,
          modality: undefined as string | undefined,
          result_type: "weight" as const,
          sets: [
            {
              set_index: 0,
              set_type: "working" as const,
              load_kg: r.load_kg != null ? String(r.load_kg) : "",
              load_display: r.load_kg != null ? String(r.load_kg) : "",
              reps: r.reps != null ? String(r.reps) : "",
              time_text:
                r.time_s != null
                  ? `${Math.floor(r.time_s / 60)}:${String(
                      r.time_s % 60,
                    ).padStart(2, "0")}`
                  : "",
              distance_m: "",
              variant_annotation: "",
            },
          ],
          order_index: i,
        }));
        replace(prefill);
      }
    } catch {
      setNlPreview("Could not parse — try describing again or log manually");
    } finally {
      setNlLoading(false);
    }
  }, [accessToken, nlText, setValue, replace]);

  async function onSubmit(values: LogFormValues) {
    setSubmitError(null);
    try {
      // Flatten movement_entries[].sets[] → API results array
      const results = values.movement_entries.flatMap((entry, entryIdx) =>
        entry.sets.map((set, setIdx) => ({
          movement_id: entry.movement_id ?? undefined,
          result_type: entry.result_type,
          load_kg: set.load_kg ? Number(set.load_kg) : undefined,
          reps: set.reps ? parseInt(set.reps, 10) : undefined,
          time_s: set.time_text
            ? timeTextToSeconds(set.time_text) ?? undefined
            : undefined,
          distance_m: set.distance_m ? Number(set.distance_m) : undefined,
          rounds: set.rounds ? parseInt(set.rounds, 10) : undefined,
          partial_reps: set.partial_reps
            ? parseInt(set.partial_reps, 10)
            : undefined,
          calories: set.calories ? parseInt(set.calories, 10) : undefined,
          height_cm: set.height_cm ? Number(set.height_cm) : undefined,
          watts: set.watts ? parseInt(set.watts, 10) : undefined,
          pace_s: set.pace_text
            ? timeTextToSeconds(set.pace_text) ?? undefined
            : undefined,
          variant_annotation: set.variant_annotation || undefined,
          order_index: entryIdx * 100 + setIdx,
          is_pr: false,
          pace_distance_m: 500,
        })),
      );

      const workout = await api.workouts.create(accessToken, {
        performed_at: toISOLocal(values.performed_at),
        title: values.title || undefined,
        session_type: (values.session_type as SessionType) || undefined,
        workout_format: (values.workout_format as WorkoutFormat) || undefined,
        notes: values.notes || undefined,
        session_rpe: values.session_rpe,
        duration_s: values.duration_min
          ? Math.round(Number(values.duration_min) * 60)
          : undefined,
        bodyweight_kg: values.bodyweight_kg
          ? Number(values.bodyweight_kg)
          : undefined,
        is_tag: false,
        results,
      });

      const hasPR = workout.results?.some((r) => r.is_pr) ?? false;

      if (isFirstWorkout) {
        fireInitialCommitToast();
        router.push("/history");
      } else if (hasPR) {
        router.push("/dashboard?pr=1");
      } else {
        toasts.workoutLogged(values.title || undefined);
        router.push("/history");
      }
    } catch {
      setSubmitError("Failed to commit workout. Please try again.");
    }
  }

  return (
    <div className="mx-auto max-w-lg md:max-w-5xl px-4 md:px-8 py-6">
      {/* Page heading — spans full width */}
      <h1 className="text-xl font-semibold text-[#e6edf3]">
        <span className="font-mono text-[#8b949e] text-sm mr-2">$</span>
        git commit --fit
      </h1>

      {/* Two-column on desktop, single column on mobile */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-[minmax(0,520px)_1fr] md:gap-10 md:items-start gap-6">
        {/* LEFT: primary form */}
        <div className="space-y-6">
          {/* NL area */}
          <div className="space-y-2">
            <label htmlFor="nl-textarea" className="text-xs text-[#8b949e]">
              Describe your workout (optional)
            </label>
            <Textarea
              id="nl-textarea"
              placeholder={
                'Describe your workout…\ne.g. "Fran in 6:45" or "5×5 back squat @ 90 kg"'
              }
              value={nlText}
              onChange={(e) => setNlText(e.target.value)}
              rows={3}
              className="bg-[#0d1117] border-[#30363d] text-[#e6edf3] text-sm placeholder:text-[#8b949e] resize-none"
            />
            {nlText.trim().length > 10 && (
              <button
                type="button"
                onClick={handleNlParse}
                disabled={nlLoading}
                className="text-xs text-[#58a6ff] hover:text-[#58a6ff]/80 transition-colors disabled:opacity-50"
              >
                {nlLoading ? "Parsing…" : "Parse & prefill →"}
              </button>
            )}
            {nlPreview && (
              <p className="text-xs text-[#8b949e] bg-[#161b22] rounded px-3 py-2 border border-[#30363d]">
                {nlPreview}
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#30363d]" />
            <span className="text-xs text-[#8b949e]">or add movements</span>
            <div className="flex-1 h-px bg-[#30363d]" />
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit(
              onSubmit as Parameters<typeof handleSubmit>[0],
            )}
            className="space-y-4"
          >
            {/* Recent movement chips — quick-add from history */}
            <MovementChips
              selectedId={null}
              onSelect={(m: RecentMovement) => {
                if (fields.length >= 10) return;
                append({
                  movement_id: m.movement_id,
                  movement_name: m.movement_name,
                  modality: m.modality,
                  result_type:
                    m.result_type as LogFormValues["movement_entries"][number]["result_type"],
                  sets: [],
                  order_index: fields.length,
                });
              }}
              onSearchRequest={() => {
                if (fields.length >= 10) return;
                append({
                  movement_id: undefined,
                  movement_name: undefined,
                  modality: undefined,
                  result_type: "weight",
                  sets: [],
                  order_index: fields.length,
                });
              }}
            />

            {/* Movement rows */}
            <div className="space-y-3">
              {fields.map((field, idx) => (
                <MovementRow
                  key={field.id}
                  index={idx}
                  accessToken={accessToken}
                  control={control}
                  register={register}
                  setValue={setValue}
                  remove={remove}
                  onSetConfirmed={timer.enabled ? timer.start : undefined}
                />
              ))}
            </div>

            {/* Add movement */}
            {fields.length < 10 && (
              <button
                type="button"
                onClick={() =>
                  append({
                    movement_id: undefined,
                    movement_name: undefined,
                    modality: undefined,
                    result_type: "weight",
                    sets: [],
                    order_index: fields.length,
                  })
                }
                className="w-full rounded-lg border border-dashed border-[#30363d] py-3 min-h-[44px] text-sm text-[#8b949e] hover:border-[#58a6ff]/60 hover:text-[#e6edf3] transition-colors"
              >
                + Add movement
              </button>
            )}

            {/* Details collapsible */}
            <AddDetailsCollapsible
              register={register}
              setValue={setValue}
              watch={watch}
              restEnabled={timer.enabled}
              onRestEnabledChange={timer.setEnabled}
              restDuration={timer.duration}
              onRestDurationChange={timer.setDuration}
            />

            {/* Error */}
            {submitError && (
              <p role="alert" className="text-xs text-[#ff7b72]">
                {submitError}
              </p>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#58a6ff] text-[#0d1117] font-semibold hover:bg-[#58a6ff]/90 disabled:opacity-60 min-h-[48px]"
            >
              {isSubmitting ? "Committing…" : "Commit workout"}
            </Button>
          </form>

          {/* Template picker — mobile only */}
          <div className="md:hidden">
            <TemplatePicker
              recentWorkouts={recentWorkouts}
              onSelect={handleTemplateSelect}
            />
          </div>
        </div>

        {/* RIGHT: desktop sidebar — recent sessions, hidden on mobile */}
        <div className="hidden md:flex md:flex-col md:gap-6 md:border-l md:border-[#30363d] md:pl-10">
          <div className="max-w-xs">
            <TemplatePicker
              recentWorkouts={recentWorkouts}
              onSelect={handleTemplateSelect}
              vertical
            />
          </div>
        </div>
      </div>

      {/* Rest timer overlay */}
      <RestTimer remaining={timer.remaining} onSkip={timer.stop} />
    </div>
  );
}
