import { SHELL_BASE, navHref } from "./nav-items";

/**
 * True when `pathname` is on (or nested under) the given nav segment's route.
 * Matching is exact-or-descendant so `/preview/log/new` still lights the Log tab
 * while `/preview/logbook` (a hypothetical sibling) would not.
 */
export function isSegmentActive(pathname: string, segment: string): boolean {
  const href = navHref(segment);
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The active nav segment for a pathname, or null when off the shell entirely. */
export function activeSegment(pathname: string): string | null {
  if (pathname !== SHELL_BASE && !pathname.startsWith(`${SHELL_BASE}/`)) {
    return null;
  }
  const rest = pathname.slice(SHELL_BASE.length).replace(/^\//, "");
  return rest.split("/")[0] || null;
}
