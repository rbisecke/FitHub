import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import { AccessRequestsPanel } from "@/components/admin/AccessRequestsPanel";
import type { AdminAccessRequest, AdminUser } from "@/lib/api";

/**
 * Access requests queue (`08` §5). Server Component: fetches the session
 * token, the full request queue (all statuses, so the tab counts are correct
 * on first paint), and the admin users list (used to resolve an approved
 * request's underlying `user_id` for the "Copy magic link" shortcut — see
 * `AccessRequestsPanel`).
 */
export default async function AdminAccessRequestsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const token = session.access_token;

  let requests: AdminAccessRequest[] = [];
  let users: AdminUser[] = [];
  try {
    [requests, users] = await Promise.all([
      api.admin.accessRequests(token),
      api.admin.users(token),
    ]);
  } catch {
    // Best-effort first paint — the panel renders an empty queue rather than
    // blocking the route; an admin can reload to retry.
  }

  return <AccessRequestsPanel initial={requests} users={users} token={token} />;
}
