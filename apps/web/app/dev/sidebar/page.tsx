"use client";

/**
 * Scaffold route — the shadcn Sidebar primitive (0.12) re-themed against the new
 * tokens. Used by both the member desktop nav and the admin nav in later Efforts;
 * this route just proves it renders with the design-system sidebar tokens. Safe to
 * delete once the design system is stable.
 */

import {
  Activity,
  Dumbbell,
  CalendarRange,
  MessageSquare,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const ITEMS = [
  { label: "Today", icon: Activity, active: true },
  { label: "Log", icon: Dumbbell, active: false },
  { label: "Plan", icon: CalendarRange, active: false },
  { label: "Coach", icon: MessageSquare, active: false },
  { label: "Progress", icon: TrendingUp, active: false },
  { label: "Social", icon: Users, active: false },
];

export default function SidebarDevPage() {
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <span className="type-h3 px-2">FitHub</span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {ITEMS.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton isActive={item.active}>
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <div
          className="flex min-h-screen flex-col gap-4 p-6"
          style={{ background: "var(--bg)", color: "var(--text)" }}
        >
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            <h1 className="type-h1">Sidebar primitive (0.12)</h1>
          </div>
          <p className="type-small" style={{ color: "var(--muted)" }}>
            64px collapsed → 256px expanded. Toggle with the trigger.
          </p>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
