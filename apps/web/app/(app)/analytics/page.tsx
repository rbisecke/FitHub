import { redirect } from "next/navigation";

/**
 * Legacy-path redirect: the old `/analytics` dashboard was replaced by the
 * redesigned `/progress` shell route (Effort 6). Kept as a redirect (not a
 * 404) because the still-live legacy shell's nav-config still links to
 * `/analytics`. Old `/analytics` widgets are intentionally gone now that
 * Progress is rebuilt.
 */
export default function AnalyticsRedirect(): never {
  redirect("/progress");
}
