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

// Coach types — from generated OpenAPI schema
export type MovementResult = components["schemas"]["MovementResult"];
export type ParsedLogEntry = components["schemas"]["ParsedLogEntry"];
export type ParseLogResponse = components["schemas"]["ParseLogResponse"];
export type Citation = components["schemas"]["Citation"];
export type ChatResponse = components["schemas"]["ChatResponse"];
export type HistoryMessage = components["schemas"]["HistoryMessage"];
