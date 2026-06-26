import { z } from "zod";

export const RESULT_TYPE_VALUES = [
  "weight",
  "reps",
  "time",
  "distance",
  "calories",
  "height",
  "rounds_reps",
  "pace",
  "watts",
] as const;

export const setEntrySchema = z.object({
  set_index: z.number().default(0),
  set_type: z.enum(["warmup", "working", "drop"]).default("working"),
  load_display: z.string().optional(), // display value (lb or kg depending on unit)
  load_kg: z.string().optional(), // what gets stored
  reps: z.string().optional(),
  time_text: z.string().optional(),
  distance_m: z.string().optional(),
  variant_annotation: z.string().optional(), // comma-joined chips e.g. "hang,power"
});

export type SetEntry = z.infer<typeof setEntrySchema>;

const resultRowSchema = z.object({
  movement_id: z.string().uuid().optional(),
  movement_name: z.string().optional(),
  modality: z.string().optional(),
  result_type: z.enum(RESULT_TYPE_VALUES).default("weight"),
  sets: z.array(setEntrySchema).default([]),
  // All numeric fields stored as strings for clean empty handling
  // Kept for backward compat — ME-7 removes them
  load_kg: z.string().optional(),
  reps: z.string().optional(),
  time_text: z.string().optional(),
  distance_m: z.string().optional(),
  rounds: z.string().optional(),
  partial_reps: z.string().optional(),
  calories: z.string().optional(),
  height_cm: z.string().optional(),
  watts: z.string().optional(),
  pace_text: z.string().optional(),
  order_index: z.number().default(0),
});

export const logFormSchema = z.object({
  performed_at: z.string().min(1),
  title: z.string().optional(),
  session_type: z.string().optional(),
  workout_format: z.string().optional(),
  session_rpe: z.number().min(0).max(10).optional(),
  duration_min: z.string().optional(),
  notes: z.string().optional(),
  bodyweight_kg: z.string().optional(),
  location: z.string().optional(),
  results: z.array(resultRowSchema).default([]),
});

export type LogFormValues = z.infer<typeof logFormSchema>;
export type ResultRowValues = z.infer<typeof resultRowSchema>;
export type SetEntryValues = z.infer<typeof setEntrySchema>;
