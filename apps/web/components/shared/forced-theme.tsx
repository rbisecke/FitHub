import type { ReactNode } from "react";

/**
 * Forced-theme wrapper (0.23, 00 Part 2, 09 §7).
 *
 * Some screens are ALWAYS a specific theme regardless of OS preference — the Log
 * surface and plate calculator are always light ("analytical"), the Coach chat and
 * admin console always dark ("glanceable/ambient"). This is a Server Component: it
 * renders `<div data-theme="light|dark">` so the correct token values are resolved
 * in the very first server paint — zero client JS, zero flash.
 *
 * CRITICAL: everything inside must be styled through the CSS-variable tokens, never
 * Tailwind's `dark:` utility variant. `dark:` keys off the ancestor `.dark` class,
 * which a nested `data-theme="light"` wrapper does NOT unset — so a `dark:` utility
 * would still fire incorrectly inside a forced-light subtree. Token-based styling
 * sidesteps this because the cascade, not a class check, resolves the color.
 */
export function ForcedTheme({
  theme,
  children,
  className,
}: {
  theme: "light" | "dark";
  children: ReactNode;
  className?: string;
}) {
  return (
    <div data-theme={theme} className={className}>
      {children}
    </div>
  );
}
