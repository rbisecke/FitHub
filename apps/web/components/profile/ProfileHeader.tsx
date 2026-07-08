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
        <Avatar className="h-[72px] w-[72px] ring-1 ring-[var(--border)] shrink-0">
          {profile.avatar_url && (
            <AvatarImage
              src={profile.avatar_url}
              alt={profile.display_name ?? profile.email}
            />
          )}
          <AvatarFallback className="bg-[var(--surface)] text-[var(--text)] font-mono text-xl">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-base font-semibold text-[var(--text)] truncate">
              {profile.display_name ?? profile.email.split("@")[0]}
            </h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditOpen(true)}
              className="shrink-0 min-h-[44px] min-w-[44px] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]"
              aria-label="Edit profile"
            >
              ✏
            </Button>
          </div>

          {locationLine && (
            <p className="text-sm text-[var(--muted)] truncate">
              {locationLine}
            </p>
          )}

          {profile.bio && (
            <p className="text-sm text-[var(--muted)] italic line-clamp-1 mt-0.5">
              {profile.bio}
            </p>
          )}

          {trainingSince && (
            <p className="font-mono text-xs text-[var(--muted)] mt-0.5">
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
