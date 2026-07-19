import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";

/**
 * Redesign app-shell layout (Effort 1, `00` Part 4).
 *
 * Wraps every routed screen in the `(shell)` group's bare-path routes in the global
 * nav chrome (`AppShell`). A Server Component; `AppShell` is server-rendered too, so
 * the placeholder route segments stay on the server. Signed-out visitors never reach
 * here — middleware redirects them to `/login` before render.
 *
 * `isAdmin` is hardcoded true as a placeholder so the admin-gated nav item and the
 * role switch stay visible for validation while these screens are still placeholders.
 * Real allowlist gating reads the authenticated session and lands in Effort 2 (auth) /
 * Effort 10 (admin console).
 */
export default function ShellLayout({ children }: { children: ReactNode }) {
  return <AppShell isAdmin>{children}</AppShell>;
}
