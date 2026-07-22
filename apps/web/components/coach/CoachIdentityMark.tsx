/**
 * The coach's reserved AI-identity mark (design-spec 03 §0.2) — a ~20px circular
 * teal/cyan gradient glyph anchored on `--teal` (#39c5cf) + a "Coach" text label.
 * This treatment is used NOWHERE else in the product: never on buttons, links,
 * backgrounds, or any state chrome. It leads only the FIRST line of an assistant
 * turn (not repeated per paragraph on a multi-line answer).
 *
 * The safety-escalation notice (Section 7) deliberately does NOT use this mark —
 * it isn't the coach speaking, so it renders its own distinct system banner
 * instead (see `SafetyStopNotice`).
 */
export function CoachIdentityMark() {
  return (
    <span
      className="inline-flex items-center gap-1.5"
      data-testid="coach-identity-mark"
    >
      <span
        aria-hidden="true"
        className="inline-block size-5 shrink-0 rounded-full"
        style={{
          background:
            "linear-gradient(135deg, var(--teal), color-mix(in srgb, var(--teal) 55%, white))",
        }}
      />
      <span className="font-sans text-xs font-semibold tracking-wide text-[var(--teal)]">
        Coach
      </span>
    </span>
  );
}
