import type { ReactNode } from "react";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { ProgressTabsNav } from "@/components/records/ProgressTabsNav";

/**
 * Shared layout for every `/progress/*` route (design-spec 04 "Navigation").
 * Renders the segmented Records | Load | Volume | Balance | Benchmarks nav
 * once, above whichever segment's own page component renders below (each of
 * which manages its own theme independently via `ForcedTheme`). Additive-only
 * relative to the sibling efforts' existing `load`/`volume`/`benchmarks`
 * `page.tsx` files — this file doesn't touch any of them.
 */
export default function ProgressLayout({ children }: { children: ReactNode }) {
  return (
    <ForcedTheme theme="dark">
      <ProgressTabsNav />
      {children}
    </ForcedTheme>
  );
}
