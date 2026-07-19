import {
  Activity,
  CalendarRange,
  CircleUser,
  Dumbbell,
  HeartPulse,
  MessageSquare,
  Plug,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Global navigation model (Effort 1, `00` Part 4 route table).
 *
 * Single source of truth for the app shell: the mobile bottom-tab bar (primary 5),
 * the desktop `Sidebar` (primary 5 + divider + secondary 5), and active-route
 * matching all read from this list.
 *
 * ROUTE MOUNT NOTE: the redesigned shell is built alongside the still-live legacy
 * app (the `(app)`/`(admin)` route groups), which already own bare `/coach`,
 * `/injuries`, `/integrations`, `/profile`, and `/admin`. Next.js forbids two
 * `page.tsx` resolving the same path, so the redesign is mounted under the
 * `SHELL_BASE` prefix until the final cutover Effort removes the legacy routes.
 * At cutover, set `SHELL_BASE = ""` and every link resolves to the bare `00` Part 4
 * path with no other change.
 */
export const SHELL_BASE = "/preview";

export type NavTier = "primary" | "secondary";

export interface NavItem {
  /** Stable id + active-match key — the path segment after `SHELL_BASE`. */
  segment: string;
  /** Human label shown in the tab bar / sidebar. */
  label: string;
  icon: LucideIcon;
  tier: NavTier;
  /** Rendered only for allowlisted admin accounts (`00` Part 4). */
  adminGated?: boolean;
}

/** Build a routable href for a nav item, honoring the shell prefix. */
export function navHref(segment: string): string {
  return `${SHELL_BASE}/${segment}`;
}

/** Ordered nav model — primary five first, then the secondary five. */
export const NAV_ITEMS: readonly NavItem[] = [
  // Primary — the bottom tab bar / pinned sidebar top.
  { segment: "today", label: "Today", icon: Activity, tier: "primary" },
  { segment: "log", label: "Log", icon: Dumbbell, tier: "primary" },
  { segment: "plan", label: "Plan", icon: CalendarRange, tier: "primary" },
  { segment: "coach", label: "Coach", icon: MessageSquare, tier: "primary" },
  { segment: "progress", label: "Progress", icon: TrendingUp, tier: "primary" },
  // Secondary — profile/more overflow on mobile, below the divider on desktop.
  { segment: "social", label: "Social", icon: Users, tier: "secondary" },
  {
    segment: "injuries",
    label: "Injuries",
    icon: HeartPulse,
    tier: "secondary",
  },
  {
    segment: "integrations",
    label: "Integrations",
    icon: Plug,
    tier: "secondary",
  },
  { segment: "profile", label: "Profile", icon: CircleUser, tier: "secondary" },
  {
    segment: "admin",
    label: "Admin",
    icon: Shield,
    tier: "secondary",
    adminGated: true,
  },
] as const;

export const PRIMARY_NAV = NAV_ITEMS.filter((i) => i.tier === "primary");
export const SECONDARY_NAV = NAV_ITEMS.filter((i) => i.tier === "secondary");
