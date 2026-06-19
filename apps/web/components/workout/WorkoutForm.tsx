"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useForm,
  useFieldArray,
  Controller,
  type Resolver,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api/client";
import { MovementSearch } from "./MovementSearch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FORMAT_LABELS,
  SESSION_LABELS,
  RESULT_TYPE_LABELS,
} from "@/lib/display";
import type { ResultType, SessionType, WorkoutFormat } from "@/lib/api/types";

const RESULT_TYPES: ResultType[] = [
  "weight",
  "reps",
  "time",
  "distance",
  "calories",
  "height",
  "rounds_reps",
  "pace",
  "watts",
];

const SESSION_TYPES: SessionType[] = [
  "strength",
  "metcon",
  "skill",
  "mixed",
  "rest",
  "deload",
  "active_recovery",
];

const WORKOUT_FORMATS: WorkoutFormat[] = [
  "strength",
  "amrap",
  "emom",
  "for_time",
  "tabata",
  "intervals",
  "chipper",
  "benchmark",
  "open",
  "partner",
  "team",
];

// URL-encoded SVG chevron for custom select arrow (zinc-500 colour)
const CHEVRON_STYLE: React.CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none'%3E%3Cpath d='M4 6l4 4 4-4' stroke='%238b949e' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 0.5rem center",
  backgroundSize: "1rem 1rem",
};

const SELECT_BASE =
  "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 pr-8 text-sm text-zinc-200 focus:border-zinc-500 focus:outline-none appearance-none";

const SELECT_SM =
  "rounded border border-zinc-700 bg-zinc-900 px-2 py-1 pr-6 text-xs text-zinc-200 focus:outline-none appearance-none";

const resultSchema = z.object({
  movement_id: z.string().uuid().optional(),
  movement_name: z.string().optional(),
  result_type: z.enum([
    "weight",
    "reps",
    "time",
    "distance",
    "calories",
    "height",
    "rounds_reps",
    "pace",
    "watts",
  ] as const),
  load_kg: z.string().optional(),
  reps: z.coerce.number().int().positive().optional(),
  time_s: z.coerce.number().positive().optional(),
  notes: z.string().optional(),
  order_index: z.number().optional(),
});

const formSchema = z.object({
  performed_at: z.string().min(1, "Date is required"),
  title: z.string().optional(),
  session_type: z.string().optional(),
  workout_format: z.string().optional(),
  notes: z.string().optional(),
  session_rpe: z.coerce.number().min(0).max(10).optional().or(z.literal("")),
  duration_min: z.coerce.number().positive().optional().or(z.literal("")),
  location: z.string().optional(),
  bodyweight_kg: z.coerce
    .number()
    .positive()
    .max(600)
    .optional()
    .or(z.literal("")),
  results: z.array(resultSchema).default([]),
});

type FormValues = z.infer<typeof formSchema>;

function toISOLocal(dateStr: string): string {
  if (dateStr.includes("T")) return dateStr;
  return `${dateStr}T00:00:00Z`;
}

export function WorkoutForm({
  accessToken,
  initialValues,
  workoutId,
}: {
  accessToken: string;
  initialValues?: Partial<FormValues>;
  workoutId?: string;
}) {
  const router = useRouter();
  const [showDetails, setShowDetails] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as Resolver<FormValues>,
    defaultValues: {
      performed_at:
        initialValues?.performed_at ?? new Date().toISOString().slice(0, 10),
      results: initialValues?.results ?? [],
      ...initialValues,
    },
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: "results",
  });

  async function onSubmit(values: FormValues) {
    const body = {
      performed_at: toISOLocal(values.performed_at),
      title: values.title || undefined,
      session_type: (values.session_type as SessionType) || undefined,
      workout_format: (values.workout_format as WorkoutFormat) || undefined,
      notes: values.notes || undefined,
      session_rpe:
        values.session_rpe !== "" && values.session_rpe != null
          ? Number(values.session_rpe)
          : undefined,
      duration_s:
        values.duration_min !== "" && values.duration_min != null
          ? Math.round(Number(values.duration_min) * 60)
          : undefined,
      location: values.location || undefined,
      bodyweight_kg:
        values.bodyweight_kg !== "" && values.bodyweight_kg != null
          ? Number(values.bodyweight_kg)
          : undefined,
      results: values.results.map((r, i) => ({
        movement_id: r.movement_id,
        result_type: r.result_type,
        load_kg: r.load_kg ? Number(r.load_kg) : undefined,
        reps: r.reps,
        time_s: r.time_s,
        notes: r.notes || undefined,
        order_index: i,
      })),
    };

    const workout = workoutId
      ? await api.workouts.patch(accessToken, workoutId, body)
      : await api.workouts.create(accessToken, body);
    router.push(`/history/${workout.id}`);
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit as Parameters<typeof handleSubmit>[0])}
      className="p-6 max-w-xl mx-auto space-y-5"
    >
      <h1 className="text-lg font-semibold text-zinc-100">
        <span className="font-mono text-zinc-500 text-sm mr-2">$</span>
        {workoutId ? "git commit --amend" : "git commit --fit"}
      </h1>

      {/* Date */}
      <div className="space-y-1">
        <Label htmlFor="performed_at" className="text-zinc-300 text-xs">
          Date
        </Label>
        <Input
          id="performed_at"
          type="date"
          {...register("performed_at")}
          className="bg-zinc-900 border-zinc-700 text-zinc-100"
        />
        {errors.performed_at && (
          <p className="text-xs text-red-400">{errors.performed_at.message}</p>
        )}
      </div>

      {/* Title */}
      <div className="space-y-1">
        <Label htmlFor="title" className="text-zinc-300 text-xs">
          Title
        </Label>
        <Input
          id="title"
          placeholder="e.g. Fran, 21-15-9"
          {...register("title")}
          className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
        />
      </div>

      {/* Session type + Format (two-column) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="session_type" className="text-zinc-300 text-xs">
            Session type
          </Label>
          <select
            id="session_type"
            {...register("session_type")}
            className={SELECT_BASE}
            style={CHEVRON_STYLE}
          >
            <option value="">Select…</option>
            {SESSION_TYPES.map((t) => (
              <option key={t} value={t}>
                {SESSION_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="workout_format" className="text-zinc-300 text-xs">
            Format
          </Label>
          <select
            id="workout_format"
            {...register("workout_format")}
            className={SELECT_BASE}
            style={CHEVRON_STYLE}
          >
            <option value="">Select…</option>
            {WORKOUT_FORMATS.map((f) => (
              <option key={f} value={f}>
                {FORMAT_LABELS[f]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Progressive disclosure — secondary fields */}
      <div>
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
        >
          <span>{showDetails ? "▾" : "▸"}</span>
          <span>
            {showDetails
              ? "Hide details"
              : "More details (effort, duration, location, bodyweight, notes)"}
          </span>
        </button>

        {showDetails && (
          <div className="mt-4 space-y-5">
            {/* RPE + Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="session_rpe" className="text-zinc-300 text-xs">
                  Effort (0–10)
                </Label>
                <Input
                  id="session_rpe"
                  type="number"
                  min={0}
                  max={10}
                  step={0.5}
                  placeholder="7"
                  {...register("session_rpe")}
                  className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
                />
                {errors.session_rpe && (
                  <p className="text-xs text-red-400">
                    {errors.session_rpe.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="duration_min" className="text-zinc-300 text-xs">
                  Duration (min)
                </Label>
                <Input
                  id="duration_min"
                  type="number"
                  min={1}
                  placeholder="20"
                  {...register("duration_min")}
                  className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
                />
              </div>
            </div>

            {/* Location + Bodyweight */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="location" className="text-zinc-300 text-xs">
                  Location
                </Label>
                <Input
                  id="location"
                  placeholder="Box, Home gym…"
                  {...register("location")}
                  className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
                />
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="bodyweight_kg"
                  className="text-zinc-300 text-xs"
                >
                  Bodyweight (kg)
                </Label>
                <Input
                  id="bodyweight_kg"
                  type="number"
                  min={30}
                  max={600}
                  step={0.1}
                  placeholder="80"
                  {...register("bodyweight_kg")}
                  className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <Label htmlFor="notes" className="text-zinc-300 text-xs">
                Notes
              </Label>
              <Textarea
                id="notes"
                rows={2}
                placeholder="How did it feel?"
                {...register("notes")}
                className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
              />
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-zinc-300">Results</h3>
        {fields.map((field, idx) => (
          <div
            key={field.id}
            className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 space-y-2"
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-zinc-500">
                #{idx + 1}
              </span>
              <Controller
                control={control}
                name={`results.${idx}.movement_id`}
                render={({ field: f }) => (
                  <MovementSearch
                    accessToken={accessToken}
                    initialName={
                      (fields[idx] as { movement_name?: string }).movement_name
                    }
                    onSelect={(m) => {
                      f.onChange(m.id);
                      setValue(`results.${idx}.movement_name`, m.name);
                    }}
                  />
                )}
              />
              <button
                type="button"
                onClick={() => remove(idx)}
                className="ml-auto text-zinc-500 hover:text-zinc-300 text-lg leading-none"
                aria-label="Remove set"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* Result type */}
              <select
                {...register(`results.${idx}.result_type`)}
                className={SELECT_SM}
                style={CHEVRON_STYLE}
              >
                {RESULT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {RESULT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>

              {/* Load */}
              <Input
                type="number"
                step={0.5}
                placeholder="kg"
                {...register(`results.${idx}.load_kg`)}
                className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 h-8 placeholder:text-zinc-600"
                name={`results.${idx}.load_kg`}
              />

              {/* Reps */}
              <Input
                type="number"
                placeholder="reps"
                {...register(`results.${idx}.reps`)}
                className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 h-8 placeholder:text-zinc-600"
                name={`results.${idx}.reps`}
              />
            </div>

            {/* Notes for set */}
            <Input
              placeholder="Set notes"
              {...register(`results.${idx}.notes`)}
              className="bg-zinc-900 border-zinc-700 text-xs text-zinc-200 h-7 placeholder:text-zinc-600"
            />
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            append({
              result_type: "weight",
              movement_id: undefined,
              movement_name: undefined,
              load_kg: undefined,
              reps: undefined,
              notes: undefined,
            })
          }
          className="border-zinc-700 text-zinc-400 hover:text-zinc-200"
        >
          + Add set
        </Button>
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
      >
        {isSubmitting ? "Logging…" : "Commit workout"}
      </Button>
    </form>
  );
}
