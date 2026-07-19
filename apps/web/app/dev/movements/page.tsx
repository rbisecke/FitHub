import { ForcedTheme } from "@/components/shared/forced-theme";
import { MovementCatalog } from "@/components/logging/catalog/MovementCatalog";
import type { Movement } from "@/lib/api";

/**
 * Dev-only preview (Effort 3, 01 §8). Renders the production MovementCatalog with
 * mock browse results so the search field, modality chips, official/custom
 * markers, and list rows can be screenshotted at 375px / 1280px. PR badges and
 * live search depend on a backend and stay absent here (the non-destructive
 * error banner keeps the browse list visible). Not part of the shipping app.
 */

function movement(over: Partial<Movement>): Movement {
  return {
    id: crypto.randomUUID(),
    name: "Movement",
    slug: "movement",
    base_movement: "Movement",
    modality: "strength",
    start_position: null,
    catch_position: null,
    pause_position: null,
    tempo: null,
    execution_style: null,
    movement_pattern: null,
    limb_style: null,
    implement: null,
    default_result_types: ["weight"],
    default_result_type: "weight",
    is_official: true,
    created_by: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

const RESULTS: Movement[] = [
  movement({
    name: "Back Squat",
    slug: "back-squat",
    implement: "Barbell",
    modality: "strength",
  }),
  movement({
    name: "Bench Press",
    slug: "bench-press",
    implement: "Barbell",
    modality: "strength",
  }),
  movement({
    name: "Clean & Jerk",
    slug: "clean-and-jerk",
    implement: "Barbell",
    modality: "weightlifting",
  }),
  movement({ name: "Pull-up", slug: "pull-up", modality: "gymnastics" }),
  movement({ name: "Row", slug: "row", modality: "mono_structural" }),
  movement({
    name: "Bulgarian Split Squat",
    slug: "bulgarian-split-squat",
    implement: "Dumbbell",
    modality: "strength",
    is_official: false,
  }),
];

export default function DevMovementsPreview() {
  return (
    <ForcedTheme
      theme="light"
      className="min-h-svh bg-background text-foreground"
    >
      <MovementCatalog token="dev-preview-token" initialResults={RESULTS} />
    </ForcedTheme>
  );
}
