"use client";

import { useLayoutEffect } from "react";
import type { User } from "@supabase/supabase-js";
import {
  Sidebar,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { SidebarBrand } from "./SidebarBrand";
import { SidebarNav } from "./SidebarNav";
import { SidebarProfileFooter } from "./SidebarProfileFooter";

function InitialCollapseGuard() {
  const { setOpen } = useSidebar();
  useLayoutEffect(() => {
    // If there's no persisted cookie state, default based on viewport:
    // collapsed at md: (< 1024px), expanded at lg: (≥ 1024px)
    const hasCookie = document.cookie
      .split(";")
      .some((c) => c.trim().startsWith("sidebar_state="));
    if (!hasCookie) {
      setOpen(window.innerWidth >= 1024);
    }
  }, [setOpen]);
  return null;
}

interface Props {
  user: User;
}

export function DesktopSidebar({ user }: Props) {
  return (
    <>
      <InitialCollapseGuard />
      <Sidebar
        collapsible="icon"
        className="hidden md:flex border-r border-[var(--border)]"
      >
        <SidebarHeader className="flex flex-row items-center justify-between border-b border-[var(--border)] gap-0 pr-1">
          <SidebarBrand />
          <SidebarTrigger className="text-[var(--muted)] hover:text-[var(--text)] shrink-0" />
        </SidebarHeader>

        <SidebarNav />

        <SidebarProfileFooter user={user} />
      </Sidebar>
    </>
  );
}
