import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CoachShell } from "@/components/coach/CoachShell";

export default async function CoachPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session!.access_token;

  return <CoachShell token={token} userEmail={user.email ?? ""} />;
}
