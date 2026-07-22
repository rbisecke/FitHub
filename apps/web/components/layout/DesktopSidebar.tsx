"use client";

import { useLayoutEffect, useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import {
  Sidebar,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { SidebarBrand } from "./SidebarBrand";
import { SidebarNav } from "./SidebarNav";
import { SidebarStreakWidget } from "./SidebarStreakWidget";
import { SidebarProfileFooter } from "./SidebarProfileFooter";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api/client";
import type { StreakState } from "@/lib/api";

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
  isAdmin?: boolean;
}

export function DesktopSidebar({ user, isAdmin }: Props) {
  const [streak, setStreak] = useState<StreakState | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled || !data.session) return;
      const token = data.session.access_token;
      try {
        const result = await api.profile.getStreak(token, {
          signal: controller.signal,
        });
        if (cancelled) return;
        setStreak(result);
      } catch {
        // streak display is non-critical
      }
    });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

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

        <SidebarNav isAdmin={isAdmin} />

        <SidebarStreakWidget streak={streak} />

        <SidebarProfileFooter user={user} />
      </Sidebar>
    </>
  );
}
