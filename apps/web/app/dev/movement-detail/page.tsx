import { ForcedTheme } from "@/components/shared/forced-theme";
import {
  MovementDetailShell,
  type MovementTab,
} from "@/components/logging/movement/MovementDetailShell";
import type { Movement } from "@/lib/api";
import type { DisplayUnits } from "@/lib/units";

/**
 * Dev-only preview (Effort 3, 01 §9). Renders the production MovementDetailShell
 * with a mock movement so the tabbed shell, the shared (implement, side)
 * selector, and the About tab can be screenshotted at 375px / 1280px. Pass
 * ?tab=history|charts|records to preview the other tabs (their scoped fetches
 * need a live backend, so they land in an empty/error state without one). Not
 * part of the shipping app.
 */

const MOVEMENT: Movement = {
  id: "m-1",
  name: "Back Squat",
  slug: "back-squat",
  base_movement: "Squat",
  modality: "strength",
  start_position: "Bar on upper back, feet shoulder-width",
  catch_position: null,
  pause_position: "Below parallel",
  tempo: "30X1",
  execution_style: "strict",
  movement_pattern: "squat",
  limb_style: "bilateral",
  implement: "Barbell",
  default_result_types: ["weight"],
  default_result_type: "weight",
  is_official: true,
  created_by: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const UNITS: DisplayUnits = { weight: "kg", distance: "km" };

export default async function DevMovementDetailPreview({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const valid: MovementTab[] = ["about", "history", "charts", "records"];
  const active = (
    valid.includes(tab as MovementTab) ? tab : "about"
  ) as MovementTab;

  return (
    <ForcedTheme
      theme="light"
      className="min-h-svh bg-background text-foreground"
    >
      <MovementDetailShell
        movement={MOVEMENT}
        tab={active}
        implement={null}
        side={null}
        units={UNITS}
        equipment={["barbell", "dumbbells"]}
        token="dev-preview-token"
      />
    </ForcedTheme>
  );
}
