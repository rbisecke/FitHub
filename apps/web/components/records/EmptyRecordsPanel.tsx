/**
 * Empty state (design-spec 04 Screen 1, States). `personal-records` returns
 * `[]`, not an error, for a brand-new user or one who has only logged
 * non-loaded movements. Names the comprehension trap explicitly: PRs only
 * exist for loaded, rep-based movements, so bodyweight/skill/max-distance
 * work never appears here.
 */
export function EmptyRecordsPanel() {
  return (
    <div
      className="rounded-[10px] border px-4 py-8"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <p
        className="font-sans text-[14px] font-medium"
        style={{ color: "var(--text)" }}
      >
        No PRs yet.
      </p>
      <p
        className="mt-2 font-sans text-[13px]"
        style={{ color: "var(--muted)" }}
      >
        Log a weight-and-reps set and your first one lands here automatically.
        PRs only track loaded, rep-based lifts — bodyweight, skill, and
        max-distance work won&apos;t show up in this list, but it&apos;s still
        saved in your logged history.
      </p>
    </div>
  );
}
