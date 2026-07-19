import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import { ForcedTheme } from "@/components/shared/forced-theme";
import { ProfilePage as ProfilePageContent } from "@/components/profile/profile-page";

/**
 * Profile & Settings (08 §3, steps 2.15-2.21). The one light screen in this
 * Effort — §1.1 names "settings" explicitly as a seated-analysis/review
 * moment. Middleware already guards signed-out visitors; this Server
 * Component fetches the session token + initial profile so the identity
 * header has data on first paint, mirroring the onboarding route's pattern.
 */
export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const token = session.access_token;

  let profile;
  try {
    profile = await api.profile.get(token);
  } catch {
    redirect("/login");
  }

  return (
    <ForcedTheme
      theme="light"
      className="min-h-svh bg-background text-foreground"
    >
      <ProfilePageContent
        token={token}
        userId={session.user.id}
        initialProfile={profile}
      />
    </ForcedTheme>
  );
}
