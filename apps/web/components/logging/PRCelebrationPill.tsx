"use client";

import { useEffect } from "react";
import { useReducedMotion } from "motion/react";

/**
 * In-flow PR celebration pill (01 §2.11): a compact floating, non-blocking pill
 * near the top when a completed set beats a prior best. Auto-dismisses after 4s
 * (or on the next set completion, handled by the parent re-keying/clearing).
 * Uses --purple (reserved achievement color), never confetti. This is a bespoke
 * in-canvas element, not a Sonner toast (§ component mapping).
 */
export function PRCelebrationPill({
  label,
  onDismiss,
}: {
  label: string;
  onDismiss: () => void;
}) {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const id = setTimeout(onDismiss, 4000);
    return () => clearTimeout(id);
  }, [onDismiss]);

  return (
    <div
      role="status"
      className="fixed left-1/2 top-20 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 shadow-lg"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--purple)",
        transition: prefersReducedMotion ? "none" : "opacity 200ms",
      }}
    >
      <span aria-hidden="true" style={{ color: "var(--purple)" }}>
        ★
      </span>
      <span className="font-sans text-[13px]" style={{ color: "var(--text)" }}>
        {label}
      </span>
    </div>
  );
}
