import { ForcedTheme } from "@/components/shared/forced-theme";
import { CardioConversionChip } from "@/components/logging/CardioConversionChip";

/**
 * Dev-only preview (Effort 3, 01 §11). Renders the CardioConversionChip for a
 * running-equivalent movement so the chip and its reference panel can be
 * screenshotted. Not part of the shipping app.
 */
export default function DevCardioChipPreview() {
  return (
    <ForcedTheme
      theme="light"
      className="min-h-svh bg-background text-foreground"
    >
      <div className="mx-auto w-full max-w-[640px] px-4 py-8">
        <p
          className="mb-3 font-sans text-[14px]"
          style={{ color: "var(--text)" }}
        >
          800m Run
        </p>
        <CardioConversionChip movementName="800m Run" />
      </div>
    </ForcedTheme>
  );
}
