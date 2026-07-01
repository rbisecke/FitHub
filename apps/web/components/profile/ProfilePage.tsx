"use client";

import { useState } from "react";
import type {
  UserProfile,
  ProfileStats,
  TrainingPartner,
  FrequencyTarget,
  PinnedMovement,
} from "@/lib/api";
import { PageHeader } from "@/components/ui/page-header";
import { ProfileHeroCard } from "./ProfileHeroCard";
import { PartnerList } from "./PartnerList";
import { SettingsSection } from "./SettingsSection";
import { FrequencyStepper } from "./FrequencyStepper";
import { CheckinToggle } from "./CheckinToggle";
import { GraphColourToggle } from "./GraphColourToggle";
import { WeightUnitToggle } from "./WeightUnitToggle";
import { DistanceUnitToggle } from "./DistanceUnitToggle";
import { AccountSection } from "./AccountSection";
import { PinnedMovements } from "./PinnedMovements";

interface Props {
  profile: UserProfile;
  stats: ProfileStats;
  partners: TrainingPartner[];
  pinned: PinnedMovement[];
  token: string;
}

export function ProfilePage({
  profile: initialProfile,
  stats,
  partners,
  pinned,
  token,
}: Props) {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);

  const frequencyTarget = (
    [3, 4, 5, 6].includes(profile.frequency_target_days)
      ? profile.frequency_target_days
      : 3
  ) as FrequencyTarget;

  return (
    <div className="animate-fadeUp">
      <div className="max-w-lg mx-auto px-[18px] pt-[14px] pb-2 md:px-4 md:py-6 space-y-6">
        <PageHeader gitCommand="$ git config --user" title="Profile" />

        <ProfileHeroCard
          profile={profile}
          stats={stats}
          accessToken={token}
          onProfileUpdate={setProfile}
        />

        <PinnedMovements initial={pinned} accessToken={token} />

        <SettingsSection label="Training Partners">
          <PartnerList initial={partners} token={token} />
        </SettingsSection>

        <SettingsSection label="Settings">
          <FrequencyStepper initial={frequencyTarget} token={token} />
          <CheckinToggle initial={profile.checkin_enabled} token={token} />
        </SettingsSection>

        <SettingsSection label="Display">
          <GraphColourToggle
            initial={profile.graph_colour_mode}
            token={token}
          />
          <WeightUnitToggle initial={profile.weight_unit} token={token} />
          <DistanceUnitToggle initial={profile.distance_unit} token={token} />
          <div className="flex items-center justify-between py-3">
            <p className="text-sm text-[var(--foreground)]">Theme</p>
            <span className="text-sm text-[var(--muted-foreground)]">
              Dark (default)
            </span>
          </div>
        </SettingsSection>

        <SettingsSection label="Notifications">
          <p className="py-3 text-sm text-[var(--muted-foreground)]">
            Notifications — coming soon.
          </p>
        </SettingsSection>

        <SettingsSection label="Account">
          <AccountSection email={profile.email} />
        </SettingsSection>
      </div>
    </div>
  );
}
