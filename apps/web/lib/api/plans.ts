export interface PlannedItemOut {
  id: string;
  movement_name: string;
  sets?: number | null;
  reps?: string | null;
  load_pct_1rm?: number | null;
  load_kg?: number | null;
  notes?: string | null;
  item_order: number;
}

export interface PlannedSessionOut {
  id: string;
  mesocycle_id: string;
  scheduled_date: string;
  session_type: string;
  title: string;
  notes?: string | null;
  status: string;
  items: PlannedItemOut[];
}

export interface MesocycleOut {
  id: string;
  name: string;
  phase: string;
  week_start: number;
  week_end: number;
  focus?: string | null;
}

export interface PlanDetail {
  id: string;
  goal: string;
  title: string;
  branch_name: string;
  weeks: number;
  status: string;
  start_date: string;
  end_date: string;
  training_age?: string | null;
  created_at: string;
  mesocycles: MesocycleOut[];
  sessions: PlannedSessionOut[];
}

export interface PlanSummary {
  id: string;
  goal: string;
  title: string;
  branch_name: string;
  weeks: number;
  status: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface PlanTaskResponse {
  task_id: string;
  status: string;
  plan_id?: string | null;
  error?: string | null;
}

export interface CreatePlanRequest {
  goal: string;
  title: string;
  start_date: string;
  weeks: number;
  training_age: string;
}

export interface AdaptationOut {
  id: string;
  plan_id: string;
  user_id: string;
  trigger_type: string;
  trigger_data: Record<string, unknown>;
  status: string;
  rationale?: string | null;
  diff_json?: unknown;
  stub: boolean;
  proposed_at: string;
  merged_at?: string | null;
  rejected_at?: string | null;
}
