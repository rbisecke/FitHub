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

const resultRowSchema = z.object({
  movement_id: z.string().uuid().optional(),
  movement_name: z.string().optional(),
  result_type: z.enum(RESULT_TYPE_VALUES).default("weight"),
  // All numeric fields stored as strings for clean empty handling
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
