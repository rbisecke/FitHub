"use client";

import { Pencil } from "lucide-react";
import type { UserProfile } from "@/lib/api";
import { AvatarMonogram } from "@/components/shared/avatar-monogram";
import { Button } from "@/components/ui/button";
import { GOAL_LABELS } from "./goal-grid";

/** "YYYY-MM-DD" -> "Mon YYYY", from local date parts (never `new Date(iso)`). */
function trainingSinceLabel(dateStr: string): string {
  const [y, m] = dateStr.split("-").map(Number) as [number, number];
  const date = new Date(y, m - 1, 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/**
 * Identity header (08 §3): avatar, display_name, email (overlaid client-side
 * from the Supabase session — the profile table always returns ""), and the
 * descriptive fields. No avatar-upload flow exists — the monogram is the
 * permanent avatar, not a stand-in for a future uploader.
 */
export function IdentityHeader({
  profile,
  email,
  userId,
  onEdit,
}: {
  profile: UserProfile;
  email: string | null;
  userId: string;
  onEdit: () => void;
}) {
  const displayLabel = profile.display_name || email || "Member";

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-4">
        <AvatarMonogram
          name={displayLabel}
          seed={userId}
          size="lg"
          className="size-14 text-base"
        />
        <div className="flex flex-col gap-1">
          <h1 className="type-h2">{displayLabel}</h1>
          {email && <p className="type-small text-muted-foreground">{email}</p>}
          {profile.bio && <p className="type-small mt-1">{profile.bio}</p>}
          <div className="type-caption mt-1 flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
            {profile.location && <span>{profile.location}</span>}
            {profile.box_affiliation && <span>{profile.box_affiliation}</span>}
            {profile.training_since && (
              <span>
                Training since {trainingSinceLabel(profile.training_since)}
              </span>
            )}
            {profile.primary_goal && (
              <span>{GOAL_LABELS[profile.primary_goal]}</span>
            )}
          </div>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onEdit}
        className="shrink-0"
      >
        <Pencil className="size-3.5" aria-hidden />
        Edit
      </Button>
    </div>
  );
}
