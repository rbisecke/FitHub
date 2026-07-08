"use client";

export function ReferralCard() {
  return (
    <div
      data-testid="referral-card"
      className="rounded-lg border border-[var(--red)]/40 bg-[var(--red)]/10 p-4"
    >
      <p className="mb-1 font-mono text-sm font-semibold text-[var(--red)]">
        ⚠ Professional referral recommended
      </p>
      <p className="text-sm text-[var(--text)]">
        Based on your pain level or description, please consult a sports
        medicine physician, physical therapist, or your primary care provider
        before returning to training.
      </p>
      <p className="mt-2 font-mono text-xs text-[var(--red)]">
        # Do not train through this — seek professional evaluation first.
      </p>
    </div>
  );
}
