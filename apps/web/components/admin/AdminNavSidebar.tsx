"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GitBranch } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  ADMIN_NAV_ITEMS,
  adminNavHref,
  isAdminSegmentActive,
  type AdminNavItem,
} from "./admin-nav-items";
import { cn } from "@/lib/utils";

/**
 * Same active-state treatment as the member `DesktopSidebar` (a solid accent
 * left-rail + accent icon/label) so the current section reads the same way in
 * both shells — visible in the 64px icon rail too.
 */
const ACTIVE_NAV_CLASS = cn(
  "relative",
  "data-active:text-[var(--accent)]",
  "data-active:[&_svg]:text-[var(--accent)]",
  "data-active:before:absolute data-active:before:inset-y-1 data-active:before:left-0",
  "data-active:before:w-[3px] data-active:before:rounded-full data-active:before:bg-[var(--accent)]",
);

function NavRow({ item, pathname }: { item: AdminNavItem; pathname: string }) {
  const Icon = item.icon;
  const active = isAdminSegmentActive(pathname, item.segment);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        tooltip={item.label}
        className={ACTIVE_NAV_CLASS}
        render={
          <Link
            href={adminNavHref(item.segment)}
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

/**
 * Admin console left nav (Effort 10; `08` §4) — the same shadcn `Sidebar`
 * primitive the member desktop shell uses (`desktop-sidebar.tsx`), not a
 * bespoke fixed-width nav. Collapses 256px → 64px icon-rail, same as the
 * member sidebar. The brand mark tints amber rather than the ordinary
 * `--accent` blue, echoing the "Admin" badge in `AdminConsoleHeader` as a
 * quiet, consistent signal that this is the privileged operator mode.
 */
export function AdminNavSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex h-8 items-center gap-2 px-1">
          <GitBranch
            className="size-5 shrink-0 text-[var(--amber)]"
            aria-hidden="true"
          />
          <span className="type-h3 truncate group-data-[collapsible=icon]:hidden">
            Admin
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup role="navigation" aria-label="Admin console">
          <SidebarGroupContent>
            <SidebarMenu>
              {ADMIN_NAV_ITEMS.map((item) => (
                <NavRow key={item.segment} item={item} pathname={pathname} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
      <SidebarRail />
    </Sidebar>
  );
}
