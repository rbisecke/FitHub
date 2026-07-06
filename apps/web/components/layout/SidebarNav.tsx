"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SidebarNavItem } from "./SidebarNavItem";
import { ADMIN_NAV_ITEM, NAV_ITEMS, isNavItemActive } from "./nav-config";

interface Props {
  isAdmin?: boolean;
}

export function SidebarNav({ isAdmin }: Props) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const adminActive = isNavItemActive(pathname, ADMIN_NAV_ITEM.href);
  const AdminIcon = ADMIN_NAV_ITEM.icon;

  const adminLinkEl = (
    <Link
      href={ADMIN_NAV_ITEM.href}
      aria-current={adminActive ? "page" : undefined}
      className={cn(
        "flex w-full rounded-[10px] text-sm transition-colors",
        "ring-sidebar-ring outline-hidden focus-visible:ring-2",
        "flex-col items-start gap-0.5 py-2.5 px-3",
        "group-data-[collapsible=icon]:flex-row group-data-[collapsible=icon]:items-center",
        "group-data-[collapsible=icon]:justify-center",
        "group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:p-0",
        adminActive
          ? "bg-[rgba(255,200,61,0.10)] hover:bg-[rgba(255,200,61,0.14)]"
          : "hover:bg-[var(--surface-2)]",
      )}
    >
      <div className="flex items-center gap-2.5">
        <AdminIcon
          className={cn(
            "h-5 w-5 shrink-0",
            adminActive
              ? "text-[var(--gold)]"
              : "text-[var(--gold)] opacity-60",
          )}
        />
        <span
          className={cn(
            "text-sm group-data-[collapsible=icon]:hidden",
            adminActive
              ? "text-[var(--gold)] font-bold"
              : "text-[var(--gold)] opacity-60 font-medium",
          )}
        >
          {ADMIN_NAV_ITEM.label}
        </span>
      </div>
      <span className="font-mono text-[10px] text-[var(--muted)] group-data-[collapsible=icon]:hidden pl-[30px]">
        {ADMIN_NAV_ITEM.gitCommand}
      </span>
    </Link>
  );

  return (
    <SidebarContent>
      <SidebarGroup className="py-2">
        <SidebarGroupContent>
          <SidebarMenu>
            {NAV_ITEMS.map((item) => (
              <SidebarNavItem key={item.href} {...item} />
            ))}

            {isAdmin && (
              <>
                <li
                  role="separator"
                  className="mx-2 my-2 h-px bg-[var(--border)]"
                  aria-hidden="true"
                />
                {state === "collapsed" ? (
                  <SidebarMenuItem className="flex items-center justify-center">
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Link
                            href={ADMIN_NAV_ITEM.href}
                            aria-label={ADMIN_NAV_ITEM.label}
                            aria-current={adminActive ? "page" : undefined}
                            className={cn(
                              "flex w-full rounded-[10px] text-sm transition-colors",
                              "ring-sidebar-ring outline-hidden focus-visible:ring-2",
                              "items-center justify-center h-10 w-10 p-0",
                              adminActive
                                ? "bg-[rgba(255,200,61,0.10)]"
                                : "hover:bg-[var(--surface-2)]",
                            )}
                          />
                        }
                      >
                        <AdminIcon
                          className={cn(
                            "h-5 w-5 shrink-0",
                            adminActive
                              ? "text-[var(--gold)]"
                              : "text-[var(--gold)] opacity-60",
                          )}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {ADMIN_NAV_ITEM.label}
                      </TooltipContent>
                    </Tooltip>
                  </SidebarMenuItem>
                ) : (
                  <SidebarMenuItem>{adminLinkEl}</SidebarMenuItem>
                )}
              </>
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}
