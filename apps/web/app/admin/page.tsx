import { redirect } from "next/navigation";

/**
 * `/admin` index (Effort 10; `08` §4/§5) — redirects to the access-requests
 * queue, the operator's default "queue to act on" and the section named
 * first in the nav list.
 */
export default function AdminIndexPage() {
  redirect("/admin/access-requests");
}
