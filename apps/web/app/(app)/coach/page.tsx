import { requireAuth } from "@/lib/supabase/requireAuth";
import { CoachShell } from "@/components/coach/CoachShell";

export default async function CoachPage() {
  const { token, user } = await requireAuth();

  return <CoachShell token={token} userEmail={user.email ?? ""} />;
}
