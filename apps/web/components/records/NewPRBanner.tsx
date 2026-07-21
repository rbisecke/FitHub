"use client";

import { useState } from "react";

interface Props {
  movement: string;
  value: string;
  count: number;
}

export function NewPRBanner({ movement, value, count }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (count === 0 || dismissed) return null;

  return (
    <div
      className="flex items-center gap-3.5 rounded-[14px] px-4 py-3.5 mb-5"
      style={{
        background: "var(--card)",
        border: "1px solid rgba(255, 200, 61, 0.35)",
      }}
    >
      <span className="text-[24px] flex-shrink-0" aria-hidden="true">
        🎉
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-[14px]">
          New release{count > 1 ? "s" : ""} tagged today!
        </div>
        <div className="text-[12.5px] text-[var(--muted-foreground)] mt-0.5">
          {movement ? (
            <>
              You set a personal record on {movement} — {value}. That&apos;s a
              version bump worth celebrating.
            </>
          ) : (
            "Your repo just got faster."
          )}
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-[var(--muted-foreground)] text-[20px] leading-none p-1 flex-shrink-0 hover:text-[var(--foreground)] transition-colors"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
