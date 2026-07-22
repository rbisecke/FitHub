import { navHref } from "./nav-items";

/**
 * True when `pathname` is on (or nested under) the given nav segment's route.
 * Matching is exact-or-descendant so `/log/new` still lights the Log tab while
 * `/logbook` (a hypothetical sibling) would not.
 */
export function isSegmentActive(pathname: string, segment: string): boolean {
  const href = navHref(segment);
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The active nav segment for a pathname — its first path segment, or null at the
 * root. Callers match the result against `NAV_ITEMS`, so non-nav paths resolve to
 * no label without a separate allowlist here.
 */
export function activeSegment(pathname: string): string | null {
  const rest = pathname.replace(/^\//, "");
  return rest.split("/")[0] || null;
}

/**
 * True for any `/admin` route. The admin console (Effort 10; `08` §4) builds
 * its own complete shell (Sidebar, header, infra strip) inside
 * `app/(shell)/admin/layout.tsx` — a deliberately distinct "operator" mode,
 * entered via an abrupt cut, not an ambient theme that follows the route. The
 * member-facing chrome components (`DesktopSidebar`, `ShellTopBar`,
 * `MobileTopBar`, `MobileBottomNav`) each use this to suppress themselves on
 * admin routes, since otherwise they'd render around/underneath the admin
 * shell's own Sidebar and header — literally overlapping, since both are
 * `position: fixed` at the same coordinates.
 */
export function isAdminRoute(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}
