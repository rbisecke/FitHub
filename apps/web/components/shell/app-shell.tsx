import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DesktopSidebar } from "./desktop-sidebar";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { ShellTopBar } from "./shell-top-bar";

/**
 * Redesign app shell (Effort 1, `00` Part 4).
 *
 * Composes the global nav chrome around every routed screen:
 * - desktop (`md:`+): the `Sidebar` (primary 5 · divider · secondary 5), 256px
 *   expanded → 64px icon-rail, with a collapse trigger;
 * - mobile: the bottom-tab bar + quick-log FAB.
 *
 * A Server Component so the routed `children` stay server-rendered — only the nav
 * islands (`DesktopSidebar`, `MobileBottomNav`) are client components. The sidebar
 * open/closed default is read from the `sidebar_state` cookie so the first server
 * paint matches the user's last choice (no expand/collapse flash).
 *
 * `isAdmin` gates the Admin nav item; in this signed-out preview shell it is passed
 * in by the route layout (real allowlist gating lands with auth in Effort 2).
 */
export async function AppShell({
  children,
  isAdmin = false,
}: {
  children: ReactNode;
  isAdmin?: boolean;
}) {
  const cookieStore = await cookies();
  const raw = cookieStore.get("sidebar_state")?.value;
  const defaultOpen = raw !== undefined ? raw === "true" : true;

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <DesktopSidebar isAdmin={isAdmin} />
      <SidebarInset className="min-h-svh">
        <ShellTopBar />
        {/* SidebarInset is itself the page's single <main> landmark; this wrapper
            only carries the bottom padding that clears the mobile nav bar. */}
        <div className="pb-nav-safe md:pb-0">{children}</div>
        <MobileBottomNav />
      </SidebarInset>
    </SidebarProvider>
  );
}
