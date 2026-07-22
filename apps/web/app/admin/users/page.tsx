import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import { UsersTable } from "@/components/admin/UsersTable";
import type { AdminUser } from "@/lib/api";

/**
 * User management (`08` §6). Server Component: fetches the session token and
 * the (≤200-row) member list for first paint; `UsersTable` owns search,
 * sort, and the disable/magic-link/delete actions.
 */
export default async function AdminUsersPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const token = session.access_token;

  let initialUsers: AdminUser[] | null = null;
  let initialLoadFailed = false;
  try {
    initialUsers = await api.admin.users(token);
  } catch {
    initialLoadFailed = true;
  }

  return (
    <UsersTable
      token={token}
      initialUsers={initialUsers}
      initialLoadFailed={initialLoadFailed}
    />
  );
}
