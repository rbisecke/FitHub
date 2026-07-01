"use client";

import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { SidebarNavItem } from "./SidebarNavItem";
import { NAV_ITEMS } from "./nav-config";

export function SidebarNav() {
  return (
    <SidebarContent>
      <SidebarGroup className="py-2">
        <SidebarGroupContent>
          <SidebarMenu>
            {NAV_ITEMS.map((item) => (
              <SidebarNavItem key={item.href} {...item} />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}
