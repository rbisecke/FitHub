import { ForcedTheme } from "@/components/shared/forced-theme";
import { HistoryFeed } from "@/components/logging/history/HistoryFeed";
import type { WorkoutSummary } from "@/lib/api";
import type { DisplayUnits } from "@/lib/units";

/**
 * Dev-only preview (Effort 3, 01 §5). Renders the production HistoryFeed with
 * representative mock summaries so the feed, PR tag, benchmark badge, and tag
 * milestone card can be screenshotted at true 375px / 1280px without a backend.
 * The initial page is server-provided, so the feed paints statically (no fetch)
 * until a filter changes or a card is expanded. Not part of the shipping app.
 */

function summary(over: Partial<WorkoutSummary>): WorkoutSummary {
  return {
    id: crypto.randomUUID(),
    user_id: "u1",
    performed_at: "2026-07-18T07:30:00",
    title: null,
    short_hash: "a1b2c3d4",
    notes: null,
    bodyweight_kg: null,
    session_type: "strength",
    workout_format: "strength",
    time_cap_s: null,
    location: null,
    session_rpe: null,
    duration_s: 3600,
    perceived_load_au: null,
    volume_load_kg: null,
    avg_hr: null,
    max_hr: null,
    trimp_au: null,
    is_tag: false,
    result_count: 4,
    has_pr: false,
    created_at: "2026-07-18T07:30:00Z",
    updated_at: "2026-07-18T07:30:00Z",
    ...over,
  };
}

const UNITS: DisplayUnits = { weight: "kg", distance: "km" };

const ITEMS: WorkoutSummary[] = [
  summary({
    title: "Fran",
    performed_at: "2026-07-19T06:15:00",
    workout_format: "for_time",
    session_type: "metcon",
    has_pr: true,
    result_count: 3,
    short_hash: "f7a09c0e",
  }),
  summary({
    title: "Back Squat 140kg × 1",
    performed_at: "2026-07-19T06:20:00",
    is_tag: true,
    result_count: 1,
    short_hash: "cc11ee22",
  }),
  summary({
    title: "Heavy Pull Day",
    performed_at: "2026-07-18T17:00:00",
    session_type: "strength",
    workout_format: "strength",
    result_count: 6,
    short_hash: "b2c3d4e5",
  }),
  summary({
    title: "Rest day",
    performed_at: "2026-07-17T09:00:00",
    session_type: "rest",
    workout_format: null,
    result_count: 0,
    short_hash: "00aa11bb",
  }),
];

export default function DevHistoryPreview() {
  return (
    <ForcedTheme
      theme="light"
      className="min-h-svh bg-background text-foreground"
    >
      <HistoryFeed
        token="dev-preview-token"
        units={UNITS}
        initialItems={ITEMS}
        initialCursor={null}
      />
    </ForcedTheme>
  );
}
