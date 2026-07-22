import { ShieldAlert, Phone } from "lucide-react";

/**
 * STOP-tier safety-escalation notice (design-spec 03 §7) — the highest-risk,
 * first-principles screen in this domain. No market precedent exists for this
 * UI (research §2 caveat); every decision below is deliberately built to be
 * unmistakably NOT a normal chat turn:
 *
 *  - No streaming, no progress ticker — rendered instantly and whole (item 1).
 *  - No `CoachIdentityMark` — this is a system/safety banner, not the coach
 *    "speaking" (item 2). It sits in neither the user nor assistant lane.
 *  - Full-surface `--red` danger fill, WCAG-AA, restrained (item 3, Bible §1.4).
 *  - No citations, no follow-up chips, no "regenerate" (item 4).
 *  - One single non-branching affordance: emergency-services + crisis-line
 *    info shown together, always, regardless of what triggered it (item 5,
 *    resolved 2026-07-18 — the API returns only a flat `safety_tier: "stop"`
 *    with no sub-pattern to branch on).
 *  - No Retry — the one place in the whole domain where Retry is deliberately
 *    absent; offering one would undercut the safety boundary (item 6).
 *  - No spring/entrance animation, reduced-motion is the default posture
 *    regardless of the user's OS setting (not just honored — always applied).
 *  - Not swipe-dismissable; stays in the transcript as a durable record.
 *
 * ⚠ DRAFT COPY — NOT FINAL. The body/crisis-line/action-label strings below
 * are the design spec's literal placeholder wording (03-coach-ai-chat.md §7,
 * "Data displayed"), explicitly marked there as pending clinical/legal review.
 * Do not treat this as approved user-facing language; it exists only to make
 * this screen buildable and testable ahead of that review.
 */
export function SafetyStopNotice() {
  return (
    <div
      role="alert"
      aria-live="assertive"
      data-testid="coach-safety-stop-notice"
      className="flex flex-col gap-3 rounded-xl p-4"
      style={{
        background: "color-mix(in srgb, var(--red) 22%, var(--bg))",
        border: "1px solid var(--red)",
      }}
    >
      <div className="flex items-center gap-2">
        <ShieldAlert
          size={20}
          aria-hidden="true"
          style={{ color: "var(--red)" }}
        />
        <span
          className="font-sans text-sm font-semibold"
          style={{ color: "var(--red)" }}
        >
          Safety notice — not coaching advice
        </span>
      </div>

      <p className="font-sans text-[15px] leading-relaxed text-[var(--text)]">
        This sounds like it may be a medical emergency. FitHub can&apos;t help
        with this — please stop and contact emergency services or a crisis line
        now.
      </p>

      <div
        className="rounded-lg p-3"
        style={{
          // Neutral border, not red — the outer card's red border is the
          // single alarm cue; a second red-tinted border on this inner box
          // read as a busy double-outline rather than reinforcing urgency.
          background: "color-mix(in srgb, var(--red) 10%, var(--bg))",
          border: "1px solid var(--border)",
        }}
      >
        <p
          className="font-mono text-[11px] tracking-wide uppercase"
          style={{ color: "var(--muted)" }}
        >
          Crisis line
        </p>
        <p className="mt-1 font-sans text-[13px] text-[var(--text)]">
          [Crisis line contact info — region-dependent, to be finalized]
        </p>
      </div>

      {/* 911 is a US-default placeholder only — like the crisis-line block
          above, region-appropriate emergency number resolution is part of the
          clinical/legal review this whole notice is pending (§7), not
          something to ship as-is for a non-US audience. */}
      <a
        href="tel:911"
        data-testid="coach-safety-stop-call-emergency"
        className="flex min-h-11 items-center justify-center gap-2 rounded-lg font-sans text-sm font-semibold"
        style={{ background: "var(--red)", color: "var(--bg)" }}
      >
        <Phone size={16} aria-hidden="true" />
        Call emergency services
      </a>
    </div>
  );
}
