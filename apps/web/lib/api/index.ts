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
export type CreateMovementBody = components["schemas"]["CreateMovementRequest"];

export type LoadModelResponse = components["schemas"]["LoadModelResponse"];
export type DailyLoadPoint = components["schemas"]["DailyLoadPoint"];
export type PersonalRecord = components["schemas"]["PersonalRecord"];
export type E1RMPoint = components["schemas"]["E1RMPoint"];
export type MovementHistoryEntry =
  components["schemas"]["MovementHistoryEntry"];
export type VolumeTrendResponse = components["schemas"]["VolumeTrendResponse"];
export type WeeklyVolume = components["schemas"]["WeeklyVolume"];
export type ReadinessResponse = components["schemas"]["ReadinessResponse"];
export type TrainingPartner = components["schemas"]["TrainingPartner"];
export type BenchmarkAttempt = components["schemas"]["BenchmarkAttempt"];
export type BenchmarkEntry = components["schemas"]["BenchmarkEntry"];
export type BenchmarkResponse = components["schemas"]["BenchmarkResponse"];
export type ContributionPoint = components["schemas"]["ContributionPoint"];
export type ContributionsResponse =
  components["schemas"]["ContributionsResponse"];

// Training balance — now from generated types
export type TrainingBalanceBreakdown =
  components["schemas"]["TrainingBalanceCategory"];
export type TrainingBalanceResponse =
  components["schemas"]["TrainingBalanceResponse"];

// Workout parsing — from generated OpenAPI schema
export type ParseNLResponse = components["schemas"]["ParseNLResponse"];

// Coach types — from generated OpenAPI schema
export type MovementResult = components["schemas"]["MovementResult"];
export type ParsedLogEntry = components["schemas"]["ParsedLogEntry"];
export type ParseLogResponse = components["schemas"]["ParseLogResponse"];
export type Citation = components["schemas"]["Citation"];
export type ChatResponse = components["schemas"]["ChatResponse"];
export type HistoryMessage = components["schemas"]["HistoryMessage"];
export type LastResult = components["schemas"]["LastResult"];
export type PersonalRecordResult =
  components["schemas"]["PersonalRecordResult"];

// Coach session types — from generated OpenAPI schema
export type CoachSession = components["schemas"]["CoachSession"];
export type SessionMessagesResponse =
  components["schemas"]["SessionMessagesResponse"];

// Profile types
export type WeightUnit = "kg" | "lb";
export type DistanceUnit = "km" | "mi";
export type GraphColourMode = "intensity" | "volume";
export type FrequencyTarget = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type UserProfile = components["schemas"]["UserProfile"];

export function toWeightUnit(s: string | null | undefined): WeightUnit {
  return s === "lb" ? "lb" : "kg";
}
export function toDistanceUnit(s: string | null | undefined): DistanceUnit {
  return s === "mi" ? "mi" : "km";
}
export function toGraphColourMode(
  s: string | null | undefined,
): GraphColourMode {
  return s === "volume" ? "volume" : "intensity";
}

export type ProfileStats = components["schemas"]["ProfileStats"];

export type InjuryOut = components["schemas"]["InjuryOut"];

export type PinnedMovement = components["schemas"]["PinnedMovement"];
export type SetPinnedMovementsRequest =
  components["schemas"]["SetPinnedMovementsRequest"];

// Team session types — from generated OpenAPI schema
export type TeamSession = components["schemas"]["TeamSession"];
export type TeamSessionParticipant =
  components["schemas"]["TeamSessionParticipant"];
export type TeamSessionSummary = components["schemas"]["TeamSessionSummary"];
export type ScoringType = components["schemas"]["ScoringType"];
export type Notification = components["schemas"]["Notification"];

// Profile search result — from generated OpenAPI schema (added in Feature 6)
export type UserSearchResult = components["schemas"]["UserSearchResult"];

// Admin types — from generated OpenAPI schema
export type AdminUserCostRow = components["schemas"]["UserCostRow"];
export type AdminDailyCostPoint = components["schemas"]["DailyCostPoint"];
export type AdminMetricsSummary = components["schemas"]["MetricsSummary"];
export type AdminRecentError = components["schemas"]["RecentError"];
export type AdminLLMError = components["schemas"]["LLMError"];
export type AdminHealth = components["schemas"]["AdminHealth"];
export type AdminUser = components["schemas"]["AdminUser"];
export type AdminAccessRequest = components["schemas"]["AccessRequestRow"];
