import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";

/**
 * Redesign app-shell layout (Effort 1, `00` Part 4).
 *
 * Wraps every routed screen in the global nav chrome (`AppShell`). A Server
 * Component; `AppShell` is server-rendered too, so the placeholder route segments
 * below stay on the server.
 */
export default function ShellLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
