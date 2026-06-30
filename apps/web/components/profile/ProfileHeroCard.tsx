"use client";

import { useState } from "react";
import type { UserProfile, ProfileStats } from "@/lib/api";
import { EditIdentitySheet } from "./EditIdentitySheet";

interface Props {
  profile: UserProfile;
  stats: ProfileStats;
  accessToken: string;
  onProfileUpdate: (updated: UserProfile) => void;
}

export function ProfileHeroCard({
  profile,
  stats,
  accessToken,
  onProfileUpdate,
}: Props) {
  const [editOpen, setEditOpen] = useState(false);

  const emailUser = profile.email.split("@")[0] ?? profile.email;
  const displayName = profile.display_name ?? emailUser;
  const initials = displayName.slice(0, 2).toUpperCase();

  const miniStats = [
    { label: "Commits", value: stats.total_workouts },
    { label: "Streak", value: stats.best_streak_weeks },
    { label: "PRs", value: stats.total_prs },
    { label: "Tracked", value: stats.movements_tracked },
  ];

  return (
    <>
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 mb-4 animate-fadeUp">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-[18px]">
            {/* Avatar */}
            <div className="w-[72px] h-[72px] rounded-full bg-[var(--accent)] flex items-center justify-center shrink-0">
              <span className="font-heading text-[26px] text-[#0A0D12] leading-none">
                {initials}
              </span>
            </div>
            {/* Identity */}
            <div>
              <div className="text-[18px] font-bold text-[var(--foreground)]">
                {displayName}
              </div>
              {profile.email && (
                <div className="text-[14px] text-[var(--muted-foreground)] mt-0.5 truncate max-w-[180px]">
                  {profile.email}
                </div>
              )}
              {/* Branch badge */}
              <span className="mt-2 inline-flex items-center font-data text-[12px] font-semibold text-[var(--accent)] bg-[rgba(74,222,128,0.12)] border border-[rgba(74,222,128,0.3)] px-[11px] py-1 rounded-full gap-1.5">
                <span className="text-[8px]">●</span>
                main
              </span>
            </div>
          </div>
          {/* Edit button */}
          <button
            onClick={() => setEditOpen(true)}
            className="shrink-0 bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] text-[13px] font-semibold px-3 py-1.5 rounded-[9px] hover:border-[var(--muted-foreground)] transition-colors min-h-[44px]"
          >
            Edit profile
          </button>
        </div>

        {/* 4-up mini stats */}
        <div className="grid grid-cols-4 border-t border-[var(--border)] mt-[18px] pt-[18px]">
          {miniStats.map((stat, i) => (
            <div
              key={stat.label}
              className={`text-center ${
                i > 0 ? "border-l border-[var(--border)]" : ""
              }`}
            >
              <div className="font-heading text-[22px] text-[var(--foreground)]">
                {stat.value}
              </div>
              <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
                {stat.label}
              </div>
            </div>
          ))}
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
