import type { ReactNode } from "react";
import { MobileBottomNav } from "./mobile-bottom-nav";

/**
 * Redesign app shell (Effort 1, `00` Part 4).
 *
 * Composes the global nav chrome around every routed screen. A Server Component so
 * the routed `children` below it stay server-rendered — only the nav pieces that
 * need interactivity (`MobileBottomNav`) are client islands.
 *
 * Current chrome: the mobile bottom-tab bar + inset FAB (steps 1.2–1.3). The
 * desktop `Sidebar` is layered in at step 1.4.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh bg-background">
      <main className="pb-nav-safe md:pb-0">{children}</main>
      <MobileBottomNav />
    </div>
  );
}
