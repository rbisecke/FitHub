import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { api } from "@/lib/api/client";
import { ProfilePage } from "@/components/profile/ProfilePage";
import { ProfileSkeleton } from "@/components/profile/ProfileSkeleton";

async function ProfileContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token ?? "";

  const [profile, stats, partners] = await Promise.all([
    api.profile.get(token),
    api.profile.stats(token),
    api.trainingPartners(token),
  ]);

  return (
    <ProfilePage
      profile={{ ...profile, email: user.email ?? profile.email }}
      stats={stats}
      partners={partners}
      token={token}
    />
  );
}

export default function ProfileRoute() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent />
    </Suspense>
  );
}
