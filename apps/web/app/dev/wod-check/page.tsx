import { ForcedTheme } from "@/components/shared/forced-theme";
import { WodCheckerScreen } from "@/app/(shell)/injuries/wod-check/WodCheckerScreen";

/**
 * Dev-only preview (Effort 4, 05 §5.2). Renders the production
 * WodCheckerScreen — bypasses the real `/injuries/wod-check` route's
 * server-side auth redirect, same pattern as `dev/workout-detail`. The
 * "Check this workout" call needs a live backend, so this only exercises the
 * static input/empty state; result-state screenshots come from the
 * `dev/contraindication-badge` preview, which shares the same result-row
 * visual language. Not part of the shipping app.
 */
export default function DevWodCheckPreview() {
  return (
    <ForcedTheme
      theme="light"
      className="min-h-svh bg-background text-foreground"
    >
      <WodCheckerScreen token="dev-preview-token" />
    </ForcedTheme>
  );
}
