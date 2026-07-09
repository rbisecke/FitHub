import type {
  AdminMetricsSummary,
  AdminAccessRequest,
  AdminUser,
  AdminHealth,
  AdminInfraSnapshot,
  AdminInfraDashboard,
} from "./index";
import type {
  Movement,
  Workout,
  WorkoutListResponse,
  CreateWorkoutBody,
  CreateMovementBody,
  ParseNLResponse,
  LoadModelResponse,
  PersonalRecord,
  PersonalRecordResult,
  E1RMPoint,
  MovementHistoryEntry,
  VolumeTrendResponse,
  ReadinessResponse,
  TrainingPartner,
  ParseLogResponse,
  ChatResponse,
  HistoryMessage,
  TrainingBalanceResponse,
  BenchmarkResponse,
  ContributionsResponse,
  LastResult,
  CoachSession,
  SessionMessagesResponse,
  UserProfile,
  ProfileStats,
  PinnedMovement,
  TeamSession,
  Notification,
  UserSearchResult,
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
  CheckWodResponse,
  MovementSubstituteOut,
} from "./plans";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

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
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}: ${path}`);
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
      options?: { signal?: AbortSignal },
    ) => {
      const qs = new URLSearchParams();
      if (params?.beforeId) qs.set("before_id", params.beforeId);
      if (params?.limit) qs.set("limit", String(params.limit));
      if (params?.sessionType) qs.set("session_type", params.sessionType);
      if (params?.partnerOnly !== undefined)
        qs.set("partner_only", String(params.partnerOnly));
      if (params?.dateFrom) qs.set("date_from", params.dateFrom);
      if (params?.dateTo) qs.set("date_to", params.dateTo);
      return apiFetch<WorkoutListResponse>(
        `/api/v1/workouts?${qs}`,
        token,
        options?.signal ? { signal: options.signal } : undefined,
      );
    },
    create: (token: string, body: CreateWorkoutBody) =>
      apiFetch<Workout>("/api/v1/workouts", token, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    get: (token: string, id: string, options?: { signal?: AbortSignal }) =>
      apiFetch<Workout>(
        `/api/v1/workouts/${id}`,
        token,
        options?.signal ? { signal: options.signal } : undefined,
      ),
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
      options?: { signal?: AbortSignal },
    ) => {
      const qs = new URLSearchParams();
      if (params.q) qs.set("query", params.q);
      if (params.modality) qs.set("modality", params.modality);
      if (params.limit != null) qs.set("limit", String(params.limit));
      return apiFetch<Movement[]>(
        `/api/v1/movements?${qs}`,
        token,
        options?.signal ? { signal: options.signal } : undefined,
      );
    },
    create: (token: string, body: CreateMovementBody) =>
      apiFetch<Movement>("/api/v1/movements", token, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    lastResult: (
      token: string,
      movementId: string,
      params?: { implement?: string; side?: string },
    ) => {
      const qs = new URLSearchParams();
      if (params?.implement) qs.set("implement", params.implement);
      if (params?.side) qs.set("side", params.side);
      const query = qs.toString();
      return apiFetch<LastResult>(
        `/api/v1/movements/${movementId}/last-result${
          query ? `?${query}` : ""
        }`,
        token,
      );
    },
    personalRecord: (
      token: string,
      movementId: string,
      params?: { implement?: string; side?: string },
    ) => {
      const qs = new URLSearchParams();
      if (params?.implement) qs.set("implement", params.implement);
      if (params?.side) qs.set("side", params.side);
      const query = qs.toString();
      return apiFetch<PersonalRecordResult | null>(
        `/api/v1/movements/${movementId}/personal-record${
          query ? `?${query}` : ""
        }`,
        token,
      );
    },
    personalRecordsBatch: (
      token: string,
      movementIds: string[],
      options?: { signal?: AbortSignal },
    ) =>
      apiFetch<PersonalRecordResult[]>(
        `/api/v1/movements/personal-records?ids=${movementIds.join(",")}`,
        token,
        options?.signal ? { signal: options.signal } : undefined,
      ),
    getSubstitutes: (
      token: string,
      movementId: string,
      equipment: string[],
      options?: { signal?: AbortSignal },
    ) => {
      const qs = new URLSearchParams();
      for (const item of equipment) qs.append("equipment", item);
      return apiFetch<MovementSubstituteOut[]>(
        `/api/v1/movements/${movementId}/substitutes?${qs}`,
        token,
        options?.signal ? { signal: options.signal } : undefined,
      );
    },
  },
  analytics: {
    load: (token: string, days = 90) =>
      apiFetch<LoadModelResponse>(`/api/v1/analytics/load?days=${days}`, token),
    personalRecords: (token: string, options?: { signal?: AbortSignal }) =>
      apiFetch<PersonalRecord[]>(
        "/api/v1/analytics/personal-records",
        token,
        options?.signal ? { signal: options.signal } : undefined,
      ),
    movementTrend: (token: string, movementId: string) =>
      apiFetch<E1RMPoint[]>(
        `/api/v1/analytics/movement-trend/${movementId}`,
        token,
      ),
    movementHistory: (token: string, movementId: string) =>
      apiFetch<MovementHistoryEntry[]>(
        `/api/v1/analytics/movement-history/${movementId}`,
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
    contributions: (token: string, days = 365) =>
      apiFetch<ContributionsResponse>(
        `/api/v1/analytics/contributions?days=${days}`,
        token,
      ),
  },
  trainingPartners: (token: string) =>
    apiFetch<TrainingPartner[]>("/api/v1/training-partners", token),
  addTrainingPartner: (token: string, email: string) =>
    apiFetch<TrainingPartner>("/api/v1/training-partners", token, {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  teamSessions: {
    create: (
      token: string,
      body: {
        performed_at: string;
        name?: string | null;
        team_size?: number;
        scoring_type?: string | null;
        team_score?: string | null;
        team_score_s?: number | null;
        team_score_reps?: number | null;
        notes?: string | null;
        workout_id?: string | null;
        participants?: Array<{
          user_id?: string | null;
          workout_id?: string | null;
          guest_name?: string | null;
          role?: string | null;
        }>;
      },
    ) =>
      apiFetch<TeamSession>("/api/v1/team-sessions", token, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    get: (token: string, id: string, options?: { signal?: AbortSignal }) =>
      apiFetch<TeamSession>(
        `/api/v1/team-sessions/${id}`,
        token,
        options?.signal ? { signal: options.signal } : undefined,
      ),
    patch: (
      token: string,
      id: string,
      body: {
        name?: string | null;
        scoring_type?: string | null;
        team_score?: string | null;
        team_score_s?: number | null;
        team_score_reps?: number | null;
        notes?: string | null;
        status?: string | null;
      },
    ) =>
      apiFetch<TeamSession>(`/api/v1/team-sessions/${id}`, token, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    delete: (token: string, id: string) =>
      apiFetch<void>(`/api/v1/team-sessions/${id}`, token, {
        method: "DELETE",
      }),
    addParticipant: (
      token: string,
      id: string,
      body: {
        user_id?: string | null;
        workout_id?: string | null;
        guest_name?: string | null;
        role?: string | null;
      },
    ) =>
      apiFetch<TeamSession>(`/api/v1/team-sessions/${id}/participants`, token, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    patchParticipant: (
      token: string,
      id: string,
      participantUserId: string,
      body: { workout_id?: string | null; role?: string | null },
    ) =>
      apiFetch<TeamSession>(
        `/api/v1/team-sessions/${id}/participants/${participantUserId}`,
        token,
        { method: "PATCH", body: JSON.stringify(body) },
      ),
    removeParticipant: (token: string, id: string, participantUserId: string) =>
      apiFetch<void>(
        `/api/v1/team-sessions/${id}/participants/${participantUserId}`,
        token,
        { method: "DELETE" },
      ),
    getWorkoutTeamSession: (
      token: string,
      workoutId: string,
      options?: { signal?: AbortSignal },
    ) =>
      apiFetch<TeamSession>(
        `/api/v1/workouts/${workoutId}/team-session`,
        token,
        options?.signal ? { signal: options.signal } : undefined,
      ),
  },
  notifications: {
    list: (
      token: string,
      includeRead = false,
      options?: { signal?: AbortSignal },
    ) =>
      apiFetch<Notification[]>(
        `/api/v1/notifications?include_read=${includeRead}`,
        token,
        { signal: options?.signal },
      ),
    markRead: (token: string, id: string) =>
      apiFetch<Notification>(`/api/v1/notifications/${id}/read`, token, {
        method: "POST",
      }),
  },
  profiles: {
    search: (token: string, q: string) =>
      apiFetch<UserSearchResult[]>(
        `/api/v1/profile/search?q=${encodeURIComponent(q)}`,
        token,
      ),
  },
  profile: {
    get: (token: string, options?: { signal?: AbortSignal }) =>
      apiFetch<UserProfile>(
        "/api/v1/profile",
        token,
        options?.signal ? { signal: options.signal } : undefined,
      ),
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
    history: (
      token: string,
      sessionId: string,
      limit = 20,
      signal?: AbortSignal,
    ) =>
      apiFetch<HistoryMessage[]>(
        `/api/v1/coach/history?session_id=${encodeURIComponent(
          sessionId,
        )}&limit=${limit}`,
        token,
        { signal },
      ),
    sessions: {
      list: (
        token: string,
        params?: { beforeId?: string; limit?: number },
        options?: { signal?: AbortSignal },
      ) => {
        const qs = new URLSearchParams();
        if (params?.beforeId) qs.set("before_id", params.beforeId);
        if (params?.limit) qs.set("limit", String(params.limit));
        return apiFetch<CoachSession[]>(
          `/api/v1/coach/sessions?${qs}`,
          token,
          options?.signal ? { signal: options.signal } : undefined,
        );
      },
      messages: (
        token: string,
        sessionId: string,
        options?: { limit?: number; signal?: AbortSignal },
      ) =>
        apiFetch<SessionMessagesResponse>(
          `/api/v1/coach/sessions/${sessionId}/messages?limit=${
            options?.limit ?? 50
          }`,
          token,
          options?.signal ? { signal: options.signal } : undefined,
        ),
    },
    modifyWorkout: (token: string, sessionId: string) =>
      apiFetch<ModifyWorkoutResponse>("/api/v1/coach/modify-workout", token, {
        method: "POST",
        body: JSON.stringify({ session_id: sessionId }),
      }),
    checkWod: (token: string, wodText: string) =>
      apiFetch<CheckWodResponse>("/api/v1/coach/check-wod", token, {
        method: "POST",
        body: JSON.stringify({ wod_text: wodText }),
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
    today: (
      token: string,
      planId: string,
      options?: { signal?: AbortSignal },
    ) =>
      apiFetch<PlannedSessionOut | null>(
        `/api/v1/plans/${planId}/today`,
        token,
        options?.signal ? { signal: options.signal } : undefined,
      ),
    revise: (token: string, planId: string, feedback: string) =>
      apiFetch<PlanDetail>(`/api/v1/plans/${planId}/revise`, token, {
        method: "POST",
        body: JSON.stringify({ feedback }),
      }),
    getNextSession: async (
      token: string,
      planId: string,
      options?: { signal?: AbortSignal },
    ): Promise<PlannedSessionOut | null> => {
      try {
        return await apiFetch<PlannedSessionOut>(
          `/api/v1/plans/${planId}/next-session`,
          token,
          options?.signal ? { signal: options.signal } : undefined,
        );
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
      }
    },
  },
  adaptations: {
    list: (token: string, planId: string, options?: { signal?: AbortSignal }) =>
      apiFetch<AdaptationOut[]>(
        `/api/v1/plans/${planId}/adaptations`,
        token,
        options?.signal ? { signal: options.signal } : undefined,
      ),
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
  wellness: {
    checkin: (
      token: string,
      body: {
        sleep: number;
        stress: number;
        fatigue: number;
        soreness: number;
      },
    ) =>
      apiFetch<{
        date: string;
        sleep: number;
        stress: number;
        fatigue: number;
        soreness: number;
        hooper_index: number;
      }>("/api/v1/wellness/checkin", token, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    today: (token: string) =>
      apiFetch<{
        submitted: boolean;
        checkin: {
          date: string;
          sleep: number;
          stress: number;
          fatigue: number;
          soreness: number;
          hooper_index: number;
        } | null;
      }>("/api/v1/wellness/checkin/today", token),
  },
  integrations: {
    list: (token: string, options?: { signal?: AbortSignal }) =>
      apiFetch<
        {
          provider: string;
          sync_status: string;
          last_synced_at: string | null;
        }[]
      >(
        "/api/v1/integrations",
        token,
        options?.signal ? { signal: options.signal } : undefined,
      ),
    connectAppleHealth: (token: string) =>
      apiFetch<{ token: string; token_prefix: string; ingest_url: string }>(
        "/api/v1/integrations/apple-health/connect",
        token,
        { method: "POST" },
      ),
    revokeAppleHealth: (token: string) =>
      apiFetch<void>("/api/v1/integrations/apple-health/token", token, {
        method: "DELETE",
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
    infraStatus: (token: string, options?: { signal?: AbortSignal }) =>
      apiFetch<AdminInfraSnapshot[]>(
        "/api/v1/admin/infra/status",
        token,
        options?.signal ? { signal: options.signal } : undefined,
      ),
    infra: (token: string, options?: { signal?: AbortSignal }) =>
      apiFetch<AdminInfraDashboard>(
        "/api/v1/admin/infra",
        token,
        options?.signal ? { signal: options.signal } : undefined,
      ),
  },
};

/**
 * Bind a token once for Client Components. Use with useMemo:
 *   const client = useMemo(() => createApiClient(token), [token]);
 */
export function createApiClient(token: string) {
  return {
    workouts: {
      list: (
        params?: Parameters<typeof api.workouts.list>[1],
        options?: { signal?: AbortSignal },
      ) => api.workouts.list(token, params, options),
      create: (body: Parameters<typeof api.workouts.create>[1]) =>
        api.workouts.create(token, body),
      get: (id: string, options?: { signal?: AbortSignal }) =>
        api.workouts.get(token, id, options),
      patch: (id: string, body: Parameters<typeof api.workouts.patch>[2]) =>
        api.workouts.patch(token, id, body),
      del: (id: string) => api.workouts.del(token, id),
      parseNl: (text: string) => api.workouts.parseNl(token, text),
    },
    movements: {
      search: (params: Parameters<typeof api.movements.search>[1]) =>
        api.movements.search(token, params),
      create: (body: Parameters<typeof api.movements.create>[1]) =>
        api.movements.create(token, body),
      lastResult: (
        movementId: string,
        params?: Parameters<typeof api.movements.lastResult>[2],
      ) => api.movements.lastResult(token, movementId, params),
      personalRecord: (
        movementId: string,
        params?: Parameters<typeof api.movements.personalRecord>[2],
      ) => api.movements.personalRecord(token, movementId, params),
      personalRecordsBatch: (
        movementIds: string[],
        options?: { signal?: AbortSignal },
      ) => api.movements.personalRecordsBatch(token, movementIds, options),
      getSubstitutes: (
        movementId: string,
        equipment: string[],
        options?: { signal?: AbortSignal },
      ) => api.movements.getSubstitutes(token, movementId, equipment, options),
    },
    analytics: {
      load: (days?: number) => api.analytics.load(token, days),
      personalRecords: (options?: { signal?: AbortSignal }) =>
        api.analytics.personalRecords(token, options),
      movementTrend: (movementId: string) =>
        api.analytics.movementTrend(token, movementId),
      movementHistory: (movementId: string) =>
        api.analytics.movementHistory(token, movementId),
      volumeTrend: (weeks?: number) => api.analytics.volumeTrend(token, weeks),
      readiness: () => api.analytics.readiness(token),
      trainingBalance: (days?: number) =>
        api.analytics.trainingBalance(token, days),
      benchmarks: () => api.analytics.benchmarks(token),
      contributions: (days?: number) =>
        api.analytics.contributions(token, days),
    },
    plans: {
      list: () => api.plans.list(token),
      get: (id: string) => api.plans.get(token, id),
      create: (body: Parameters<typeof api.plans.create>[1]) =>
        api.plans.create(token, body),
      pollTask: (taskId: string) => api.plans.pollTask(token, taskId),
      today: (planId: string, options?: { signal?: AbortSignal }) =>
        api.plans.today(token, planId, options),
      revise: (planId: string, feedback: string) =>
        api.plans.revise(token, planId, feedback),
      getNextSession: (planId: string, options?: { signal?: AbortSignal }) =>
        api.plans.getNextSession(token, planId, options),
    },
    adaptations: {
      list: (planId: string, options?: { signal?: AbortSignal }) =>
        api.adaptations.list(token, planId, options),
      detect: (planId: string) => api.adaptations.detect(token, planId),
      merge: (id: string) => api.adaptations.merge(token, id),
      reject: (id: string, rejectionReason?: string) =>
        api.adaptations.reject(token, id, rejectionReason),
      adjust: (
        id: string,
        body: Parameters<typeof api.adaptations.adjust>[2],
      ) => api.adaptations.adjust(token, id, body),
    },
    injuries: {
      report: (body: Parameters<typeof api.injuries.report>[1]) =>
        api.injuries.report(token, body),
      list: () => api.injuries.list(token),
      updateStatus: (
        injuryId: string,
        body: Parameters<typeof api.injuries.updateStatus>[2],
      ) => api.injuries.updateStatus(token, injuryId, body),
    },
    profile: {
      get: () => api.profile.get(token),
      stats: () => api.profile.stats(token),
      patch: (body: Parameters<typeof api.profile.patch>[1]) =>
        api.profile.patch(token, body),
      getPinnedMovements: () => api.profile.getPinnedMovements(token),
      setPinnedMovements: (movementIds: string[]) =>
        api.profile.setPinnedMovements(token, movementIds),
    },
    coach: {
      parseLog: (text: string) => api.coach.parseLog(token, text),
      chat: (question: string, sessionId?: string | null) =>
        api.coach.chat(token, question, sessionId),
      history: (sessionId: string, limit?: number) =>
        api.coach.history(token, sessionId, limit),
      sessions: {
        list: (
          params?: Parameters<typeof api.coach.sessions.list>[1],
          options?: { signal?: AbortSignal },
        ) => api.coach.sessions.list(token, params, options),
        messages: (
          sessionId: string,
          options?: { limit?: number; signal?: AbortSignal },
        ) => api.coach.sessions.messages(token, sessionId, options),
      },
      modifyWorkout: (sessionId: string) =>
        api.coach.modifyWorkout(token, sessionId),
      checkWod: (wodText: string) => api.coach.checkWod(token, wodText),
    },
    trainingPartners: () => api.trainingPartners(token),
    addTrainingPartner: (email: string) => api.addTrainingPartner(token, email),
    notifications: {
      list: (includeRead?: boolean, options?: { signal?: AbortSignal }) =>
        api.notifications.list(token, includeRead, options),
      markRead: (id: string) => api.notifications.markRead(token, id),
    },
    profiles: {
      search: (q: string) => api.profiles.search(token, q),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
