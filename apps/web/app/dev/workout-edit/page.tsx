import { ForcedTheme } from "@/components/shared/forced-theme";
import { EditWorkoutForm } from "@/components/logging/detail/EditWorkoutForm";
import { MOCK_WORKOUT, MOCK_UNITS } from "../workout-detail/mock";

/**
 * Dev-only preview (Effort 3, 01 §7). Renders the production EditWorkoutForm with
 * a mock workout to screenshot the session-fields-editable / results-locked
 * treatment. Not part of the shipping app.
 */
export default function DevWorkoutEditPreview() {
  return (
    <ForcedTheme
      theme="light"
      className="min-h-svh bg-background text-foreground"
    >
      <EditWorkoutForm
        workout={MOCK_WORKOUT}
        units={MOCK_UNITS}
        token="dev-preview-token"
      />
    </ForcedTheme>
  );
}
