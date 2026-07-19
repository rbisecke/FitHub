import { redirect } from "next/navigation";

/**
 * Legacy-path redirect: the old `/records` was folded into the redesigned `/progress`
 * shell route. Kept as a redirect (not a 404) because the still-live legacy shell's
 * nav-config and dashboard widgets still link to `/records`. Old `/records/[movementId]`
 * detail is intentionally gone until Progress is rebuilt (Effort 6).
 */
export default function RecordsRedirect(): never {
  redirect("/progress");
}
