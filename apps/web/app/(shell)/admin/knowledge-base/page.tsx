import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import type { AdminKBEntry } from "@/lib/api";
import { KnowledgeBaseScreen } from "@/components/admin/KnowledgeBaseScreen";

/**
 * Knowledge base (`08` §10). Shows the RAG corpus backing the AI coach and
 * offers a reindex trigger. Honesty is the explicit design requirement here
 * (FR §5.5): `last_indexed_at` is never tracked, and "reindex" is a stub
 * that returns a fabricated job ID and tells the operator to run a CLI
 * command themselves (FR §4.7) — this page must not dress that up as a
 * real job queue.
 *
 * Server Component: fetches the token and the first page of source entries
 * for first paint; the client screen owns the client-side retry path plus
 * the reindex/status dialog.
 */
export default async function AdminKnowledgeBasePage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const token = session.access_token;

  let initialEntries: AdminKBEntry[] | null = null;
  let initialLoadFailed = false;
  try {
    initialEntries = await api.admin.knowledgeBase(token);
  } catch {
    initialLoadFailed = true;
  }

  return (
    <KnowledgeBaseScreen
      token={token}
      initialEntries={initialEntries}
      initialLoadFailed={initialLoadFailed}
    />
  );
}
