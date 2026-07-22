"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { NAV_ITEMS } from "./nav-items";
import { activeSegment, isAdminRoute } from "./active-segment";

/**
 * Desktop content-area top bar (Effort 1, step 1.4).
 *
 * Holds the sidebar collapse trigger and a page-label breadcrumb so the bar has a
 * purpose before real screens land — the current nav label sits after the trigger,
 * derived from the route. Desktop-only; the mobile shell has its own top bar.
 *
 * `NotificationBell` (06 §7) is the redesigned shell's entry point into the
 * notification feed — the legacy pre-redesign shell wires the same component
 * into its own header, but this is the one live in the `(shell)` route group.
 */
export function ShellTopBar() {
  const pathname = usePathname();
  // The admin console builds its own header (`AdminConsoleHeader`) — this
  // bar's own SidebarTrigger targets the member sidebar, which doesn't
  // render on admin routes either, so showing this here would be a dead
  // control plus a stale breadcrumb. See `isAdminRoute`.
  if (isAdminRoute(pathname)) return null;

  const segment = activeSegment(pathname);
  const label = NAV_ITEMS.find((i) => i.segment === segment)?.label;

  return (
    <div className="sticky top-0 z-30 hidden h-12 items-center gap-2 border-b border-border bg-background/80 px-2 backdrop-blur md:flex">
      <SidebarTrigger />
      <span aria-hidden="true" className="h-5 w-px bg-border" />
      {label ? (
        <span className="type-small font-medium text-foreground">{label}</span>
      ) : null}
      <div className="ml-auto flex items-center pr-2">
        <NotificationBell mode="desktop" />
      </div>
    </div>
  );
}
