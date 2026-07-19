import { ForcedTheme } from "@/components/shared/forced-theme";
import { WorkoutDetail } from "@/components/logging/detail/WorkoutDetail";
import { MOCK_WORKOUT, MOCK_UNITS } from "./mock";

/**
 * Dev-only preview (Effort 3, 01 §6). Renders the production WorkoutDetail with a
 * mock workout for screenshotting the two-pane layout, metadata block, result
 * rows, chips, and scaled qualifier at 375px / 1280px. Strict PR badges and trend
 * previews depend on a live backend (personalRecordsBatch) so they stay absent
 * here — expected. Not part of the shipping app.
 */
export default function DevWorkoutDetailPreview() {
  return (
    <ForcedTheme
      theme="light"
      className="min-h-svh bg-background text-foreground"
    >
      <WorkoutDetail
        workout={MOCK_WORKOUT}
        units={MOCK_UNITS}
        token="dev-preview-token"
      />
    </ForcedTheme>
  );
}
