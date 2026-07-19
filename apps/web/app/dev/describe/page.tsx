import { ForcedTheme } from "@/components/shared/forced-theme";
import { DescribeItScreen } from "@/components/logging/ai/DescribeItScreen";

/**
 * Dev-only preview (Effort 3, 01 §10.1). Renders the production DescribeItScreen
 * for screenshotting the input bar and, after a live parse, the confirmation
 * cards + unmatched-movement state. The parse itself needs a backend. Not part of
 * the shipping app.
 */
export default function DevDescribePreview() {
  return (
    <ForcedTheme
      theme="light"
      className="min-h-svh bg-background text-foreground"
    >
      <DescribeItScreen token="dev-preview-token" weightUnit="kg" />
    </ForcedTheme>
  );
}
