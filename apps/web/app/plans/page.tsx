import { redirect } from "next/navigation";

/**
 * Legacy-path redirect: the old `/plans` list was replaced by the redesigned `/plan`
 * shell route. Kept as a redirect (not a 404) because the still-live legacy shell's
 * nav-config and hub grid still link to `/plans`. Old `/plans/*` detail sub-routes are
 * intentionally gone until Plan is rebuilt (Effort 5).
 */
export default function PlansRedirect(): never {
  redirect("/plan");
}
