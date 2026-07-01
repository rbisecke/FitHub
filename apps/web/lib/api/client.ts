import type {
  AdminMetricsSummary,
  AdminAccessRequest,
  AdminUser,
  AdminHealth,
} from "./index";
import type {
  Movement,
  Workout,
  WorkoutListResponse,
  CreateWorkoutBody,
  ParseNLResponse,
  LoadModelResponse,
  PersonalRecord,
  PersonalRecordResult,
  E1RMPoint,
  VolumeTrendResponse,
  ReadinessResponse,
  TrainingPartner,
  ParseLogResponse,
  ChatResponse,
  HistoryMessage,
  TrainingBalanceResponse,
  BenchmarkResponse,
  LastResult,
  CoachSession,
  SessionMessagesResponse,
  UserProfile,
  ProfileStats,
  PinnedMovement,
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
  AdjustAdaptationRequest,
  UpdateInjuryStatusRequest,
  ModifyWorkoutResponse,
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
    list: (
      token: string,
      params?: {
        beforeId?: string;
        limit?: number;
        sessionType?: string;
        partnerOnly?: boolean;
        dateFrom?: string;
        dateTo?: string;
      },
    ) => {
      const qs = new URLSearchParams();
      if (params?.beforeId) qs.set("before_id", params.beforeId);
      if (params?.limit) qs.set("limit", String(params.limit));
      // Filter params — ignored by API until backend adds support (B-series PRs)
      if (params?.sessionType) qs.set("session_type", params.sessionType);
      if (params?.partnerOnly !== undefined)
        qs.set("partner_only", String(params.partnerOnly));
      if (params?.dateFrom) qs.set("date_from", params.dateFrom);
      if (params?.dateTo) qs.set("date_to", params.dateTo);
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
    parseNl: (token: string, text: string) =>
      apiFetch<ParseNLResponse>("/api/v1/workouts/parse-nl", token, {
        method: "POST",
        body: JSON.stringify({ text }),
      }),
  },
  movements: {
    search: (
      token: string,
      params: { q?: string; modality?: string; limit?: number },
    ) => {
      const qs = new URLSearchParams();
      if (params.q) qs.set("query", params.q);
      if (params.modality) qs.set("modality", params.modality);
      if (params.limit != null) qs.set("limit", String(params.limit));
      return apiFetch<Movement[]>(`/api/v1/movements?${qs}`, token);
    },
    create: (token: string, body: { name: string; modality: string }) =>
      apiFetch<Movement>("/api/v1/movements", token, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    lastResult: (token: string, movementId: string) =>
      apiFetch<LastResult>(
        `/api/v1/movements/${movementId}/last-result`,
        token,
      ),
    personalRecord: (token: string, movementId: string) =>
      apiFetch<PersonalRecordResult | null>(
        `/api/v1/movements/${movementId}/personal-record`,
        token,
      ),
    personalRecordsBatch: (token: string, movementIds: string[]) =>
      apiFetch<PersonalRecordResult[]>(
        `/api/v1/movements/personal-records?ids=${movementIds.join(",")}`,
        token,
      ),
  },
  analytics: {
    load: (token: string, days = 90) =>
      apiFetch<LoadModelResponse>(`/api/v1/analytics/load?days=${days}`, token),
    personalRecords: (token: string) =>
      apiFetch<PersonalRecord[]>("/api/v1/analytics/personal-records", token),
    movementTrend: (token: string, movementId: string) =>
      apiFetch<E1RMPoint[]>(
        `/api/v1/analytics/movement-trend/${movementId}`,
        token,
      ),
    volumeTrend: (token: string, weeks = 12) =>
      apiFetch<VolumeTrendResponse>(
        `/api/v1/analytics/volume-trend?weeks=${weeks}`,
        token,
      ),
    readiness: (token: string) =>
      apiFetch<ReadinessResponse>("/api/v1/analytics/readiness", token),
    trainingBalance: (token: string, days = 28) =>
      apiFetch<TrainingBalanceResponse>(
        `/api/v1/analytics/training-balance?days=${days}`,
        token,
      ),
    benchmarks: (token: string) =>
      apiFetch<BenchmarkResponse>("/api/v1/analytics/benchmarks", token),
  },
  trainingPartners: (token: string) =>
    apiFetch<TrainingPartner[]>("/api/v1/training-partners", token),
  addTrainingPartner: (token: string, email: string) =>
    apiFetch<TrainingPartner>("/api/v1/training-partners", token, {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  profile: {
    get: (token: string) => apiFetch<UserProfile>("/api/v1/profile", token),
    stats: (token: string) =>
      apiFetch<ProfileStats>("/api/v1/profile/stats", token),
    patch: (
      token: string,
      body: Partial<
        Pick<
          UserProfile,
          | "frequency_target_days"
          | "graph_colour_mode"
          | "weight_unit"
          | "checkin_enabled"
          | "onboarding_completed"
          | "display_name"
          | "bio"
          | "location"
          | "box_affiliation"
          | "distance_unit"
          | "training_level"
          | "training_since"
        >
      >,
    ) =>
      apiFetch<UserProfile>("/api/v1/profile", token, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    getPinnedMovements: (token: string) =>
      apiFetch<PinnedMovement[]>("/api/v1/profile/pinned-movements", token),
    setPinnedMovements: (token: string, movementIds: string[]) =>
      apiFetch<PinnedMovement[]>("/api/v1/profile/pinned-movements", token, {
        method: "PUT",
        body: JSON.stringify({ movement_ids: movementIds }),
      }),
  },
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
    sessions: {
      list: (token: string, params?: { beforeId?: string; limit?: number }) => {
        const qs = new URLSearchParams();
        if (params?.beforeId) qs.set("before_id", params.beforeId);
        if (params?.limit) qs.set("limit", String(params.limit));
        return apiFetch<CoachSession[]>(`/api/v1/coach/sessions?${qs}`, token);
      },
      messages: (token: string, sessionId: string, limit = 50) =>
        apiFetch<SessionMessagesResponse>(
          `/api/v1/coach/sessions/${sessionId}/messages?limit=${limit}`,
          token,
        ),
    },
    modifyWorkout: (token: string, sessionId: string) =>
      apiFetch<ModifyWorkoutResponse>("/api/v1/coach/modify-workout", token, {
        method: "POST",
        body: JSON.stringify({ session_id: sessionId }),
      }),
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
    revise: (token: string, planId: string, feedback: string) =>
      apiFetch<PlanDetail>(`/api/v1/plans/${planId}/revise`, token, {
        method: "POST",
        body: JSON.stringify({ feedback }),
      }),
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
    reject: (token: string, id: string, rejectionReason?: string) =>
      apiFetch<AdaptationOut>(`/api/v1/adaptations/${id}/reject`, token, {
        method: "POST",
        body: rejectionReason
          ? JSON.stringify({ rejection_reason: rejectionReason })
          : undefined,
      }),
    adjust: (token: string, id: string, body: AdjustAdaptationRequest) =>
      apiFetch<AdaptationOut>(`/api/v1/adaptations/${id}/adjust`, token, {
        method: "POST",
        body: JSON.stringify(body),
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
    updateStatus: (
      token: string,
      injuryId: string,
      body: UpdateInjuryStatusRequest,
    ) =>
      apiFetch<InjuryOut>(`/api/v1/injuries/${injuryId}/status`, token, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
  },
  admin: {
    metrics: (token: string) =>
      apiFetch<AdminMetricsSummary>("/api/v1/admin/metrics", token),
    accessRequests: (token: string, status?: string) => {
      const qs = status ? `?status=${encodeURIComponent(status)}` : "";
      return apiFetch<AdminAccessRequest[]>(
        `/api/v1/admin/access-requests${qs}`,
        token,
      );
    },
    reviewAccessRequest: (
      token: string,
      id: string,
      action: "approved" | "rejected",
      note?: string,
    ) =>
      apiFetch<AdminAccessRequest>(
        `/api/v1/admin/access-requests/${id}`,
        token,
        {
          method: "PATCH",
          body: JSON.stringify({ action, note: note ?? null }),
        },
      ),
    users: (token: string) =>
      apiFetch<AdminUser[]>("/api/v1/admin/users", token),
    health: (token: string) =>
      apiFetch<AdminHealth>("/api/v1/admin/health", token),
  },
};
