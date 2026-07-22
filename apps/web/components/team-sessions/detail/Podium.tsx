"use client";

import { m, useReducedMotion } from "motion/react";
import { MotionProvider } from "@/components/shared/motion-provider";
import { AvatarMonogram } from "@/components/shared/avatar-monogram";
import { formatRankBadge, isTiedRank } from "@/lib/team-sessions/leaderboard";
import type { TeamSessionParticipant } from "@/lib/api";

const TIER_COLOR = {
  1: "var(--gold)",
  2: "var(--silver)",
  3: "var(--bronze)",
} as const;

const AVATAR_SIZE = {
  1: "size-14 text-base md:size-16 md:text-lg",
  2: "size-11 text-sm md:size-12 md:text-base",
  3: "size-11 text-sm md:size-12 md:text-base",
} as const;

const PLINTH_HEIGHT = {
  1: "h-16 md:h-20",
  2: "h-10 md:h-12",
  3: "h-10 md:h-12",
} as const;

function PodiumSlot({
  participant,
  place,
  isFinal,
  rankCounts,
}: {
  participant: TeamSessionParticipant;
  place: 1 | 2 | 3;
  isFinal: boolean;
  rankCounts: Map<number, number>;
}) {
  const prefersReducedMotion = useReducedMotion();
  const tierColor = TIER_COLOR[place];
  // Computed together (not via a cast) so the type checker, not a runtime
  // assumption, guarantees `rankBadge` is only non-null when `rank` is a number.
  const rankBadge =
    participant.rank != null && isTiedRank(participant.rank, rankCounts)
      ? formatRankBadge(participant.rank, true)
      : null;
  const name = participant.display_name || participant.guest_name || "Guest";
  const isGuest = participant.user_id == null;

  return (
    <div
      className="flex flex-col items-center gap-1.5"
      style={{ width: place === 1 ? "6.5rem" : "5rem" }}
    >
      <div className="relative">
        <m.span
          className="inline-flex rounded-full"
          initial={false}
          animate={{
            scale: isFinal ? 1 : 0.96,
            opacity: isFinal ? 1 : 0.75,
          }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 300, damping: 22 }
          }
          style={{
            padding: 3,
            background: isFinal ? tierColor : "transparent",
            border: isFinal ? "none" : `2px dashed ${tierColor}`,
          }}
        >
          {/* Fixed-color gap between the tier ring and the avatar's own
              identity-color fill (design critique 2026-07-22): without this,
              an identity hue from the warm end of the 8-hue palette can
              visually blend into a gold/bronze ring at their shared edge. */}
          <span
            className="inline-flex rounded-full p-[2px]"
            style={{ background: "var(--bg)" }}
          >
            <AvatarMonogram
              name={name}
              seed={
                participant.user_id ?? participant.guest_name ?? participant.id
              }
              isGuest={isGuest}
              className={AVATAR_SIZE[place]}
            />
          </span>
        </m.span>
        <span
          className="absolute -bottom-1 left-1/2 flex size-5 -translate-x-1/2 items-center justify-center rounded-full font-mono text-[10px] font-bold tabular-nums"
          style={{
            background: tierColor,
            color: "var(--bg)",
            boxShadow: "0 0 0 2px var(--bg)",
          }}
        >
          {place}
        </span>
      </div>
      <p
        className="max-w-full truncate font-sans text-[12px] font-medium"
        style={{ color: "var(--text)" }}
      >
        {name}
      </p>
      {participant.score && (
        <p
          className="font-mono text-[12px] font-semibold tabular-nums"
          style={{ color: "var(--muted)" }}
        >
          {participant.score}
        </p>
      )}
      {rankBadge && (
        <span
          className="font-mono text-[10px] tabular-nums"
          style={{ color: "var(--muted)" }}
        >
          {rankBadge}
        </span>
      )}
      {!isFinal && (
        <span
          className="font-sans text-[9px] font-medium uppercase tracking-wide"
          style={{ color: "var(--muted)" }}
        >
          provisional
        </span>
      )}
      {/* Plinth — a filled, tier-tinted block (no border/outline: an empty
          dashed rectangle read as a broken/placeholder element in review,
          not as a pedestal). Height still encodes rank (1st tallest). */}
      <div
        className={`w-full rounded-t-[6px] ${PLINTH_HEIGHT[place]}`}
        style={{
          background: isFinal
            ? `color-mix(in srgb, ${tierColor} 22%, var(--surface))`
            : `color-mix(in srgb, ${tierColor} 10%, var(--surface))`,
          borderTop: `2px solid ${tierColor}`,
          opacity: isFinal ? 1 : 0.7,
        }}
        aria-hidden="true"
      />
    </div>
  );
}

/**
 * Podium (06 §3.3) — top-3 by computed rank. 1st centered + tallest plinth,
 * 2nd-left/3rd-right at equal smaller size, per the design spec's exact
 * layout. Suppressed entirely by the caller when relay (no per-person rank)
 * or when nobody has logged yet (empty-state placeholder instead).
 */
export function Podium({
  podium,
  rankCounts,
  isFinal,
}: {
  podium: TeamSessionParticipant[];
  rankCounts: Map<number, number>;
  isFinal: boolean;
}) {
  if (podium.length === 0) return null;
  const [first, second, third] = podium;

  return (
    <MotionProvider>
      <div className="flex items-end justify-center gap-3 py-4 md:gap-6">
        {second && (
          <PodiumSlot
            participant={second}
            place={2}
            isFinal={isFinal}
            rankCounts={rankCounts}
          />
        )}
        {first && (
          <PodiumSlot
            participant={first}
            place={1}
            isFinal={isFinal}
            rankCounts={rankCounts}
          />
        )}
        {third && (
          <PodiumSlot
            participant={third}
            place={3}
            isFinal={isFinal}
            rankCounts={rankCounts}
          />
        )}
      </div>
    </MotionProvider>
  );
}

/**
 * §3 States — "0 logged" podium placeholder. Kept compact and text-only
 * (design critique 2026-07-22): a large empty circle here just duplicated
 * the roster the not-yet-logged group already lists directly below it.
 */
export function PodiumEmptyPlaceholder() {
  return (
    <p
      className="py-6 text-center font-sans text-[13px]"
      style={{ color: "var(--muted)" }}
    >
      No results yet — be the first to log.
    </p>
  );
}
