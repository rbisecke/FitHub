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
 *
 * The two fetches are deliberately independent, each with its own
 * try/catch — this is the human gatekeeping queue for an invite-only app, so
 * a `users` failure (which only degrades the "Copy magic link" shortcut,
 * already handled gracefully by `AccessRequestsPanel` when no match exists)
 * must never blank out a successfully-fetched request queue. A single
 * combined `Promise.all` inside one `catch` previously did exactly that: any
 * failure of either call rendered "No requests waiting." — indistinguishable
 * from a genuinely empty queue.
 */
export default async function AdminAccessRequestsPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const token = session.access_token;

  let requests: AdminAccessRequest[] | null = null;
  let initialLoadFailed = false;
  try {
    requests = await api.admin.accessRequests(token);
  } catch {
    initialLoadFailed = true;
  }

  let users: AdminUser[] = [];
  try {
    users = await api.admin.users(token);
  } catch {
    // Best-effort — only degrades the "Copy magic link" shortcut on approved
    // rows; the request queue itself is unaffected.
  }

  return (
    <AccessRequestsPanel
      initial={requests}
      initialLoadFailed={initialLoadFailed}
      users={users}
      token={token}
    />
  );
}
