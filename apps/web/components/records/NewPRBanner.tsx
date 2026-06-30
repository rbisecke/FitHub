"use client";

import { useState } from "react";
import { X } from "lucide-react";

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
      className="mb-5 flex items-start gap-3 rounded-xl px-4 py-3 animate-fadeUp"
      style={{
        background: "rgba(255,200,61,0.08)",
        border: "1px solid rgba(255,200,61,0.35)",
      }}
    >
      <span className="text-[20px] leading-none mt-0.5" aria-hidden="true">
        🎉
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[var(--foreground)]">
          New{count > 1 ? ` ${count}` : ""} PR{count > 1 ? "s" : ""} tagged
        </p>
        <p className="text-[12px] text-[var(--muted)] mt-0.5">
          {movement ? (
            <>
              <span className="text-[var(--foreground)] font-medium">
                {movement}
              </span>{" "}
              — {value}
            </>
          ) : (
            "Your repo just got faster."
          )}
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss banner"
        className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors p-1 -mt-0.5 -mr-1 rounded"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
