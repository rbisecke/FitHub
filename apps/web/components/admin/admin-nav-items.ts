import {
  Activity,
  BookOpen,
  DollarSign,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Admin console nav model (Effort 10; `08` §4) — deliberately separate from the
 * member-facing `NAV_ITEMS` (`components/shell/nav-items.ts`). The admin console
 * is a distinct operator shell with its own six sections, not a peer of the member
 * tabs — `AdminNavSidebar` mirrors `desktop-sidebar.tsx`'s structure but reads
 * from this list instead.
 */
export interface AdminNavItem {
  /** Path segment under `/admin` — the stable id + active-match key. */
  segment: string;
  label: string;
  icon: LucideIcon;
}

/** Build a routable href for an admin nav item — `/admin/<segment>`. */
export function adminNavHref(segment: string): string {
  return `/admin/${segment}`;
}

/** Ordered nav model — the six sections named in `08` §4, in spec order. */
export const ADMIN_NAV_ITEMS: readonly AdminNavItem[] = [
  { segment: "access-requests", label: "Access requests", icon: UserCheck },
  { segment: "users", label: "Users", icon: Users },
  { segment: "cost", label: "Cost & usage", icon: DollarSign },
  { segment: "infra", label: "Infra health", icon: Activity },
  { segment: "allowlist", label: "Allowlist", icon: ShieldCheck },
  { segment: "knowledge-base", label: "Knowledge base", icon: BookOpen },
] as const;

/**
 * True when `pathname` is on (or nested under) the given admin nav segment's
 * route. Matching is exact-or-descendant, mirroring `isSegmentActive` in
 * `active-segment.ts`.
 */
export function isAdminSegmentActive(
  pathname: string,
  segment: string,
): boolean {
  const href = adminNavHref(segment);
  return pathname === href || pathname.startsWith(`${href}/`);
}
