import { ForcedTheme } from "@/components/shared/forced-theme";
import { WellnessCheckinCard } from "@/components/wellness/WellnessCheckinCard";

/**
 * Dev-only preview (Effort 4, 05 §3). There is no "Today" dashboard route yet
 * to embed the production check-in card into (that domain lands in a later
 * Effort), so this renders both states — not-yet-submitted and
 * already-submitted — side by side with mock `initialToday` data injected as
 * props (same pattern as `dev/workout-detail`), avoiding any dependency on a
 * live backend for the static-state screenshots. Not part of the shipping app.
 */
export default function DevWellnessCheckinPreview() {
  return (
    <ForcedTheme
      theme="light"
      className="min-h-svh bg-background text-foreground"
    >
      <div className="mx-auto flex max-w-[900px] flex-col gap-6 px-4 py-8 md:flex-row">
        <div className="flex-1">
          <p
            className="mb-2 font-mono text-[11px] uppercase tracking-wide"
            style={{ color: "var(--muted)" }}
          >
            Not yet submitted
          </p>
          <WellnessCheckinCard
            token="dev-preview-token"
            initialToday={{ submitted: false, checkin: null }}
          />
        </div>
        <div className="flex-1">
          <p
            className="mb-2 font-mono text-[11px] uppercase tracking-wide"
            style={{ color: "var(--muted)" }}
          >
            Already submitted
          </p>
          <WellnessCheckinCard
            token="dev-preview-token"
            initialToday={{
              submitted: true,
              checkin: {
                date: "2026-07-19",
                sleep: 6,
                stress: 3,
                fatigue: 4,
                soreness: 2,
                hooper_index: 15,
              },
            }}
          />
        </div>
      </div>
    </ForcedTheme>
  );
}
