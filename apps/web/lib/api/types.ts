export type SessionType =
  | "strength"
  | "metcon"
  | "skill"
  | "mixed"
  | "rest"
  | "deload"
  | "active_recovery";

export type WorkoutFormat =
  | "strength"
  | "amrap"
  | "emom"
  | "for_time"
  | "tabata"
  | "intervals"
  | "chipper"
  | "benchmark"
  | "open"
  | "partner"
  | "team";

export type ResultType =
  | "weight"
  | "reps"
  | "time"
  | "distance"
  | "calories"
  | "height"
  | "rounds_reps"
  | "pace"
  | "watts";

export interface Result {
  id: string;
  workout_id: string;
  movement_id: string | null;
  movement_name?: string | null;
  result_type: ResultType;
  load_kg: string | null;
  reps: number | null;
  time_s: number | null;
  distance_m: number | null;
  calories: number | null;
  height_m: number | null;
  rounds: number | null;
  partial_reps: number | null;
  pace_s: number | null;
  pace_distance_m: number | null;
  watts: number | null;
  estimated_1rm_kg: string | null;
  set_index: number | null;
  order_index: number | null;
  notes: string | null;
  rpe: string | null;
  rpe_target: string | null;
  rir: number | null;
  rest_s: number | null;
}

export interface WorkoutSummary {
  id: string;
  user_id: string;
  performed_at: string;
  title: string | null;
  short_hash: string;
  session_type: SessionType | null;
  workout_format: WorkoutFormat | null;
  perceived_load_au: number | null;
  volume_load_kg: string | null;
  result_count: number;
  team_session_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Workout extends WorkoutSummary {
  results: Result[];
  notes: string | null;
  bodyweight_kg: string | null;
  session_rpe: string | null;
  duration_s: number | null;
  time_cap_s: number | null;
  location: string | null;
}

export interface WorkoutListResponse {
  items: WorkoutSummary[];
  next_cursor: string | null;
}

export interface Movement {
  id: string;
  name: string;
  slug: string;
  modality: string;
  is_official: boolean;
  created_at: string;
}

export interface CreateWorkoutBody {
  performed_at: string;
  title?: string;
  session_type?: SessionType;
  workout_format?: WorkoutFormat;
  notes?: string;
  session_rpe?: number;
  duration_s?: number;
  time_cap_s?: number;
  location?: string;
  bodyweight_kg?: number;
  results?: CreateResultBody[];
}

export interface CreateResultBody {
  movement_id?: string;
  result_type: ResultType;
  load_kg?: number;
  reps?: number;
  time_s?: number;
  distance_m?: number;
  calories?: number;
  height_m?: number;
  rounds?: number;
  partial_reps?: number;
  pace_s?: number;
  pace_distance_m?: number;
  watts?: number;
  order_index?: number;
  set_index?: number;
  notes?: string;
  rpe?: number;
  rpe_target?: number;
  rir?: number;
  rest_s?: number;
}
