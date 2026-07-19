"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api/client";
import type {
  UserProfile,
  ProfileStats,
  PinnedMovement,
  TrainingPartner,
} from "@/lib/api";
import { IdentityHeader } from "./identity-header";
import { IdentityEditSheet } from "./identity-edit-sheet";
import { StatsStrip } from "./stats-strip";
import { PinnedMovementsSection } from "./pinned-movements-section";
import { SettingsSection } from "./settings-section";
import { TrainingPartnersSection } from "./training-partners-section";
import { AccountSection } from "./account-section";

/**
 * Profile & Settings orchestrator (08 §3). The server page fetches the
 * initial profile (needed for the identity header's first paint); stats,
 * pins, and partners are fetched client-side here since they aren't needed
 * for the route guard and each has its own loading/empty state.
 */
export function ProfilePage({
  token,
  userId,
  initialProfile,
}: {
  token: string;
  userId: string;
  initialProfile: UserProfile;
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [email, setEmail] = useState<string | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [pins, setPins] = useState<PinnedMovement[]>([]);
  const [pinsLoading, setPinsLoading] = useState(true);
  const [partners, setPartners] = useState<TrainingPartner[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!cancelled) setEmail(data.user?.email ?? null);
      })
      .catch(() => {
        // email overlay is best-effort; the header falls back gracefully
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    api.profile
      .stats(token, { signal: controller.signal })
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      .catch((err) => {
        if (!cancelled && !controller.signal.aborted) {
          toast.error("Couldn't load your stats.");
          void err;
        }
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [token]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    api.profile
      .getPinnedMovements(token, { signal: controller.signal })
      .then((p) => {
        if (!cancelled) setPins(p);
      })
      .catch((err) => {
        if (!cancelled && !controller.signal.aborted) {
          toast.error("Couldn't load pinned movements.");
          void err;
        }
      })
      .finally(() => {
        if (!cancelled) setPinsLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [token]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    api
      .trainingPartners(token, { signal: controller.signal })
      .then((p) => {
        if (!cancelled) setPartners(p);
      })
      .catch((err) => {
        if (!cancelled && !controller.signal.aborted) {
          toast.error("Couldn't load training partners.");
          void err;
        }
      })
      .finally(() => {
        if (!cancelled) setPartnersLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [token]);

  return (
    <div className="pb-nav-safe mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6">
      <IdentityHeader
        profile={profile}
        email={email}
        userId={userId}
        onEdit={() => setEditOpen(true)}
      />
      <StatsStrip stats={stats} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <PinnedMovementsSection
            token={token}
            loading={pinsLoading}
            pins={pins}
            onPinsChange={setPins}
          />
          <TrainingPartnersSection
            token={token}
            loading={partnersLoading}
            partners={partners}
            onPartnersChange={setPartners}
          />
        </div>
        <div className="flex flex-col gap-6">
          <SettingsSection
            token={token}
            profile={profile}
            onProfileChange={setProfile}
          />
          <AccountSection />
        </div>
      </div>

      <IdentityEditSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        token={token}
        profile={profile}
        onSaved={setProfile}
      />
    </div>
  );
}
