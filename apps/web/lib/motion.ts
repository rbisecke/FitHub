// Re-exports for "use client" components (the common case).
// For RSC trees, import directly from "motion/react-client" at the call site.
export { motion, AnimatePresence } from "motion/react";

/**
 * Shared motion signature. FitHub's convention is a short fade-up on entrance;
 * centralising it keeps motion one decision instead of many copies. Always gate
 * `initial` on `useReducedMotion()` — `fadeUpProps` does this for you.
 */
export const MOTION = {
  fadeUp: { initial: { opacity: 0, y: 4 }, animate: { opacity: 1, y: 0 } },
  durFast: 0.16,
  durBase: 0.2,
  durSlow: 0.32,
  ease: "easeOut" as const,
  stagger: 0.04,
};

/** Reduced-motion-aware fade-up entrance props for a `motion.*` element. */
export function fadeUpProps(prefersReducedMotion: boolean | null, delay = 0) {
  return {
    initial: prefersReducedMotion ? (false as const) : MOTION.fadeUp.initial,
    animate: MOTION.fadeUp.animate,
    transition: { duration: MOTION.durBase, ease: MOTION.ease, delay },
  };
}
