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
    {
      label: "Commits",
      value: stats.total_workouts,
      color: "var(--foreground)",
      prefix: "",
    },
    {
      label: "Streak",
      value: stats.best_streak_weeks,
      color: "var(--hot)",
      prefix: "🔥",
    },
    { label: "PRs", value: stats.total_prs, color: "var(--gold)", prefix: "" },
    {
      label: "Tracked",
      value: stats.movements_tracked,
      color: "var(--foreground)",
      prefix: "",
    },
  ];

  return (
    <>
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 mb-4 animate-fadeUp">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-[18px]">
            {/* Avatar — rounded square, blue background */}
            <div
              className="flex items-center justify-center shrink-0"
              style={{
                width: 72,
                height: 72,
                borderRadius: 16,
                background: "var(--blue)",
              }}
            >
              <span className="font-heading text-[26px] text-white leading-none">
                {initials}
              </span>
            </div>
            {/* Identity */}
            <div>
              <div
                className="font-heading text-[24px]"
                style={{ letterSpacing: "-0.5px" }}
              >
                {displayName}
              </div>
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
            className="shrink-0 bg-[var(--surface-2)] border border-[var(--border)] text-[var(--foreground)] text-[12.5px] font-semibold px-3 py-1.5 rounded-[9px] hover:border-[var(--muted-foreground)] transition-colors min-h-[44px]"
          >
            Edit profile
          </button>
        </div>

        {/* 4-up mini stats — individual bordered cells */}
        <div className="grid grid-cols-4 gap-[10px] mt-5">
          {miniStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-[12px] border border-[var(--border)] p-[13px_14px]"
              style={{ background: "var(--surface-2)" }}
            >
              <div
                className="font-heading text-[22px] leading-none"
                style={{ color: stat.color }}
              >
                {stat.prefix}
                {stat.value}
              </div>
              <div className="text-[10.5px] text-[var(--muted-foreground)] uppercase tracking-[0.5px] mt-1">
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
