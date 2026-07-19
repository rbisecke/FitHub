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
 * ROUTE MOUNT NOTE: the redesigned shell now lives at bare paths (`/today`, `/log`,
 * … `/admin`) inside the `(shell)` route group. This was the cutover from the earlier
 * `/preview/*` staging prefix: on this isolated redesign branch the new shell replaces
 * the legacy `(app)`/`(admin)` routes outright as each domain is rebuilt, so a segment
 * name here is the whole href.
 */

export type NavTier = "primary" | "secondary";

export interface NavItem {
  /** Stable id + active-match key — the bare route's path segment. */
  segment: string;
  /** Human label shown in the tab bar / sidebar. */
  label: string;
  icon: LucideIcon;
  tier: NavTier;
  /** Rendered only for allowlisted admin accounts (`00` Part 4). */
  adminGated?: boolean;
}

/** Build a routable href for a nav item — the bare `/segment` path. */
export function navHref(segment: string): string {
  return `/${segment}`;
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
