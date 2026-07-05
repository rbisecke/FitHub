"use client";

import { useState, useCallback, useEffect } from "react";

interface Props {
  slug: string;
}

export function NotifyToggle({ slug }: Props) {
  const [interested, setInterested] = useState(false);

  useEffect(() => {
    // Defer localStorage read to rAF to satisfy react-hooks/set-state-in-effect
    const raf = requestAnimationFrame(() => {
      setInterested(localStorage.getItem(`notify_interest_${slug}`) === "true");
    });
    return () => cancelAnimationFrame(raf);
  }, [slug]);

  const toggle = useCallback(() => {
    setInterested((prev) => {
      const next = !prev;
      if (next) {
        localStorage.setItem(`notify_interest_${slug}`, "true");
      } else {
        localStorage.removeItem(`notify_interest_${slug}`);
      }
      return next;
    });
  }, [slug]);

  return (
    <button
      onClick={toggle}
      className={`font-mono text-[11px] px-3 py-1.5 rounded border transition-colors min-h-[44px] flex items-center ${
        interested
          ? "border-[var(--green)]/40 text-[var(--green)]"
          : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
      }`}
    >
      {interested ? "Notified ✓" : "Notify me"}
    </button>
  );
}
