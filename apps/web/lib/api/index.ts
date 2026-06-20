export type { paths, components } from "./generated";
import type { components } from "./generated";

export type SessionType = components["schemas"]["SessionType"];
export type WorkoutFormat = components["schemas"]["WorkoutFormat"];
export type ResultType = components["schemas"]["ResultType"];
export type Result = components["schemas"]["Result"];
export type WorkoutSummary = components["schemas"]["WorkoutSummary"];
export type Workout = components["schemas"]["Workout"];
export type WorkoutListResponse = components["schemas"]["WorkoutListResponse"];
export type Movement = components["schemas"]["Movement"];
export type CreateWorkoutBody = components["schemas"]["CreateWorkoutRequest"];
export type CreateResultBody = components["schemas"]["CreateResultRequest"];

export type LoadModelResponse = components["schemas"]["LoadModelResponse"];
export type DailyLoadPoint = components["schemas"]["DailyLoadPoint"];
export type PersonalRecord = components["schemas"]["PersonalRecord"];
export type E1RMPoint = components["schemas"]["E1RMPoint"];
export type VolumeTrendResponse = components["schemas"]["VolumeTrendResponse"];
export type WeeklyVolume = components["schemas"]["WeeklyVolume"];
export type ReadinessResponse = components["schemas"]["ReadinessResponse"];
export type TrainingPartner = components["schemas"]["TrainingPartner"];

// Coach types — defined locally since not yet in OpenAPI schema
export interface MovementResult {
  movement_name: string;
  result_type: string;
  reps?: number | null;
  load_kg?: number | null;
  time_s?: number | null;
  scaled: boolean;
  notes?: string | null;
}

export interface ParsedLogEntry {
  title?: string | null;
  session_type: string;
  workout_format?: string | null;
  duration_s?: number | null;
  session_rpe?: number | null;
  results: MovementResult[];
  parsing_notes: string;
}

export interface ParseLogResponse {
  parsed: ParsedLogEntry;
  confidence: number;
  stub: boolean;
}

export interface Citation {
  title: string;
  source_type: string;
  score: number;
}

export interface ChatResponse {
  answer: string;
  citations: Citation[];
  stub: boolean;
}
