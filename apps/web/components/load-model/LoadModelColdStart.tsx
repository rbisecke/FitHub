/**
 * Cold-start panel (design-spec 04 Screen 4 States): a brand-new user with no
 * logged training load gets an explicit "not started yet" panel rather than
 * a flat-line-at-zero chart, which would misleadingly read as "real zero
 * fitness" instead of "no data yet."
 */
export function LoadModelColdStart() {
  return (
    <div className="rounded-[10px] border border-[var(--border)] bg-[var(--card)] p-8 text-center">
      <p className="font-sans text-[15px] font-medium text-[var(--foreground)]">
        No training load yet
      </p>
      <p className="font-sans text-[13px] text-[var(--muted-foreground)] mt-2 max-w-sm mx-auto">
        Fitness, Fatigue, and Form build up from your logged sessions. Log a few
        workouts with an RPE and duration, and your load model starts filling in
        here — usually meaningful after about a week.
      </p>
    </div>
  );
}
