"use client";

import { ls } from "@/lib/local-storage";
import { CoachIdentityMark } from "@/components/coach/CoachIdentityMark";
import { Button } from "@/components/ui/button";

const CONSENT_KEY = "coach_consent_seen_v1";

/** Reuses the project's existing safe-localStorage wrapper (`lib/local-storage.ts`)
 * rather than inventing a new preference mechanism — same pattern as the recent-
 * movements cache and rest-timer settings. */
export function hasSeenCoachConsent(): boolean {
  return ls.get(CONSENT_KEY) === "true";
}

export function markCoachConsentSeen(): void {
  ls.set(CONSENT_KEY, "true");
}

/**
 * First-run consent/orientation interstitial (design-spec 03 §6.3) — shown once,
 * before a brand-new user's very first coach message, naming concretely what the
 * coach can see and remember. First-principles addition (flow research patterns
 * 6/7) justified by the same condition Oura's own equivalent responds to: the
 * chat is grounded in sensitive personal health data.
 *
 * ⚠ Copy here crosses into the injury domain and is flagged in the design spec
 * for review with that domain's owner — treat this as a reasonable first draft,
 * not final approved wording (same caveat as `SafetyStopNotice`'s DRAFT copy).
 */
export function ConsentInterstitial({
  onContinue,
}: {
  onContinue: () => void;
}) {
  return (
    <div
      className="flex flex-col gap-4 p-6"
      data-testid="coach-consent-interstitial"
    >
      <CoachIdentityMark />
      <h2 className="font-sans text-lg font-semibold text-[var(--text)]">
        Before we start
      </h2>
      <p className="font-sans text-sm" style={{ color: "var(--muted)" }}>
        Your coach can see and remember:
      </p>
      <ul className="flex flex-col gap-2">
        {[
          "Your training level and history",
          "Your active injuries",
          "Today's planned session",
        ].map((item) => (
          <li
            key={item}
            className="rounded-lg border px-3 py-2 font-sans text-sm text-[var(--text)]"
            style={{ borderColor: "var(--border)" }}
          >
            {item}
          </li>
        ))}
      </ul>
      <Button
        type="button"
        onClick={() => {
          markCoachConsentSeen();
          onContinue();
        }}
        data-testid="coach-consent-continue"
        className="min-h-11 w-fit"
      >
        Got it, let&apos;s talk
      </Button>
    </div>
  );
}
