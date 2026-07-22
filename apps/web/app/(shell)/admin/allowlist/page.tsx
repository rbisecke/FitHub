import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import type { AdminInvitedEmail } from "@/lib/api";
import { AllowlistScreen } from "@/components/admin/AllowlistScreen";

/**
 * Invite allowlist management (`08` §9). Direct CRUD over `invited_emails`,
 * separate from the request-review queue (§5) — the back-door path an admin
 * uses to allowlist someone without a request, or to revoke access.
 *
 * Server Component: fetches the token and the first page (up to 500, most
 * recent first) for first paint; the client screen owns add/remove and the
 * client-side retry path if this initial fetch fails.
 */
export default async function AdminAllowlistPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const token = session.access_token;

  let initialEmails: AdminInvitedEmail[] | null = null;
  let initialLoadFailed = false;
  try {
    initialEmails = await api.admin.invitedEmails(token);
  } catch {
    initialLoadFailed = true;
  }

  return (
    <AllowlistScreen
      token={token}
      initialEmails={initialEmails}
      initialLoadFailed={initialLoadFailed}
    />
  );
}
