import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";

/**
 * Redesign app-shell layout (Effort 1, `00` Part 4).
 *
 * Wraps every routed screen in the global nav chrome (`AppShell`). A Server
 * Component; `AppShell` is server-rendered too, so the placeholder route segments
 * below stay on the server.
 *
 * `isAdmin` is hardcoded true here only because this is the signed-out preview
 * shell — it makes the admin-gated nav item and the role switch visible for
 * validation. Real allowlist gating reads the authenticated session and lands in
 * Effort 2 (auth) / Effort 10 (admin console).
 */
export default function ShellLayout({ children }: { children: ReactNode }) {
  return <AppShell isAdmin>{children}</AppShell>;
}
