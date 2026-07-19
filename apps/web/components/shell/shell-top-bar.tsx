"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NAV_ITEMS } from "./nav-items";
import { activeSegment } from "./active-segment";

/**
 * Desktop content-area top bar (Effort 1, step 1.4).
 *
 * Holds the sidebar collapse trigger and a page-label breadcrumb so the bar has a
 * purpose before real screens land — the current nav label sits after the trigger,
 * derived from the route. Desktop-only; the mobile shell has its own top bar.
 */
export function ShellTopBar() {
  const pathname = usePathname();
  const segment = activeSegment(pathname);
  const label = NAV_ITEMS.find((i) => i.segment === segment)?.label;

  return (
    <div className="sticky top-0 z-30 hidden h-12 items-center gap-2 border-b border-border bg-background/80 px-2 backdrop-blur md:flex">
      <SidebarTrigger />
      <span aria-hidden="true" className="h-5 w-px bg-border" />
      {label ? (
        <span className="type-small font-medium text-foreground">{label}</span>
      ) : null}
    </div>
  );
}
