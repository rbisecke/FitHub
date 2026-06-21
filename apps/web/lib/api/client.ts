import type {
  Movement,
  Workout,
  WorkoutListResponse,
  CreateWorkoutBody,
  LoadModelResponse,
  PersonalRecord,
  VolumeTrendResponse,
  ReadinessResponse,
  TrainingPartner,
  ParseLogResponse,
  ChatResponse,
  HistoryMessage,
} from "./index";
import type {
  PlanDetail,
  PlanSummary,
  PlanTaskResponse,
  PlannedSessionOut,
  CreatePlanRequest,
  AdaptationOut,
  InjuryOut,
  DetectTriggersResponse,
} from "./plans";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function apiFetch<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    cache: "no-store",
    ...init,
    headers: headers(token),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  workouts: {
    list: (token: string, params?: { beforeId?: string; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.beforeId) qs.set("before_id", params.beforeId);
      if (params?.limit) qs.set("limit", String(params.limit));
      return apiFetch<WorkoutListResponse>(`/api/v1/workouts?${qs}`, token);
    },
    create: (token: string, body: CreateWorkoutBody) =>
      apiFetch<Workout>("/api/v1/workouts", token, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    get: (token: string, id: string) =>
      apiFetch<Workout>(`/api/v1/workouts/${id}`, token),
    patch: (token: string, id: string, body: Partial<CreateWorkoutBody>) =>
      apiFetch<Workout>(`/api/v1/workouts/${id}`, token, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    del: (token: string, id: string) =>
      apiFetch<void>(`/api/v1/workouts/${id}`, token, { method: "DELETE" }),
  },
  movements: {
    search: (token: string, params: { q?: string; modality?: string }) => {
      const qs = new URLSearchParams();
      if (params.q) qs.set("q", params.q);
      if (params.modality) qs.set("modality", params.modality);
      return apiFetch<Movement[]>(`/api/v1/movements?${qs}`, token);
    },
    create: (token: string, body: { name: string; modality: string }) =>
      apiFetch<Movement>("/api/v1/movements", token, {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },
  analytics: {
    load: (token: string, days = 90) =>
      apiFetch<LoadModelResponse>(`/api/v1/analytics/load?days=${days}`, token),
    personalRecords: (token: string) =>
      apiFetch<PersonalRecord[]>("/api/v1/analytics/personal-records", token),
    volumeTrend: (token: string, weeks = 12) =>
      apiFetch<VolumeTrendResponse>(
        `/api/v1/analytics/volume-trend?weeks=${weeks}`,
        token,
      ),
    readiness: (token: string) =>
      apiFetch<ReadinessResponse>("/api/v1/analytics/readiness", token),
  },
  trainingPartners: (token: string) =>
    apiFetch<TrainingPartner[]>("/api/v1/training-partners", token),
  coach: {
    parseLog: (token: string, text: string) =>
      apiFetch<ParseLogResponse>("/api/v1/coach/parse-log", token, {
        method: "POST",
        body: JSON.stringify({ text }),
      }),
    chat: (token: string, question: string, sessionId?: string | null) =>
      apiFetch<ChatResponse>("/api/v1/coach/chat", token, {
        method: "POST",
        body: JSON.stringify({ question, session_id: sessionId ?? null }),
      }),
    history: (token: string, sessionId: string, limit = 20) =>
      apiFetch<HistoryMessage[]>(
        `/api/v1/coach/history?session_id=${encodeURIComponent(
          sessionId,
        )}&limit=${limit}`,
        token,
      ),
  },
  plans: {
    list: (token: string) => apiFetch<PlanSummary[]>("/api/v1/plans", token),
    get: (token: string, id: string) =>
      apiFetch<PlanDetail>(`/api/v1/plans/${id}`, token),
    create: (token: string, body: CreatePlanRequest) =>
      apiFetch<PlanTaskResponse>("/api/v1/plans", token, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    pollTask: (token: string, taskId: string) =>
      apiFetch<PlanTaskResponse>(`/api/v1/plans/tasks/${taskId}`, token),
    today: (token: string, planId: string) =>
      apiFetch<PlannedSessionOut | null>(
        `/api/v1/plans/${planId}/today`,
        token,
      ),
  },
  adaptations: {
    list: (token: string, planId: string) =>
      apiFetch<AdaptationOut[]>(`/api/v1/plans/${planId}/adaptations`, token),
    detect: (token: string, planId: string) =>
      apiFetch<DetectTriggersResponse>(
        `/api/v1/plans/${planId}/adaptations/detect`,
        token,
        { method: "POST" },
      ),
    merge: (token: string, id: string) =>
      apiFetch<AdaptationOut>(`/api/v1/adaptations/${id}/merge`, token, {
        method: "POST",
      }),
    reject: (token: string, id: string) =>
      apiFetch<AdaptationOut>(`/api/v1/adaptations/${id}/reject`, token, {
        method: "POST",
      }),
  },
  injuries: {
    report: (
      token: string,
      body: {
        body_region: string;
        pain_level: number;
        mechanism?: string | null;
        notes?: string | null;
      },
    ) =>
      apiFetch<InjuryOut>("/api/v1/injuries", token, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    list: (token: string) => apiFetch<InjuryOut[]>("/api/v1/injuries", token),
  },
};
