"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { UserProfile } from "@/lib/api";
import { EditIdentitySheet } from "./EditIdentitySheet";

interface Props {
  profile: UserProfile;
  accessToken: string;
  onProfileUpdate: (updated: UserProfile) => void;
}

export function ProfileHeader({
  profile,
  accessToken,
  onProfileUpdate,
}: Props) {
  const [editOpen, setEditOpen] = useState(false);

  const initials = (profile.display_name ?? profile.email)
    .charAt(0)
    .toUpperCase();

  const rawDate = profile.training_since ?? profile.first_workout_date;
  const trainingSince = rawDate
    ? `$ git init -- ${new Date(rawDate + "T00:00:00").toLocaleString("en-US", {
        month: "short",
        year: "numeric",
      })}`
    : null;

  const locationLine = [profile.location, profile.box_affiliation]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <div className="flex items-start gap-4">
        <Avatar className="h-[72px] w-[72px] ring-1 ring-[#30363d] shrink-0">
          {profile.avatar_url && (
            <AvatarImage
              src={profile.avatar_url}
              alt={profile.display_name ?? profile.email}
            />
          )}
          <AvatarFallback className="bg-[#161b22] text-[#e6edf3] font-mono text-xl">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-base font-semibold text-[#e6edf3] truncate">
              {profile.display_name ?? profile.email.split("@")[0]}
            </p>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditOpen(true)}
              className="shrink-0 min-h-[44px] min-w-[44px] text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#161b22]"
              aria-label="Edit profile"
            >
              ✏
            </Button>
          </div>

          {locationLine && (
            <p className="text-sm text-[#8b949e] truncate">{locationLine}</p>
          )}

          {profile.bio && (
            <p className="text-sm text-[#8b949e] italic line-clamp-1 mt-0.5">
              {profile.bio}
            </p>
          )}

          {trainingSince && (
            <p className="font-mono text-xs text-[#8b949e] mt-0.5">
              {trainingSince}
            </p>
          )}
        </div>
      </div>

      <EditIdentitySheet
        open={editOpen}
        onOpenChange={setEditOpen}
        profile={profile}
        accessToken={accessToken}
        onSaved={(updated) => {
          onProfileUpdate(updated);
          setEditOpen(false);
        }}
      />
    </>
  );
}
