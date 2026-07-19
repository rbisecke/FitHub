import type { ReactNode } from "react";

/**
 * Redesign app-shell layout (Effort 1, `00` Part 4).
 *
 * Step 1.1 mounts the route skeleton; the nav chrome (mobile bottom-tab bar + FAB,
 * desktop `Sidebar`) is composed in steps 1.2–1.4. This is a Server Component that
 * passes `children` straight through, so the placeholder route segments below it
 * stay server-rendered.
 */
export default function ShellLayout({ children }: { children: ReactNode }) {
  return children;
}
