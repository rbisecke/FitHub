import { redirect } from "next/navigation";

/**
 * Legacy-path redirect: the old `/dashboard` was replaced by the redesigned `/today`
 * shell route. Kept as a redirect (not a 404) because the still-live legacy shell's
 * nav-config, `not-found`, and several old widgets still link to `/dashboard`.
 */
export default function DashboardRedirect(): never {
  redirect("/today");
}
