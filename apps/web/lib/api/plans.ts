// Plan types — re-exported from generated OpenAPI schema.
// To regenerate: pnpm generate-types (from apps/web)
import type { components } from "./generated";

export type PlannedItemOut = components["schemas"]["PlannedItemOut"];
export type PlannedSessionOut = components["schemas"]["PlannedSessionOut"];
export type MesocycleOut = components["schemas"]["MesocycleOut"];
export type PlanDetail = components["schemas"]["PlanDetail"];
export type PlanSummary = components["schemas"]["PlanSummary"];
export type PlanTaskResponse = components["schemas"]["PlanTaskResponse"];
export type CreatePlanRequest = components["schemas"]["CreatePlanRequest"];
export type AdaptationOut = components["schemas"]["AdaptationOut"];
export type InjuryOut = components["schemas"]["InjuryOut"];
export type DetectTriggersResponse =
  components["schemas"]["DetectTriggersResponse"];
export type AdjustAdaptationRequest =
  components["schemas"]["AdjustAdaptationRequest"];
export type UpdateInjuryStatusRequest =
  components["schemas"]["UpdateInjuryStatusRequest"];
export type ModifyWorkoutRequest =
  components["schemas"]["ModifyWorkoutRequest"];
export type ModifyWorkoutResponse =
  components["schemas"]["ModifyWorkoutResponse"];
export type MovementModification =
  components["schemas"]["MovementModification"];
export type CheckWodResponse = components["schemas"]["CheckWodResponse"];
export type WodMovementResult = components["schemas"]["WodMovementResult"];
export type MovementSubstituteOut =
  components["schemas"]["MovementSubstituteOut"];
export type CompleteSessionRequest =
  components["schemas"]["CompleteSessionRequest"];
export type LoggedSetPayload = NonNullable<
  CompleteSessionRequest["logged_sets"]
>[number];
