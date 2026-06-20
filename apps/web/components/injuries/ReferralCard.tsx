"use client";

export function ReferralCard() {
  return (
    <div
      data-testid="referral-card"
      className="rounded-lg border border-red-900 bg-red-950/30 p-4"
    >
      <p className="mb-1 font-mono text-sm font-semibold text-red-300">
        ⚠ Professional referral recommended
      </p>
      <p className="text-sm text-red-200">
        Based on your pain level or description, please consult a sports
        medicine physician, physical therapist, or your primary care provider
        before returning to training.
      </p>
      <p className="mt-2 font-mono text-xs text-red-400">
        # Do not train through this — seek professional evaluation first.
      </p>
    </div>
  );
}
