"use client";

import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
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

      {/* Log Workout CTA */}
      <div className="py-3">
        <SidebarLogCTA />
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
