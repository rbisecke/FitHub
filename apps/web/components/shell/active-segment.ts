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
