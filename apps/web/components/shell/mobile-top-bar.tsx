"use client";

import { usePathname } from "next/navigation";
import { GitBranch } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { AccountMenu } from "./account-menu";
import { isAdminRoute } from "./active-segment";

/**
 * Mobile top bar (Effort 1, step 1.6).
 *
 * The mobile bottom bar holds only the primary five, so the secondary nav and the
 * admin role-switch live behind the account/"more" menu here. Brand on the left,
 * `NotificationBell` (06 §7) + `AccountMenu` on the right. Mobile-only — the
 * desktop shell uses the sidebar + `ShellTopBar` instead.
 *
 * Suppressed entirely on `/admin` routes — the admin console builds its own
 * complete mobile treatment (the desktop-only gate's notice), so this bar
 * would otherwise bleed member chrome (brand, bell, account menu) on top of
 * it. See `isAdminRoute`.
 */
export function MobileTopBar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  if (isAdminRoute(pathname)) return null;

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur md:hidden">
      <div className="flex items-center gap-2">
        <GitBranch className="size-5 text-[var(--accent)]" aria-hidden="true" />
        <span className="type-h3">FitHub</span>
      </div>
      <div className="flex items-center gap-1">
        <NotificationBell mode="mobile" />
        <AccountMenu isAdmin={isAdmin} includeOverflowNav />
      </div>
    </header>
  );
}
