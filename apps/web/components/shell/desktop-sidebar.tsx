"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GitBranch } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { PRIMARY_NAV, SECONDARY_NAV, navHref, type NavItem } from "./nav-items";
import { isSegmentActive } from "./active-segment";
import { cn } from "@/lib/utils";

/**
 * Strengthens the shadcn active state (a weak grey fill on its own) with an
 * accent left-rail + accent icon/label, so the current route is unmistakable and
 * signalled by shape as well as color — and stays visible in the 64px icon rail,
 * where the accent icon is the cue.
 */
const ACTIVE_NAV_CLASS = cn(
  "relative",
  "data-active:text-[var(--accent)]",
  "data-active:[&_svg]:text-[var(--accent)]",
  "data-active:before:absolute data-active:before:inset-y-1 data-active:before:left-0",
  "data-active:before:w-[3px] data-active:before:rounded-full data-active:before:bg-[var(--accent)]",
);

/**
 * Desktop navigation sidebar (Effort 1, step 1.4; `00` Part 4).
 *
 * The shadcn `Sidebar` primitive (Effort 0) composed with the real nav model:
 * the primary five pinned at the top, a divider, then the secondary five. Admin
 * is rendered only for allowlisted admin accounts. Collapses 256px → 64px
 * (icon-only, with tooltips); the mobile bottom-tab bar covers below `md:`.
 */
function NavRow({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = item.icon;
  const active = isSegmentActive(pathname, item.segment);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        tooltip={item.label}
        className={ACTIVE_NAV_CLASS}
        render={
          <Link
            href={navHref(item.segment)}
            aria-current={active ? "page" : undefined}
          >
            <Icon aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        }
      />
    </SidebarMenuItem>
  );
}

export function DesktopSidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const secondary = SECONDARY_NAV.filter((i) => !i.adminGated || isAdmin);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex h-8 items-center gap-2 px-1">
          <GitBranch
            className="size-5 shrink-0 text-[var(--accent)]"
            aria-hidden="true"
          />
          <span className="type-h3 truncate group-data-[collapsible=icon]:hidden">
            FitHub
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup role="navigation" aria-label="Primary">
          <SidebarGroupContent>
            <SidebarMenu>
              {PRIMARY_NAV.map((item) => (
                <NavRow key={item.segment} item={item} pathname={pathname} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup role="navigation" aria-label="More">
          <SidebarGroupLabel>More</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondary.map((item) => (
                <NavRow key={item.segment} item={item} pathname={pathname} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
