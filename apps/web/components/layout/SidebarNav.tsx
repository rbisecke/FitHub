"use client";

import Link from "next/link";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { SidebarNavItem } from "./SidebarNavItem";
import { SidebarLogCTA } from "./SidebarLogCTA";
import { NAV_ITEMS } from "./nav-config";

const ABOVE_CTA = NAV_ITEMS.slice(0, 2); // Dashboard, Records
const BELOW_CTA = NAV_ITEMS.slice(2); // History, Progress

export function SidebarNav() {
  return (
    <SidebarContent>
      <SidebarGroup className="py-2">
        <SidebarGroupContent>
          <SidebarMenu>
            {ABOVE_CTA.map((item) => (
              <SidebarNavItem key={item.href} {...item} />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarSeparator />

      {/* Log Workout CTA + git tag secondary */}
      <div className="py-3 space-y-1">
        <SidebarLogCTA />
        <div className="px-2 group-data-[collapsible=icon]:hidden">
          <SidebarMenu>
            <SidebarMenuItem>
              <Link
                href="/log/tag"
                className="block px-3 py-1 font-mono text-xs text-[#8b949e] hover:text-[#e6edf3] transition-colors rounded-md hover:bg-sidebar-accent"
              >
                $ git tag
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </div>

      <SidebarSeparator />

      <SidebarGroup className="py-2">
        <SidebarGroupContent>
          <SidebarMenu>
            {BELOW_CTA.map((item) => (
              <SidebarNavItem key={item.href} {...item} />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}
