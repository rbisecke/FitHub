"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import type { Notification, StreakState } from "@/lib/api";
import { fireMilestoneToast } from "@/lib/gamification/milestone-toast";
import { FreezeReveal } from "@/components/gamification/FreezeReveal";

/**
 * Mounts the two gamification moments that don't belong to the everyday
 * streak-display/contribution-graph surfaces (07 §F, §H milestone half):
 * the streak-freeze reveal and the milestone toast. Both are driven off real,
 * unread notifications rather than any `localStorage` "have I seen this"
 * flag — see the "have I shown this reveal" note below for why.
 *
 * Mount once near the top of the dashboard/Today screen.
 */

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function num(v: unknown): number | undefined {
  return typeof v === "number" ? v : undefined;
}

interface GamificationMountProps {
  accessToken: string;
}

export function GamificationMount({ accessToken }: GamificationMountProps) {
  const [streak, setStreak] = useState<StreakState | null>(null);
  const [freezeNotif, setFreezeNotif] = useState<Notification | null>(null);
  const milestoneFired = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function load() {
      try {
        const [streakState, unread] = await Promise.all([
          api.profile.getStreak(accessToken, { signal: controller.signal }),
          api.notifications.list(accessToken, false, {
            signal: controller.signal,
          }),
        ]);
        if (cancelled) return;
        setStreak(streakState);

        // "Have I shown this reveal" guard: rather than a `localStorage`
        // flag (the exact cross-device-mismatch pattern this domain's spec
        // calls out as a bug elsewhere), the guard is the notification's own
        // `read_at`. Each real freeze-consumption event gets its own durable
        // `freeze_consumed` row (the backend's ledger unique-constrains one
        // per week, so a repeat visit never creates a duplicate). As long as
        // that row is unread, the event hasn't been acknowledged *anywhere*
        // — including a different device — so the reveal is shown; marking
        // it read (below, on "Got it") retires it everywhere. This is
        // deliberately not a new "mark as seen" endpoint: reusing the
        // existing mark-read call is the minimal, already-durable mechanism.
        if (streakState.freeze_consumed_this_week) {
          const notif = unread.find((n) => n.type === "freeze_consumed");
          if (notif) setFreezeNotif(notif);
        }

        if (!milestoneFired.current) {
          const milestoneNotif = unread.find(
            (n) => n.type === "streak_milestone",
          );
          if (milestoneNotif) {
            milestoneFired.current = true;
            const payload = milestoneNotif.payload;
            const message =
              str(payload.message) ??
              `${num(payload.milestone) ?? "?"}-week streak reached`;
            fireMilestoneToast(message);
            try {
              await api.notifications.markRead(accessToken, milestoneNotif.id);
            } catch {
              // Non-critical: worst case the toast can fire again on a
              // later visit if the mark-read call failed. Nothing further
              // for the user to retry here.
            }
          }
        }
      } catch (err) {
        if (!cancelled && (err as Error).name !== "AbortError") {
          // Gamification moments are non-critical decoration on top of the
          // dashboard — fail silently rather than surfacing an error banner
          // for a missed streak reveal/toast.
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [accessToken]);

  async function dismissReveal() {
    if (!freezeNotif) return;
    const notif = freezeNotif;
    setFreezeNotif(null);
    try {
      await api.notifications.markRead(accessToken, notif.id);
    } catch {
      // Best-effort: if this fails the reveal may show again on the user's
      // next visit, which is the safe direction to fail in (re-showing a
      // real event beats silently losing the durable "seen" mark).
    }
  }

  if (!freezeNotif || !streak) return null;

  const payload = freezeNotif.payload;
  return (
    <FreezeReveal
      currentStreak={streak.current_streak}
      freezesRemaining={
        num(payload.freezes_remaining) ?? streak.freezes_remaining
      }
      coveredWeekKey={str(payload.week_key)}
      onDismiss={() => void dismissReveal()}
    />
  );
}
