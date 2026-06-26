"use client";

import { useState } from "react";
import type {
  UserProfile,
  ProfileStats,
  TrainingPartner,
  FrequencyTarget,
  PinnedMovement,
} from "@/lib/api";
import { ProfileHeader } from "./ProfileHeader";
import { StatsSummaryStrip } from "./StatsSummaryStrip";
import { PartnerList } from "./PartnerList";
import { SettingsSection } from "./SettingsSection";
import { FrequencyTargetControl } from "./FrequencyTargetControl";
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
    <div className="animate-fade-in">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <ProfileHeader
          profile={profile}
          accessToken={token}
          onProfileUpdate={setProfile}
        />

        <StatsSummaryStrip stats={stats} />

        <PinnedMovements initial={pinned} accessToken={token} />

        <SettingsSection label="Training Partners">
          <PartnerList initial={partners} token={token} />
        </SettingsSection>

        <SettingsSection label="Settings">
          <FrequencyTargetControl initial={frequencyTarget} token={token} />
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
            <p className="text-sm text-[--text]">Theme</p>
            <span className="text-sm text-[--muted]">Dark (default)</span>
          </div>
        </SettingsSection>

        <SettingsSection label="Notifications">
          <p className="py-3 text-sm text-[#8b949e]">
            Notifications — coming soon.
          </p>
        </SettingsSection>

        <SettingsSection label="Account">
          <AccountSection />
        </SettingsSection>
      </div>
    </div>
  );
}
