"use client";

import { LazyMotion, domAnimation } from "motion/react";
import type { ReactNode } from "react";

/**
 * Motion feature scope (0.18, 09 §5).
 *
 * `LazyMotion` + `domAnimation` caps the motion feature bundle at ~15KB behind a
 * ~4.6KB shell instead of pulling the full `motion` runtime everywhere. Wrap only
 * the subtrees that host `m.*` motion islands (numeral counters, reveal moments)
 * in this provider — not the whole app — and use the `m` component (not `motion`)
 * inside so tree-shaking holds. `strict` throws if a heavier `motion.*` sneaks in.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}
