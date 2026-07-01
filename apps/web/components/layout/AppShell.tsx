"use client";

import { type CSSProperties, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Toaster } from "@/components/ui/sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DesktopSidebar } from "./DesktopSidebar";
import { DesktopHeader } from "./DesktopHeader";
import { MobileHeader } from "./MobileHeader";
import { MobileBottomNav } from "./MobileBottomNav";

// Expand the collapsed sidebar icon width from 3rem → 4rem (64px)
const SIDEBAR_STYLE: CSSProperties = {
  "--sidebar-width-icon": "4rem",
} as CSSProperties;

interface Props {
  user: User;
  defaultSidebarOpen: boolean;
  handle?: string;
  children: React.ReactNode;
}

export function AppShell({
  user,
  defaultSidebarOpen,
  handle = "user",
  children,
}: Props) {
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Move focus to main content on route change for screen readers
  useEffect(() => {
    mainRef.current?.focus();
  }, [pathname]);

  const initial = prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 };
  const animate = prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 };
  const transition = {
    duration: prefersReducedMotion ? 0.05 : 0.15,
    ease: "easeInOut" as const,
  };

  return (
    <SidebarProvider defaultOpen={defaultSidebarOpen} style={SIDEBAR_STYLE}>
      {/* Skip to main content — first focusable element in DOM */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:bg-[var(--surface)] focus:px-4 focus:py-2 focus:text-[var(--text)] focus:outline focus:outline-[var(--accent)]"
      >
        Skip to main content
      </a>

      <DesktopSidebar user={user} />

      {/* Content column */}
      <div className="flex flex-1 flex-col min-h-screen overflow-hidden">
        <MobileHeader user={user} streak={0} />
        <DesktopHeader handle={handle} streak={0} branch="main" />

        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={pathname}
            ref={mainRef}
            id="main-content"
            tabIndex={-1}
            initial={initial}
            animate={animate}
            exit={{ opacity: 0 }}
            transition={transition}
            className="flex-1 overflow-auto outline-none pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0"
          >
            {children}
          </motion.main>
        </AnimatePresence>

        <MobileBottomNav />
      </div>

      <Toaster position="bottom-right" />
    </SidebarProvider>
  );
}
