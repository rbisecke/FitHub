import { redirect } from "next/navigation";

/**
 * Legacy-path redirect: the old `/team-sessions` was folded into the redesigned
 * `/social` shell route. Kept as a redirect (not a 404) for bookmarks and any lingering
 * links. Old `/team-sessions/[id]` detail is intentionally gone until Social is rebuilt
 * (Effort 8).
 */
export default function TeamSessionsRedirect(): never {
  redirect("/social");
}
