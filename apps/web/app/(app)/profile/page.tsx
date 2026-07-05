import { Suspense } from "react";
import { requireAuth } from "@/lib/supabase/requireAuth";
import { api } from "@/lib/api/client";
import { ProfilePage } from "@/components/profile/ProfilePage";
import { ProfileSkeleton } from "@/components/profile/ProfileSkeleton";

async function ProfileContent() {
  const { token, user } = await requireAuth();

  const [profile, stats, partners, pinned] = await Promise.all([
    api.profile.get(token),
    api.profile.stats(token),
    api.trainingPartners(token),
    api.profile
      .getPinnedMovements(token)
      .catch(() => [] as import("@/lib/api").PinnedMovement[]),
  ]);

  return (
    <ProfilePage
      profile={{ ...profile, email: user.email ?? profile.email }}
      stats={stats}
      partners={partners}
      pinned={pinned}
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
