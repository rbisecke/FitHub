"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { isNavItemActive } from "./nav-config";

interface Props {
  href: string;
  label: string;
  icon: LucideIcon;
  gitCommand: string;
}

export function SidebarNavItem({ href, label, icon: Icon, gitCommand }: Props) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const active = isNavItemActive(pathname, href);

  const linkEl = (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        // Base
        "flex w-full rounded-[10px] text-sm transition-colors",
        "ring-sidebar-ring outline-hidden focus-visible:ring-2",
        // Hover (default, overridden when active)
        "hover:bg-[var(--surface-2)] hover:text-[var(--text)]",
        // Expanded: two-line flex-col layout with left padding
        "flex-col items-start gap-0.5 py-2.5 px-3",
        // Collapsed: centered icon square
        "group-data-[collapsible=icon]:flex-row group-data-[collapsible=icon]:items-center",
        "group-data-[collapsible=icon]:justify-center",
        "group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:p-0",
        // Active: green tint background
        active && "bg-[rgba(74,222,128,0.10)] hover:bg-[rgba(74,222,128,0.14)]",
      )}
    >
      <div className="flex items-center gap-2.5">
        <Icon
          className={cn(
            "h-5 w-5 shrink-0",
            active ? "text-[var(--accent)]" : "text-[var(--muted)]",
          )}
        />
        <span
          className={cn(
            "text-sm group-data-[collapsible=icon]:hidden",
            active
              ? "text-[var(--accent)] font-bold"
              : "text-[var(--muted)] font-medium",
          )}
        >
          {label}
        </span>
      </div>
      <span className="font-mono text-[10px] text-[var(--muted)] group-data-[collapsible=icon]:hidden pl-[30px]">
        {gitCommand}
      </span>
    </Link>
  );

  if (state === "collapsed") {
    return (
      <SidebarMenuItem className="flex items-center justify-center">
        <Tooltip>
          <TooltipTrigger
            render={
              <Link
                href={href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex w-full rounded-[10px] text-sm transition-colors",
                  "ring-sidebar-ring outline-hidden focus-visible:ring-2",
                  "hover:bg-[var(--surface-2)]",
                  "items-center justify-center h-10 w-10 p-0",
                  active && "bg-[rgba(74,222,128,0.10)]",
                )}
              />
            }
          >
            <Icon
              className={cn(
                "h-5 w-5 shrink-0",
                active ? "text-[var(--accent)]" : "text-[var(--muted)]",
              )}
            />
          </TooltipTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      </SidebarMenuItem>
    );
  }

  return <SidebarMenuItem>{linkEl}</SidebarMenuItem>;
}
